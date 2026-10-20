using AudioGuide.Business.Dtos;
using AudioGuide.Business.Services;
using AudioGuide.Data.Entities;
using AudioGuide.Data.Repositories;
using Moq;

namespace AudioGuide.Tests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ITokenService> _tokens = new();
    private readonly AuthService _service;

    public AuthServiceTests()
    {
        _tokens.Setup(t => t.CreateToken(It.IsAny<User>()))
               .Returns(new TokenResult("token", DateTime.UtcNow.AddHours(1)));
        _users.Setup(u => u.AddAsync(It.IsAny<User>())).ReturnsAsync((User u) => u);

        _service = new AuthService(_users.Object, _tokens.Object);
    }

    [Fact]
    public async Task Register_Valid_HashesPasswordAndAssignsUserRole()
    {
        User? saved = null;
        _users.Setup(u => u.GetByUsernameAsync("sinhvien1")).ReturnsAsync((User?)null);
        _users.Setup(u => u.AddAsync(It.IsAny<User>()))
              .Callback<User>(u => saved = u)
              .ReturnsAsync((User u) => u);

        var result = await _service.RegisterAsync(new RegisterDto("  SinhVien1  ", "matkhau123"));

        Assert.NotNull(saved);
        Assert.Equal("sinhvien1", saved!.Username);
        Assert.Equal(Roles.User, saved.Role);
        Assert.NotEqual("matkhau123", saved.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("matkhau123", saved.PasswordHash));
        Assert.Equal("token", result.Token);
        Assert.Equal(Roles.User, result.Role);
    }

    [Fact]
    public async Task Register_DuplicateUsername_ThrowsConflict()
    {
        _users.Setup(u => u.GetByUsernameAsync("sinhvien1")).ReturnsAsync(new User { Username = "sinhvien1" });

        await Assert.ThrowsAsync<ConflictException>(
            () => _service.RegisterAsync(new RegisterDto("sinhvien1", "matkhau123")));

        _users.Verify(u => u.AddAsync(It.IsAny<User>()), Times.Never);
    }

    [Theory]
    [InlineData("ab", "matkhau123")]
    [InlineData("ten co dau cach", "matkhau123")]
    [InlineData("hopLe", "ngan")]
    public async Task Register_InvalidInput_ThrowsArgumentException(string username, string password)
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.RegisterAsync(new RegisterDto(username, password)));
    }

    [Fact]
    public async Task Register_PasswordTooLong_ThrowsArgumentException()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.RegisterAsync(new RegisterDto("hople", new string('a', 73))));
    }

    [Fact]
    public async Task Login_CorrectPassword_ReturnsToken()
    {
        var user = new User
        {
            Id = 1,
            Username = "an",
            Role = Roles.Admin,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("matkhau123")
        };
        _users.Setup(u => u.GetByUsernameAsync("an")).ReturnsAsync(user);

        var result = await _service.LoginAsync(new LoginDto("An", "matkhau123"));

        Assert.NotNull(result);
        Assert.Equal("token", result!.Token);
        Assert.Equal(Roles.Admin, result.Role);
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsNull()
    {
        var user = new User { Username = "an", PasswordHash = BCrypt.Net.BCrypt.HashPassword("matkhau123") };
        _users.Setup(u => u.GetByUsernameAsync("an")).ReturnsAsync(user);

        var result = await _service.LoginAsync(new LoginDto("an", "saimatkhau"));

        Assert.Null(result);
    }

    [Fact]
    public async Task Login_UnknownUser_ReturnsNull()
    {
        _users.Setup(u => u.GetByUsernameAsync("khongco")).ReturnsAsync((User?)null);

        var result = await _service.LoginAsync(new LoginDto("khongco", "matkhau123"));

        Assert.Null(result);
    }

    [Fact]
    public async Task SeedAdmin_NotExisting_CreatesAdmin()
    {
        User? saved = null;
        _users.Setup(u => u.GetByUsernameAsync("admin")).ReturnsAsync((User?)null);
        _users.Setup(u => u.AddAsync(It.IsAny<User>()))
              .Callback<User>(u => saved = u)
              .ReturnsAsync((User u) => u);

        await _service.SeedAdminAsync("admin", "matkhau123");

        Assert.NotNull(saved);
        Assert.Equal(Roles.Admin, saved!.Role);
    }

    [Fact]
    public async Task SeedAdmin_AlreadyExisting_DoesNothing()
    {
        _users.Setup(u => u.GetByUsernameAsync("admin")).ReturnsAsync(new User { Username = "admin" });

        await _service.SeedAdminAsync("admin", "matkhau123");

        _users.Verify(u => u.AddAsync(It.IsAny<User>()), Times.Never);
    }
}