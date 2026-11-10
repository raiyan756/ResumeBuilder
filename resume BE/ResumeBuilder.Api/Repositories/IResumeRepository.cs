using ResumeBuilder.Api.Data;

namespace ResumeBuilder.Api.Repositories;

public interface IResumeRepository
{
    Task<List<ResumeEntity>> ListAsync(CancellationToken ct);
    Task<ResumeEntity?> GetAsync(Guid id, CancellationToken ct);
    Task AddAsync(ResumeEntity entity, CancellationToken ct);
    Task SaveAsync(CancellationToken ct);
    Task DeleteAsync(ResumeEntity entity, CancellationToken ct);
}
