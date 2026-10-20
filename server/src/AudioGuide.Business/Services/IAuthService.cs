using AudioGuide.Business.Dtos;

namespace AudioGuide.Business.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);

    // Trả null nếu sai tên đăng nhập hoặc mật khẩu
    Task<AuthResponseDto?> LoginAsync(LoginDto dto);

    // Tạo tài khoản admin nếu chưa tồn tại
    Task SeedAdminAsync(string username, string password);
}