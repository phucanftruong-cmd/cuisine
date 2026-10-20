namespace AudioGuide.Business.Dtos;

public record RegisterDto(string Username, string Password);

public record LoginDto(string Username, string Password);

public record AuthResponseDto(string Token, string Username, string Role, DateTime ExpiresAt);