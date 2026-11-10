using Microsoft.AspNetCore.Mvc;
using ResumeBuilder.Api.Contracts;
using ResumeBuilder.Api.Services;

namespace ResumeBuilder.Api.Controllers;

[ApiController]
[Route("api/resumes")]
public sealed class ResumesController(IResumeService service) : ControllerBase
{
    [HttpGet] public Task<List<ResumeSummary>> List(CancellationToken ct) => service.ListAsync(ct);
    [HttpGet("{id:guid}")] public Task<ResumeResponse> Get(Guid id, CancellationToken ct) => service.GetAsync(id, ct);
    [HttpPost] public async Task<ActionResult<ResumeResponse>> Create(SaveResumeRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }
    [HttpPut("{id:guid}")] public Task<ResumeResponse> Update(Guid id, SaveResumeRequest request, CancellationToken ct) => service.UpdateAsync(id, request, ct);
    [HttpDelete("{id:guid}")] public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    { await service.DeleteAsync(id, ct); return NoContent(); }
}
