using System.Text.Json;
using Microsoft.Extensions.Options;
using ResumeBuilder.Api.Contracts;
using ResumeBuilder.Api.Models;

namespace ResumeBuilder.Api.Services;

public interface IResumeAiService
{
    Task<AiSuggestion> ImproveAsync(ImproveRequest request, CancellationToken ct);
    Task<ImportResponse> ImportPdfAsync(byte[] pdf, CancellationToken ct);
}

public sealed class ResumeAiService(GeminiClient gemini, IOptions<AiOptions> options) : IResumeAiService
{
    public async Task<AiSuggestion> ImproveAsync(ImproveRequest request, CancellationToken ct)
    {
        DocumentValidation.Validate(request.Document);
        if (request.Action is not ("summary" or "experience" or "review" or "skills"))
            throw new ApiException(400, "Unknown AI action.");
        if (request.Action == "experience" && (request.ExperienceIndex is null || request.ExperienceIndex < 0 || request.ExperienceIndex >= request.Document.Experience.Count))
            throw new ApiException(400, "Select an existing experience entry to improve.");
        if (options.Value.UseDemo) return DemoSuggestions(request);
        // Contact details are unnecessary for improvement and are excluded from the provider request.
        var input = JsonSerializer.Serialize(new { request.Action, request.TargetRole, request.ExperienceIndex,
            request.Document.Summary, request.Document.Experience, request.Document.Education,
            request.Document.Certifications, request.Document.Skills, request.Document.Projects, request.Document.Achievements });
        var result = await gemini.GenerateAsync<AiSuggestion>(PromptTemplates.ResumeSpecialist, input, null, ct);
        if (result.SuggestedText is null || result.SuggestedText.Length > 6000 ||
            result.Suggestions is null || result.MissingInformation is null || result.RecommendedSkills is null ||
            result.Suggestions.Any(x => x is null) || result.MissingInformation.Any(x => x is null) ||
            result.RecommendedSkills.Any(x => string.IsNullOrWhiteSpace(x) || x.Length > 150))
            throw new ApiException(502, "Gemini returned unusable suggestions. Please try again.");
        result.Provider = "Gemini";
        result.IsSimulated = false;
        return result;
    }

    public async Task<ImportResponse> ImportPdfAsync(byte[] pdf, CancellationToken ct)
    {
        if (pdf.Length == 0 || pdf.Length > 5 * 1024 * 1024)
            throw new ApiException(400, "Choose a PDF up to 5 MiB.");
        if (!pdf.AsSpan().StartsWith("%PDF-"u8)) throw new ApiException(400, "The uploaded file is not a valid PDF.");
        if (options.Value.UseDemo)
            throw new ApiException(503, "PDF auto-fill needs real Gemini access. Configure GEMINI_API_KEY and use Auto or Gemini mode. You can enter details manually meanwhile.");
        var document = await gemini.GenerateAsync<ResumeDocument>(PromptTemplates.PdfExtraction,
            "Extract this resume for user review and correction.", pdf, ct);
        try { DocumentValidation.Validate(document); }
        catch (ApiException) { throw new ApiException(502, "The extracted resume needs a retry. Try a shorter, readable PDF or enter your details manually."); }
        return new("Gemini", false, document, "Review and correct the extracted information before saving. The PDF was processed by Google Gemini and is not stored by this app.");
    }

    private static AiSuggestion DemoSuggestions(ImproveRequest request)
    {
        var doc = request.Document;
        var result = new AiSuggestion { Provider = "Demo (simulated)", IsSimulated = true };
        if (string.IsNullOrWhiteSpace(doc.Summary)) result.MissingInformation.Add("Add a short summary connecting your experience to the target role.");
        if (doc.Experience.Count == 0) result.MissingInformation.Add("Add work, volunteer or internship experience.");
        if (doc.Skills.Count == 0) result.MissingInformation.Add("List relevant skills you can demonstrate in an interview.");
        if (doc.Experience.Any(x => string.IsNullOrWhiteSpace(x.Description))) result.MissingInformation.Add("Describe the responsibilities and outcomes for every experience entry.");
        if (request.Action == "summary")
        {
            var titles = doc.Experience.Select(x => x.JobTitle).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().Take(2).ToArray();
            result.SuggestedText = titles.Length > 0 ? $"Experience in {string.Join(" and ", titles)} roles." : "";
            if (doc.Skills.Count > 0) result.SuggestedText += $" Skills include {string.Join(", ", doc.Skills.Take(5))}.";
            result.SuggestedText = result.SuggestedText.Trim();
            if (result.SuggestedText.Length > 0) result.SuggestedText += $" Seeking a {request.TargetRole} opportunity.";
            result.Suggestions.Add("Add one verified outcome to make this summary more specific. Demo mode uses only your supplied titles and skills.");
        }
        else if (request.Action == "experience")
        {
            result.SuggestedText = doc.Experience[request.ExperienceIndex!.Value].Description.Trim();
            result.Suggestions.Add("Start each responsibility with a precise action verb and explain its result.");
            result.Suggestions.Add("Add a real team size, delivery outcome or time saving if you can verify it. Demo mode preserves your original description.");
        }
        else if (request.Action == "skills")
        {
            var role = request.TargetRole.ToLowerInvariant();
            var skills = role.Contains("scrum") ? new[] { "Scrum facilitation", "Sprint planning", "Retrospectives", "Impediment management" }
                : role.Contains("senior") ? new[] { "Program governance", "Portfolio planning", "Budget management", "Executive communication" }
                : role.Contains("coordinator") ? new[] { "Task tracking", "Meeting coordination", "Project documentation", "Status reporting" }
                : new[] { "Project planning", "Risk management", "Stakeholder communication", "Agile delivery" };
            result.RecommendedSkills = skills.Where(x => !doc.Skills.Contains(x, StringComparer.OrdinalIgnoreCase)).ToList();
            result.Suggestions.Add("Add a recommended skill only if it accurately reflects your experience.");
        }
        else
        {
            result.Suggestions.Add($"Prioritize the experience most relevant to {request.TargetRole}.");
            result.Suggestions.Add("Replace vague duties with actions and verified outcomes; never invent numbers.");
            result.Suggestions.Add("Check dates, spelling and contact details before exporting.");
        }
        return result;
    }
}
