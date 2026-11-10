using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ResumeBuilder.Api.Data;
using ResumeBuilder.Api.Services;

namespace ResumeBuilder.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController(ResumeDbContext db, IOptions<AiOptions> options) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var connected = await db.Database.CanConnectAsync(ct);
        return StatusCode(connected ? 200 : 503, new { status = connected ? "ready" : "unavailable",
            database = connected ? "connected" : "unavailable", aiMode = options.Value.UseDemo ? "demo" : "gemini",
            pdfImportAvailable = !options.Value.UseDemo && !string.IsNullOrWhiteSpace(options.Value.ApiKey) });
    }
}
