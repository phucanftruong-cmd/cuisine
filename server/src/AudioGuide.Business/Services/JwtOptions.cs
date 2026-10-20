namespace AudioGuide.Business.Services;

public class JwtOptions
{
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "AudioGuide";
    public string Audience { get; set; } = "AudioGuide.Client";
    public int ExpiresMinutes { get; set; } = 60;
}