using System.Security.Claims;
using AudioGuide.Business.Services;
using AudioGuide.Data.Entities;
using Microsoft.IdentityModel.JsonWebTokens;

namespace AudioGuide.Tests;

public class JwtTokenServiceTests
{
    [Fact]
    public void CreateToken_ContainsUserClaimsAndExpiry()
    {
        var options = new JwtOptions { Key = new string('k', 40), ExpiresMinutes = 30 };
        var service = new JwtTokenService(options);
        var user = new User { Id = 7, Username = "admin", Role = Roles.Admin };

        var result = service.CreateToken(user);
        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(result.Token);

        Assert.Equal("admin", jwt.Claims.First(c => c.Type == ClaimTypes.Name).Value);
        Assert.Equal(Roles.Admin, jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value);
        Assert.Equal(options.Issuer, jwt.Issuer);
        Assert.True(result.ExpiresAt > DateTime.UtcNow.AddMinutes(25));
    }
}