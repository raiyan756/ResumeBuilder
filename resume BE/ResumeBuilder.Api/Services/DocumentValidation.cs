using System.Collections;
using System.ComponentModel.DataAnnotations;
using ResumeBuilder.Api.Models;

namespace ResumeBuilder.Api.Services;

public static class DocumentValidation
{
    public static void Validate(ResumeDocument document)
    {
        ValidateObject(document);
        if (document.Skills.Any(x => string.IsNullOrWhiteSpace(x) || x.Length > 150))
            throw new ApiException(400, "Each skill must contain 1-150 characters.");
        if (document.Achievements.Any(x => string.IsNullOrWhiteSpace(x) || x.Length > 2000))
            throw new ApiException(400, "Each achievement must contain 1-2000 characters.");
        if (!string.IsNullOrWhiteSpace(document.Contact.Email) && !new EmailAddressAttribute().IsValid(document.Contact.Email))
            throw new ApiException(400, "Enter a valid email address or leave it blank.");
    }

    private static void ValidateObject(object? value)
    {
        if (value is null) throw new ApiException(400, "Resume sections and list entries cannot be null.");
        var results = new List<ValidationResult>();
        if (!Validator.TryValidateObject(value, new ValidationContext(value), results, true))
            throw new ApiException(400, results[0].ErrorMessage ?? "Invalid resume data.");
        foreach (var property in value.GetType().GetProperties())
        {
            var child = property.GetValue(value);
            if (child is string || property.PropertyType.IsValueType) continue;
            if (child is IEnumerable list)
                foreach (var item in list) { if (item is not string) ValidateObject(item); }
            else ValidateObject(child);
        }
    }
}
