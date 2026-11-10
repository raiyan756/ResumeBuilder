namespace ResumeBuilder.Api.Services;

public sealed class AiOptions
{
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "gemini-3.5-flash-lite";
    public string Mode { get; set; } = "Auto";
    public bool UseDemo => Mode.Equals("Demo", StringComparison.OrdinalIgnoreCase) ||
        (Mode.Equals("Auto", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(ApiKey));
}
