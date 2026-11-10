using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;

namespace ResumeBuilder.Api.Services;

public sealed class GeminiClient(HttpClient http, IOptions<AiOptions> options)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<T> GenerateAsync<T>(string instruction, string userData, byte[]? pdf, CancellationToken ct)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.ApiKey))
            throw new ApiException(503, "Configure GEMINI_API_KEY in the server .env file to use real AI and PDF import.");
        var parts = new List<object> { new { text = userData } };
        if (pdf is not null) parts.Add(new { inlineData = new { mimeType = "application/pdf", data = Convert.ToBase64String(pdf) } });
        var body = new
        {
            systemInstruction = new { parts = new[] { new { text = instruction } } },
            contents = new[] { new { role = "user", parts } },
            generationConfig = new { temperature = 0.2, maxOutputTokens = 12000,
                responseMimeType = "application/json", responseJsonSchema = SchemaFor(typeof(T)) }
        };
        using var request = new HttpRequestMessage(HttpMethod.Post,
            $"v1beta/models/{Uri.EscapeDataString(settings.Model)}:generateContent");
        request.Headers.Add("x-goog-api-key", settings.ApiKey);
        request.Content = new StringContent(JsonSerializer.Serialize(body, JsonOptions), Encoding.UTF8, "application/json");
        try
        {
            using var response = await http.SendAsync(request, ct);
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
                throw new ApiException(429, "Gemini quota or rate limit reached. Wait and try again, or check your AI Studio quota.");
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                throw new ApiException(502, "Gemini rejected the API key or project permissions. Check the server configuration.");
            if (response.StatusCode == HttpStatusCode.NotFound)
                throw new ApiException(502, "The configured Gemini model is unavailable for this project. Update GEMINI_MODEL in .env to a supported model and recreate the backend.");
            if (!response.IsSuccessStatusCode)
                throw new ApiException(502, "Gemini could not complete the request. Check model availability and try again.");
            using var envelope = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            if (!envelope.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                throw new ApiException(502, "Gemini returned no result. Try a clearer resume or request.");
            var candidate = candidates[0];
            if (candidate.TryGetProperty("finishReason", out var reason) && reason.GetString() != "STOP")
                throw new ApiException(502, "Gemini returned an incomplete result. Shorten the input and try again.");
            var result = string.Concat(candidate.GetProperty("content").GetProperty("parts").EnumerateArray()
                .Where(x => x.TryGetProperty("text", out _) && !(x.TryGetProperty("thought", out var thought) && thought.GetBoolean()))
                .Select(x => x.GetProperty("text").GetString()));
            return JsonSerializer.Deserialize<T>(result, JsonOptions)
                ?? throw new ApiException(502, "Gemini returned an empty result.");
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        { throw new ApiException(504, "Gemini took too long. Try again shortly."); }
        catch (HttpRequestException)
        { throw new ApiException(502, "Could not connect to Gemini. Check the network and try again."); }
        catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException)
        { throw new ApiException(502, "Gemini returned an invalid response. Please try again."); }
    }

    // Small, explicit JSON schema: no reflection-based object mapping libraries needed.
    private static JsonObject SchemaFor(Type type)
    {
        if (type == typeof(string)) return new() { ["type"] = "string" };
        if (type == typeof(bool)) return new() { ["type"] = "boolean" };
        if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(List<>))
            return new() { ["type"] = "array", ["items"] = SchemaFor(type.GetGenericArguments()[0]) };
        var properties = new JsonObject();
        var required = new JsonArray();
        foreach (var property in type.GetProperties())
        {
            var name = JsonNamingPolicy.CamelCase.ConvertName(property.Name);
            properties[name] = SchemaFor(property.PropertyType);
            required.Add(name);
        }
        return new() { ["type"] = "object", ["properties"] = properties,
            ["required"] = required, ["additionalProperties"] = false };
    }
}
