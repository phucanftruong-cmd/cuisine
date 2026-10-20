using AudioGuide.Business.Dtos;

namespace AudioGuide.Business.Services;

public interface IPlaceTranslationService
{
    // Trả null nếu không có địa điểm
    Task<TranslationDto?> GetOrTranslateAsync(int placeId, string languageCode);
}