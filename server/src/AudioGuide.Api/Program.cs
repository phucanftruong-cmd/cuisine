using System.Security.Claims;
using System.Text;
using AudioGuide.Api.Middleware;
using AudioGuide.Business.Providers;
using AudioGuide.Business.Services;
using AudioGuide.Data;
using AudioGuide.Data.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình JWT (khóa lấy từ user-secrets hoặc biến môi trường, không ghi trong code)
var jwt = new JwtOptions
{
    Key = builder.Configuration["Jwt:Key"]
          ?? throw new InvalidOperationException("Thiếu cấu hình Jwt:Key (xem README)."),
    Issuer = builder.Configuration["Jwt:Issuer"] ?? "AudioGuide",
    Audience = builder.Configuration["Jwt:Audience"] ?? "AudioGuide.Client",
    ExpiresMinutes = int.TryParse(builder.Configuration["Jwt:ExpiresMinutes"], out var minutes) ? minutes : 60
};
if (jwt.Key.Length < 32)
    throw new InvalidOperationException("Jwt:Key phải dài ít nhất 32 ký tự.");
builder.Services.AddSingleton(jwt);

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

// Đếm thiết bị đang nghe: Singleton để mọi request dùng chung một bộ đếm trong bộ nhớ
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IListenerService, ListenerService>();

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddSingleton<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// Xác thực JWT
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization();
// CORS: cho phép frontend (trình duyệt) gọi API
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000", "http://localhost:5173", "http://localhost:8081" };
builder.Services.AddCors(options =>
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Tự tạo / cập nhật database khi khởi động, rồi tạo tài khoản admin nếu có cấu hình
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    var adminUsername = app.Configuration["Admin:Username"];
    var adminPassword = app.Configuration["Admin:Password"];
    if (!string.IsNullOrWhiteSpace(adminUsername) && !string.IsNullOrWhiteSpace(adminPassword))
    {
        var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
        await auth.SeedAdminAsync(adminUsername, adminPassword);
    }
    var seedSamples = app.Configuration.GetValue<bool?>("Seed:SamplePlaces") ?? app.Environment.IsDevelopment();
    if (seedSamples)
    {
        var placeService = scope.ServiceProvider.GetRequiredService<IPlaceService>();
        await placeService.SeedSampleDataAsync();
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}
app.UseCors("Frontend");
app.UseMiddleware<ExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();