using AudioGuide.Business.Dtos;

namespace AudioGuide.Business.Services;

public interface IPlaceTranslationService
{
    // Trả null nếu không có địa điểm
    Task<TranslationDto?> GetOrTranslateAsync(int placeId, string languageCode);

    // Các bản dịch đã lưu (cache) của địa điểm. Trả null nếu không có địa điểm.
    Task<List<TranslationDto>?> GetCachedAsync(int placeId);

    // Xóa toàn bộ bản dịch đã lưu để lần sau dịch lại. Trả false nếu không có địa điểm.
    Task<bool> ClearCacheAsync(int placeId);
}
