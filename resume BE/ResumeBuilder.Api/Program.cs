using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResumeBuilder.Api.Data;
using ResumeBuilder.Api.Repositories;
using ResumeBuilder.Api.Services;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 6 * 1024 * 1024);
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<ResumeDbContext>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("ResumeDb")));
builder.Services.AddScoped<IResumeRepository, ResumeRepository>();
builder.Services.AddScoped<IResumeService, ResumeService>();
builder.Services.AddScoped<IResumeAiService, ResumeAiService>();
builder.Services.AddOptions<AiOptions>().Bind(builder.Configuration.GetSection("Gemini"))
    .Validate(o => new[] { "Auto", "Demo", "Gemini" }.Contains(o.Mode, StringComparer.OrdinalIgnoreCase), "Invalid AI mode.")
    .ValidateOnStart();
builder.Services.AddHttpClient<GeminiClient>(client =>
{
    client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
    client.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("ai", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "local", _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 12, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.OnRejected = async (context, ct) => await context.HttpContext.Response.WriteAsJsonAsync(
        new ProblemDetails { Status = 429, Title = "Too many AI requests", Detail = "Wait a minute before trying again." }, ct);
});
var app = builder.Build();
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var status = error is ApiException api ? api.StatusCode : error is BadHttpRequestException bad ? bad.StatusCode : 500;
    context.Response.StatusCode = status;
    await Results.Problem(statusCode: status, title: status == 500 ? "Unexpected server error" : "Request could not be completed",
        detail: error is ApiException known ? known.Message : status == 500 ? "Please try again shortly." : "Invalid request.")
        .ExecuteAsync(context);
}));
app.UseStatusCodePages();
app.UseRateLimiter();
app.MapControllers();
app.MapOpenApi();
// One API instance in this local prototype; database readiness is guaranteed by Compose.
using (var scope = app.Services.CreateScope())
    await scope.ServiceProvider.GetRequiredService<ResumeDbContext>().Database.MigrateAsync();
app.Run();

public partial class Program;
