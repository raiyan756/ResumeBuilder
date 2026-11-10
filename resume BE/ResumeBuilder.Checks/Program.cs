using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using ResumeBuilder.Api.Contracts;
using ResumeBuilder.Api.Data;
using ResumeBuilder.Api.Models;
using ResumeBuilder.Api.Repositories;
using ResumeBuilder.Api.Services;

// Dependency-free regression runner. Fake provider responses never call Google.
var count = 0;
void Check(bool condition, string name)
{
    if (!condition) throw new Exception("FAIL: " + name);
    count++;
    Console.WriteLine("PASS: " + name);
}
async Task Error(int expected, Func<Task> operation, string name)
{
    try { await operation(); }
    catch (ApiException ex) { Check(ex.StatusCode == expected, name); return; }
    throw new Exception("FAIL: " + name + " did not reject the request");
}
static string Envelope(object value, string finishReason = "STOP") => JsonSerializer.Serialize(new
{
    candidates = new[] { new { finishReason, content = new { parts = new[] { new { text = JsonSerializer.Serialize(value, new JsonSerializerOptions(JsonSerializerDefaults.Web)) } } } } }
});
static GeminiClient Client(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler, string key = "test-only-not-real") =>
    new(new HttpClient(new StubHandler(handler)) { BaseAddress = new Uri("https://generativelanguage.googleapis.com/"), Timeout = TimeSpan.FromMilliseconds(100) }, Options.Create(new AiOptions { ApiKey = key }));
static HttpResponseMessage JsonResponse(string body) => new(HttpStatusCode.OK) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

var repo = new MemoryRepository();
var service = new ResumeService(repo);
var doc = new ResumeDocument();
doc.Contact.FullName = "Test Candidate";
doc.Contact.Email = "private@example.com";
doc.Skills = ["Jira", "Planning"];
doc.Experience = [new() { JobTitle = "Coordinator", Description = "Maintained release plans." }];
var request = new SaveResumeRequest { Title = " Test draft ", TargetRole = "Project Manager", Document = doc };
var created = await service.CreateAsync(request, default);
Check(created.Id != Guid.Empty && created.Title == "Test draft", "Create trims title and generates ID");
Check((await service.GetAsync(created.Id, default)).Document.Skills.SequenceEqual(doc.Skills), "Document round trip preserves arrays");
request.Document.Projects.Add(new() { Name = "Sample", Description = "A project" });
var updated = await service.UpdateAsync(created.Id, request, default);
Check(updated.CreatedAt == created.CreatedAt && updated.UpdatedAt >= created.UpdatedAt && updated.Document.Projects.Count == 1, "Update preserves creation time and nested content");
Check((await service.ListAsync(default)).Single().FullName == "Test Candidate", "List maps saved name");
await service.DeleteAsync(created.Id, default);
await Error(404, () => service.GetAsync(created.Id, default), "Deleted resume returns 404");
await Error(400, () => service.CreateAsync(new() { Title = "   " }, default), "Whitespace-only title rejected");
await Error(400, () => service.CreateAsync(new() { Document = new() { Experience = [null!] } }, default), "Null nested entry rejected");
await Error(400, () => service.CreateAsync(new() { Document = new() { Skills = [new string('a', 151)] } }, default), "Oversized skill rejected");
await Error(400, () => service.CreateAsync(new() { Document = new() { Contact = new() { Email = "invalid-email" } } }, default), "Malformed email rejected");
var blank = await service.CreateAsync(new(), default);
Check(blank.Document.Summary == "", "Empty draft summary can be saved");

var neverCall = Client((_, _) => throw new Exception("Demo must not call Google"));
var demo = new ResumeAiService(neverCall, Options.Create(new AiOptions()));
foreach (var action in new[] { "summary", "experience", "review", "skills" })
{
    var suggestion = await demo.ImproveAsync(new() { Action = action, Document = doc, TargetRole = "Scrum Master", ExperienceIndex = 0 }, default);
    Check(suggestion.IsSimulated && suggestion.Provider.Contains("Demo"), action + " is explicitly simulated without a key");
}
await Error(400, () => demo.ImproveAsync(new() { Action = "experience", ExperienceIndex = 3 }, default), "Invalid experience index rejected");
await Error(400, () => demo.ImportPdfAsync("not pdf"u8.ToArray(), default), "Fake PDF signature rejected");
await Error(400, () => demo.ImportPdfAsync(new byte[5 * 1024 * 1024 + 1], default), "Oversized PDF rejected");
await Error(503, () => demo.ImportPdfAsync("%PDF-1.7 sample"u8.ToArray(), default), "Demo never invents imported CV data");

var recordedBody = "";
var validClient = Client(async (req, ct) =>
{
    Check(req.Headers.Contains("x-goog-api-key") && !req.RequestUri!.Query.Contains("key"), "API key is in a header, not URL");
    recordedBody = await req.Content!.ReadAsStringAsync(ct);
    return JsonResponse(Envelope(new AiSuggestion { SuggestedText = "An improved factual summary." }));
});
var realService = new ResumeAiService(validClient, Options.Create(new AiOptions { Mode = "Gemini", ApiKey = "test-only" }));
var realResult = await realService.ImproveAsync(new() { Action = "summary", Document = doc }, default);
Check(!realResult.IsSimulated && realResult.SuggestedText.Contains("factual"), "Structured provider result parsed");
Check(!recordedBody.Contains("private@example.com") && !recordedBody.Contains("Test Candidate"), "Improvement request excludes personal contact data");
Check(recordedBody.Contains("responseJsonSchema") && recordedBody.Contains("systemInstruction"), "Provider request includes schema and system instruction");

var importClient = Client(async (req, ct) =>
{
    var body = await req.Content!.ReadAsStringAsync(ct);
    Check(body.Contains("application/pdf") && body.Contains("inlineData"), "PDF sent as inline PDF data");
    return JsonResponse(Envelope(doc));
});
var importService = new ResumeAiService(importClient, Options.Create(new AiOptions { ApiKey = "test-only" }));
var imported = await importService.ImportPdfAsync("%PDF-1.7 sample"u8.ToArray(), default);
Check(imported.Document.Contact.FullName == "Test Candidate" && !imported.IsSimulated, "Imported structured document returned for review");

foreach (var pair in new[] { (HttpStatusCode.TooManyRequests, 429), (HttpStatusCode.Forbidden, 502), (HttpStatusCode.InternalServerError, 502) })
    await Error(pair.Item2, () => Client((_, _) => Task.FromResult(new HttpResponseMessage(pair.Item1))).GenerateAsync<AiSuggestion>("", "", null, default), "Provider status " + (int)pair.Item1 + " handled");
await Error(502, () => Client((_, _) => Task.FromResult(JsonResponse("{}"))).GenerateAsync<AiSuggestion>("", "", null, default), "Empty provider envelope rejected");
await Error(502, () => Client((_, _) => Task.FromResult(JsonResponse("{broken"))).GenerateAsync<AiSuggestion>("", "", null, default), "Malformed provider JSON rejected");
await Error(502, () => Client((_, _) => Task.FromResult(JsonResponse(Envelope(new AiSuggestion(), "MAX_TOKENS")))).GenerateAsync<AiSuggestion>("", "", null, default), "Truncated provider response rejected");
await Error(504, () => Client(async (_, ct) => { await Task.Delay(10000, ct); return JsonResponse("{}"); }).GenerateAsync<AiSuggestion>("", "", null, default), "Provider timeout handled");
await Error(503, () => Client((_, _) => throw new Exception("No request allowed"), "").GenerateAsync<AiSuggestion>("", "", null, default), "Missing real API key rejected before network call");
Console.WriteLine($"All {count} regression checks passed.");

sealed class StubHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => send(request, cancellationToken);
}
sealed class MemoryRepository : IResumeRepository
{
    private readonly Dictionary<Guid, ResumeEntity> data = [];
    public Task<List<ResumeEntity>> ListAsync(CancellationToken ct) => Task.FromResult(data.Values.ToList());
    public Task<ResumeEntity?> GetAsync(Guid id, CancellationToken ct) => Task.FromResult(data.GetValueOrDefault(id));
    public Task AddAsync(ResumeEntity entity, CancellationToken ct) { data.Add(entity.Id, entity); return Task.CompletedTask; }
    public Task SaveAsync(CancellationToken ct) => Task.CompletedTask;
    public Task DeleteAsync(ResumeEntity entity, CancellationToken ct) { data.Remove(entity.Id); return Task.CompletedTask; }
}
