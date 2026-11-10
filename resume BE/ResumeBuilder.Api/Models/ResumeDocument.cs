using System.ComponentModel.DataAnnotations;

namespace ResumeBuilder.Api.Models;

public sealed class ResumeDocument
{
    [Required] public ContactInfo Contact { get; set; } = new();
    [Required(AllowEmptyStrings = true), StringLength(6000)] public string Summary { get; set; } = "";
    [Required, MaxLength(30)] public List<ExperienceItem> Experience { get; set; } = [];
    [Required, MaxLength(20)] public List<EducationItem> Education { get; set; } = [];
    [Required, MaxLength(30)] public List<CertificationItem> Certifications { get; set; } = [];
    [Required, MaxLength(80)] public List<string> Skills { get; set; } = [];
    [Required, MaxLength(30)] public List<ProjectItem> Projects { get; set; } = [];
    [Required, MaxLength(30)] public List<string> Achievements { get; set; } = [];
}

public sealed class ContactInfo
{
    [StringLength(150)] public string FullName { get; set; } = "";
    [StringLength(250)] public string Email { get; set; } = "";
    [StringLength(60)] public string Phone { get; set; } = "";
    [StringLength(200)] public string Location { get; set; } = "";
    [StringLength(500)] public string LinkedIn { get; set; } = "";
    [StringLength(500)] public string Website { get; set; } = "";
}

public sealed class ExperienceItem
{
    [StringLength(200)] public string JobTitle { get; set; } = "";
    [StringLength(200)] public string Company { get; set; } = "";
    [StringLength(200)] public string Location { get; set; } = "";
    [StringLength(40)] public string StartDate { get; set; } = "";
    [StringLength(40)] public string EndDate { get; set; } = "";
    public bool IsCurrent { get; set; }
    [StringLength(6000)] public string Description { get; set; } = "";
}

public sealed class EducationItem
{
    [StringLength(200)] public string Institution { get; set; } = "";
    [StringLength(200)] public string Degree { get; set; } = "";
    [StringLength(40)] public string StartDate { get; set; } = "";
    [StringLength(40)] public string EndDate { get; set; } = "";
}

public sealed class CertificationItem
{
    [StringLength(200)] public string Name { get; set; } = "";
    [StringLength(200)] public string Issuer { get; set; } = "";
    [StringLength(40)] public string Date { get; set; } = "";
}

public sealed class ProjectItem
{
    [StringLength(200)] public string Name { get; set; } = "";
    [StringLength(500)] public string Link { get; set; } = "";
    [StringLength(6000)] public string Description { get; set; } = "";
}
