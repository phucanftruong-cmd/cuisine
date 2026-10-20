namespace AudioGuide.Business.Dtos;

public record TranslationDto(int PlaceId, string LanguageCode, string TranslatedText, bool FromCache);