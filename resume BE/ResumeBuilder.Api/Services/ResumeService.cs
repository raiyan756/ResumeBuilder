using System.Text.Json;
using ResumeBuilder.Api.Contracts;
using ResumeBuilder.Api.Data;
using ResumeBuilder.Api.Models;
using ResumeBuilder.Api.Repositories;

namespace ResumeBuilder.Api.Services;

public interface IResumeService
{
    Task<List<ResumeSummary>> ListAsync(CancellationToken ct);
    Task<ResumeResponse> GetAsync(Guid id, CancellationToken ct);
    Task<ResumeResponse> CreateAsync(SaveResumeRequest request, CancellationToken ct);
    Task<ResumeResponse> UpdateAsync(Guid id, SaveResumeRequest request, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
}

public sealed class ResumeService(IResumeRepository repository) : IResumeService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    public async Task<List<ResumeSummary>> ListAsync(CancellationToken ct) =>
        (await repository.ListAsync(ct)).Select(x => new ResumeSummary(x.Id, x.Title, x.TargetRole,
            ReadDocument(x).Contact.FullName, x.UpdatedAt)).ToList();
    public async Task<ResumeResponse> GetAsync(Guid id, CancellationToken ct) => Map(await FindAsync(id, ct));
    public async Task<ResumeResponse> CreateAsync(SaveResumeRequest request, CancellationToken ct)
    {
        DocumentValidation.Validate(request.Document);
        var entity = new ResumeEntity { Id = Guid.NewGuid(), CreatedAt = DateTimeOffset.UtcNow };
        Apply(entity, request);
        await repository.AddAsync(entity, ct);
        return Map(entity);
    }
    public async Task<ResumeResponse> UpdateAsync(Guid id, SaveResumeRequest request, CancellationToken ct)
    {
        DocumentValidation.Validate(request.Document);
        var entity = await FindAsync(id, ct);
        Apply(entity, request);
        await repository.SaveAsync(ct);
        return Map(entity);
    }
    public async Task DeleteAsync(Guid id, CancellationToken ct) =>
        await repository.DeleteAsync(await FindAsync(id, ct), ct);
    private async Task<ResumeEntity> FindAsync(Guid id, CancellationToken ct) =>
        await repository.GetAsync(id, ct) ?? throw new ApiException(404, "Resume not found.");
    private static void Apply(ResumeEntity entity, SaveResumeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.TargetRole))
            throw new ApiException(400, "Title and target role are required.");
        entity.Title = request.Title.Trim();
        entity.TargetRole = request.TargetRole.Trim();
        entity.DocumentJson = JsonSerializer.Serialize(request.Document, JsonOptions);
        entity.UpdatedAt = DateTimeOffset.UtcNow;
    }
    private static ResumeDocument ReadDocument(ResumeEntity entity) =>
        JsonSerializer.Deserialize<ResumeDocument>(entity.DocumentJson, JsonOptions)!;
    private static ResumeResponse Map(ResumeEntity entity) => new(entity.Id, entity.Title, entity.TargetRole,
        ReadDocument(entity), entity.CreatedAt, entity.UpdatedAt);
}
