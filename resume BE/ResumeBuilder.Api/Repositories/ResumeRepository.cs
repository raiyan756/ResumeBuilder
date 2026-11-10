using Microsoft.EntityFrameworkCore;
using ResumeBuilder.Api.Data;

namespace ResumeBuilder.Api.Repositories;

public sealed class ResumeRepository(ResumeDbContext db) : IResumeRepository
{
    public Task<List<ResumeEntity>> ListAsync(CancellationToken ct) =>
        db.Resumes.AsNoTracking().OrderByDescending(x => x.UpdatedAt).Take(100).ToListAsync(ct);
    public Task<ResumeEntity?> GetAsync(Guid id, CancellationToken ct) =>
        db.Resumes.SingleOrDefaultAsync(x => x.Id == id, ct);
    public async Task AddAsync(ResumeEntity entity, CancellationToken ct)
    {
        db.Resumes.Add(entity);
        await db.SaveChangesAsync(ct);
    }
    public async Task SaveAsync(CancellationToken ct) => await db.SaveChangesAsync(ct);
    public async Task DeleteAsync(ResumeEntity entity, CancellationToken ct)
    {
        db.Resumes.Remove(entity);
        await db.SaveChangesAsync(ct);
    }
}
