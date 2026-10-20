using System.Text;
using System.Text.RegularExpressions;
using AudioGuide.Business.Dtos;
using AudioGuide.Data.Entities;
using AudioGuide.Data.Repositories;

namespace AudioGuide.Business.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly ITokenService _tokens;

    public AuthService(IUserRepository users, ITokenService tokens)
    {
        _users = users;
        _tokens = tokens;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var username = NormalizeUsername(dto.Username);
        ValidatePassword(dto.Password);

        if (await _users.GetByUsernameAsync(username) is not null)
            throw new ConflictException("Tên đăng nhập đã tồn tại.");

        var user = new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = Roles.User
        };
        await _users.AddAsync(user);

        return ToResponse(user);
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        var username = (dto.Username ?? string.Empty).Trim().ToLowerInvariant();
        var user = await _users.GetByUsernameAsync(username);

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password ?? string.Empty, user.PasswordHash))
            return null;

        return ToResponse(user);
    }

    public async Task SeedAdminAsync(string username, string password)
    {
        var name = NormalizeUsername(username);
        ValidatePassword(password);

        if (await _users.GetByUsernameAsync(name) is not null) return;

        await _users.AddAsync(new User
        {
            Username = name,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = Roles.Admin
        });
    }

    private AuthResponseDto ToResponse(User user)
    {
        var token = _tokens.CreateToken(user);
        return new AuthResponseDto(token.Token, user.Username, user.Role, token.ExpiresAt);
    }

    private static string NormalizeUsername(string? username)
    {
        var name = (username ?? string.Empty).Trim().ToLowerInvariant();
        if (!Regex.IsMatch(name, @"^[a-z0-9._-]{3,50}$"))
            throw new ArgumentException(
                "Tên đăng nhập dài 3 đến 50 ký tự, chỉ gồm chữ cái không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.");
        return name;
    }

    private static void ValidatePassword(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 8)
            throw new ArgumentException("Mật khẩu phải có ít nhất 8 ký tự.");

        // BCrypt chỉ dùng tối đa 72 byte đầu của mật khẩu
        if (Encoding.UTF8.GetByteCount(password) > 72)
            throw new ArgumentException("Mật khẩu quá dài (tối đa 72 byte).");
    }
}