using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ResumeBuilder.Api.Contracts;
using ResumeBuilder.Api.Services;

namespace ResumeBuilder.Api.Controllers;

[ApiController]
[Route("api/ai")]
[EnableRateLimiting("ai")]
public sealed class AiController(IResumeAiService service) : ControllerBase
{
    [HttpPost("improve")]
    public Task<AiSuggestion> Improve(ImproveRequest request, CancellationToken ct) => service.ImproveAsync(request, ct);
}
