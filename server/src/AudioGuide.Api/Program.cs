using AudioGuide.Api.Middleware;
using AudioGuide.Business.Services;
using AudioGuide.Data;
using AudioGuide.Data.Repositories;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using AudioGuide.Business.Providers;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("Default"),
        b => b.MigrationsAssembly("AudioGuide.Data")));

// Dependency Injection: interface -> implementation
builder.Services.AddScoped<IPlaceRepository, PlaceRepository>();
builder.Services.AddScoped<IPlaceService, PlaceService>();

builder.Services.AddScoped<ITranslationRepository, TranslationRepository>();
builder.Services.AddScoped<IPlaceTranslationService, PlaceTranslationService>();
builder.Services.AddSingleton(new MyMemoryOptions
{
    Email = builder.Configuration["MyMemory:Email"]
});
builder.Services.AddHttpClient<ITranslationProvider, MyMemoryTranslationProvider>(client =>
{
    client.BaseAddress = new Uri("https://api.mymemory.translated.net/");
    client.Timeout = TimeSpan.FromSeconds(15);
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Tự tạo / cập nhật database khi khởi động
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseMiddleware<ExceptionMiddleware>();
app.MapControllers();

app.Run();