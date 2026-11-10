using Microsoft.EntityFrameworkCore;

namespace ResumeBuilder.Api.Data;

public sealed class ResumeDbContext(DbContextOptions<ResumeDbContext> options) : DbContext(options)
{
    public DbSet<ResumeEntity> Resumes => Set<ResumeEntity>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var resume = modelBuilder.Entity<ResumeEntity>();
        resume.ToTable("resumes");
        resume.HasKey(x => x.Id);
        resume.Property(x => x.Title).HasMaxLength(150).IsRequired();
        resume.Property(x => x.TargetRole).HasMaxLength(150).IsRequired();
        resume.Property(x => x.DocumentJson).HasColumnType("jsonb").IsRequired();
        resume.HasIndex(x => x.UpdatedAt);
    }
}
