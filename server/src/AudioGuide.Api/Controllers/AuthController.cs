using System.Security.Claims;
using AudioGuide.Business.Dtos;
using AudioGuide.Business.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AudioGuide.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto) =>
        Ok(await _auth.RegisterAsync(dto));

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var result = await _auth.LoginAsync(dto);
        return result is null
            ? Unauthorized(new { error = "Sai tên đăng nhập hoặc mật khẩu." })
            : Ok(result);
    }

    // Frontend gọi khi mở trang để kiểm tra token còn dùng được không
    [HttpGet("me")]
    [Authorize]
    public ActionResult<CurrentUserDto> Me() =>
        Ok(new CurrentUserDto(
            User.Identity?.Name ?? string.Empty,
            User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty));
}
