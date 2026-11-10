namespace ResumeBuilder.Api.Services;

public static class PromptTemplates
{
    public static string ResumeSpecialist { get; } = Read("ResumeSpecialist.txt");
    public static string PdfExtraction { get; } = Read("PdfExtraction.txt");

    private static string Read(string name)
    {
        using var stream = typeof(PromptTemplates).Assembly.GetManifestResourceStream($"ResumeBuilder.Api.Prompts.{name}")
            ?? throw new InvalidOperationException($"Missing embedded prompt: {name}");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
