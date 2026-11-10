using System.ComponentModel.DataAnnotations;
using ResumeBuilder.Api.Models;

namespace ResumeBuilder.Api.Contracts;

public sealed class SaveResumeRequest
{
    [Required, StringLength(150, MinimumLength = 1)] public string Title { get; set; } = "Untitled resume";
    [Required, StringLength(150, MinimumLength = 1)] public string TargetRole { get; set; } = "Project Manager";
    [Required] public ResumeDocument Document { get; set; } = new();
}

public sealed class ImproveRequest
{
    [Required, RegularExpression("^(summary|experience|review|skills)$")]
    public string Action { get; set; } = "review";
    [Required, StringLength(150)] public string TargetRole { get; set; } = "Project Manager";
    [Required] public ResumeDocument Document { get; set; } = new();
    public int? ExperienceIndex { get; set; }
}

public sealed record ResumeResponse(Guid Id, string Title, string TargetRole,
    ResumeDocument Document, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record ResumeSummary(Guid Id, string Title, string TargetRole, string FullName, DateTimeOffset UpdatedAt);
public sealed class AiSuggestion
{
    public string Provider { get; set; } = "Gemini";
    public bool IsSimulated { get; set; }
    public string SuggestedText { get; set; } = "";
    public List<string> Suggestions { get; set; } = [];
    public List<string> MissingInformation { get; set; } = [];
    public List<string> RecommendedSkills { get; set; } = [];
}
public sealed record ImportResponse(string Provider, bool IsSimulated, ResumeDocument Document, string Notice);
