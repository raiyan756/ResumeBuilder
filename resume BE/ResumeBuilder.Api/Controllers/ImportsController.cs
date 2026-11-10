using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ResumeBuilder.Api.Contracts;
using ResumeBuilder.Api.Services;

namespace ResumeBuilder.Api.Controllers;

[ApiController]
[Route("api/imports")]
[EnableRateLimiting("ai")]
public sealed class ImportsController(IResumeAiService service) : ControllerBase
{
    [HttpPost("pdf")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 6 * 1024 * 1024)]
    public async Task<ImportResponse> Pdf(IFormFile file, CancellationToken ct)
    {
        if (file.Length is <= 0 or > 5 * 1024 * 1024 || !Path.GetExtension(file.FileName).Equals(".pdf", StringComparison.OrdinalIgnoreCase))
            throw new ApiException(400, "Choose a PDF file up to 5 MiB.");
        using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer, ct);
        return await service.ImportPdfAsync(buffer.ToArray(), ct);
    }
}
