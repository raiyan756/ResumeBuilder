namespace ResumeBuilder.Api.Data;

public sealed class ResumeEntity
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string TargetRole { get; set; } = "";
    public string DocumentJson { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
