using AudioGuide.Data.Entities;

namespace AudioGuide.Business.Services;

public record TokenResult(string Token, DateTime ExpiresAt);

public interface ITokenService
{
    TokenResult CreateToken(User user);
}