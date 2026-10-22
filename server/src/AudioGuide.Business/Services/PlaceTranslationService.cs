using AudioGuide.Business.Dtos;
using AudioGuide.Business.Providers;
using AudioGuide.Data.Entities;
using AudioGuide.Data.Repositories;

namespace AudioGuide.Business.Services;

public class PlaceTranslationService : IPlaceTranslationService
{
    private static readonly string[] SupportedLanguages = { "en", "fr", "ja", "ko", "zh-CN" };
    private const string SourceLanguage = "vi";

    private readonly IPlaceRepository _places;
    private readonly ITranslationRepository _translations;
    private readonly ITranslationProvider _provider;

    public PlaceTranslationService(
        IPlaceRepository places,
        ITranslationRepository translations,
        ITranslationProvider provider)
    {
        _places = places;
        _translations = translations;
        _provider = provider;
    }

    public async Task<TranslationDto?> GetOrTranslateAsync(int placeId, string languageCode)
    {
        var lang = Normalize(languageCode);

        var place = await _places.GetByIdAsync(placeId);
        if (place is null) return null;

        // Cache: đã có bản dịch thì trả luôn, không gọi dịch vụ ngoài
        var cached = await _translations.GetAsync(placeId, lang);
        if (cached is not null)
            return new TranslationDto(placeId, lang, cached.TranslatedText, true);

        var translatedText = await _provider.TranslateAsync(place.Description, SourceLanguage, lang);

        // Nếu request khác vừa lưu trước, repository trả về bản đã lưu đó
        var saved = await _translations.AddAsync(new Translation
        {
            PlaceId = placeId,
            LanguageCode = lang,
            TranslatedText = translatedText
        });

        return new TranslationDto(placeId, lang, saved.TranslatedText, false);
    }

    public async Task<List<TranslationDto>?> GetCachedAsync(int placeId)
    {
        var place = await _places.GetByIdAsync(placeId);
        if (place is null) return null;

        var items = await _translations.GetByPlaceIdAsync(placeId);
        return items
            .Select(t => new TranslationDto(t.PlaceId, t.LanguageCode, t.TranslatedText, true))
            .ToList();
    }

    public async Task<bool> ClearCacheAsync(int placeId)
    {
        var place = await _places.GetByIdAsync(placeId);
        if (place is null) return false;

        await _translations.DeleteByPlaceIdAsync(placeId);
        return true;
    }

    private static string Normalize(string languageCode)
    {
        var lang = SupportedLanguages.FirstOrDefault(l =>
            l.Equals(languageCode?.Trim(), StringComparison.OrdinalIgnoreCase));

        if (lang is null)
            throw new ArgumentException(
                $"Ngôn ngữ không được hỗ trợ. Chọn một trong: {string.Join(", ", SupportedLanguages)}.");

        return lang;
    }
}
