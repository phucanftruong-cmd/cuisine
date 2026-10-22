using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace AudioGuide.Api.RateLimiting;

public static class RateLimitPolicies
{
    // Đăng nhập / đăng ký: chống dò mật khẩu và tạo tài khoản hàng loạt
    public const string Auth = "auth";

    // Thiết bị báo "đang nghe": client gửi mỗi 5 giây
    public const string Heartbeat = "heartbeat";
}

public static class RateLimitingExtensions
{
    // Mỗi IP một bộ đếm riêng, cửa sổ cố định 1 phút. Vượt hạn mức trả 429 kèm Retry-After.
    public static IServiceCollection AddApiRateLimiting(this IServiceCollection services, IConfiguration config)
    {
        // Cho phép chỉnh bằng cấu hình (RateLimit:AuthPerMinute, RateLimit:HeartbeatPerMinute)
        var authLimit = config.GetValue<int?>("RateLimit:AuthPerMinute") ?? 10;
        // 12 lần/phút/thiết bị: 120 đủ cho khoảng 10 máy dùng chung một wifi
        var heartbeatLimit = config.GetValue<int?>("RateLimit:HeartbeatPerMinute") ?? 120;

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(RateLimitPolicies.Auth, context => PerIp(context, authLimit));
            options.AddPolicy(RateLimitPolicies.Heartbeat, context => PerIp(context, heartbeatLimit));

            options.OnRejected = async (context, token) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();

                await context.HttpContext.Response.WriteAsJsonAsync(
                    new { error = "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút." }, token);
            };
        });

        return services;
    }

    private static RateLimitPartition<string> PerIp(HttpContext context, int permitsPerMinute) =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitsPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
}
