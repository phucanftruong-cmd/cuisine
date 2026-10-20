namespace AudioGuide.Data.Entities;

public class Translation
{
    public int Id { get; set; }
    public int PlaceId { get; set; }
    public Place? Place { get; set; }
    public string LanguageCode { get; set; } = string.Empty;
    public string TranslatedText { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}