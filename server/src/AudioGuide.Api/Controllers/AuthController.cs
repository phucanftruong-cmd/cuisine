using AudioGuide.Business.Dtos;
using AudioGuide.Business.Services;
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
}