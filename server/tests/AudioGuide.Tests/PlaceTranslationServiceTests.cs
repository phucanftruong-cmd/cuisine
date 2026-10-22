using AudioGuide.Business.Providers;
using AudioGuide.Business.Services;
using AudioGuide.Data.Entities;
using AudioGuide.Data.Repositories;
using Moq;

namespace AudioGuide.Tests;

public class PlaceTranslationServiceTests
{
    private readonly Mock<IPlaceRepository> _places = new();
    private readonly Mock<ITranslationRepository> _translations = new();
    private readonly Mock<ITranslationProvider> _provider = new();
    private readonly PlaceTranslationService _service;

    public PlaceTranslationServiceTests()
    {
        // Mặc định repository lưu thành công và trả lại đúng bản vừa lưu
        _translations.Setup(r => r.AddAsync(It.IsAny<Translation>()))
                     .ReturnsAsync((Translation t) => t);

        _service = new PlaceTranslationService(_places.Object, _translations.Object, _provider.Object);
    }

    private void SetupPlace() =>
        _places.Setup(r => r.GetByIdAsync(1))
               .ReturnsAsync(new Place { Id = 1, Name = "Chợ Bến Thành", Description = "Xin chào" });

    [Fact]
    public async Task PlaceNotFound_ReturnsNull_AndDoesNotCallProvider()
    {
        _places.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Place?)null);

        var result = await _service.GetOrTranslateAsync(999, "en");

        Assert.Null(result);
        _provider.Verify(p => p.TranslateAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CachedTranslation_ReturnsFromCache_AndDoesNotCallProvider()
    {
        SetupPlace();
        _translations.Setup(r => r.GetAsync(1, "en"))
                     .ReturnsAsync(new Translation { PlaceId = 1, LanguageCode = "en", TranslatedText = "Hello" });

        var result = await _service.GetOrTranslateAsync(1, "en");

        Assert.NotNull(result);
        Assert.True(result!.FromCache);
        Assert.Equal("Hello", result.TranslatedText);
        _provider.Verify(p => p.TranslateAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task NotCached_CallsProvider_SavesAndReturnsTranslation()
    {
        SetupPlace();
        _translations.Setup(r => r.GetAsync(1, "en")).ReturnsAsync((Translation?)null);
        _provider.Setup(p => p.TranslateAsync("Xin chào", "vi", "en")).ReturnsAsync("Hello");

        var result = await _service.GetOrTranslateAsync(1, "en");

        Assert.NotNull(result);
        Assert.False(result!.FromCache);
        Assert.Equal("Hello", result.TranslatedText);
        _translations.Verify(r => r.AddAsync(It.Is<Translation>(t =>
            t.PlaceId == 1 && t.LanguageCode == "en" && t.TranslatedText == "Hello")), Times.Once);
    }

    [Fact]
    public async Task LanguageCode_IsCaseInsensitive()
    {
        SetupPlace();
        _translations.Setup(r => r.GetAsync(1, "en")).ReturnsAsync((Translation?)null);
        _provider.Setup(p => p.TranslateAsync("Xin chào", "vi", "en")).ReturnsAsync("Hello");

        var result = await _service.GetOrTranslateAsync(1, "EN");

        Assert.Equal("en", result!.LanguageCode);
    }

    [Theory]
    [InlineData("xx")]
    [InlineData("")]
    [InlineData("vi")]
    public async Task UnsupportedLanguage_ThrowsArgumentException(string lang)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _service.GetOrTranslateAsync(1, lang));
    }

    [Fact]
    public async Task ProviderFails_ThrowsAndSavesNothing()
    {
        SetupPlace();
        _translations.Setup(r => r.GetAsync(1, "en")).ReturnsAsync((Translation?)null);
        _provider.Setup(p => p.TranslateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                 .ThrowsAsync(new TranslationProviderException("lỗi"));

        await Assert.ThrowsAsync<TranslationProviderException>(() => _service.GetOrTranslateAsync(1, "en"));

        _translations.Verify(r => r.AddAsync(It.IsAny<Translation>()), Times.Never);
    }

    [Fact]
    public async Task ConcurrentSave_ReturnsTranslationAlreadySavedByOtherRequest()
    {
        SetupPlace();
        _translations.Setup(r => r.GetAsync(1, "en")).ReturnsAsync((Translation?)null);
        _provider.Setup(p => p.TranslateAsync("Xin chào", "vi", "en")).ReturnsAsync("Hello (lần 2)");
        // Repository báo đã có bản dịch do request khác lưu trước
        _translations.Setup(r => r.AddAsync(It.IsAny<Translation>()))
                     .ReturnsAsync(new Translation { PlaceId = 1, LanguageCode = "en", TranslatedText = "Hello" });

        var result = await _service.GetOrTranslateAsync(1, "en");

        Assert.Equal("Hello", result!.TranslatedText);
    }

    [Fact]
    public async Task GetCached_PlaceNotFound_ReturnsNull()
    {
        _places.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Place?)null);

        var result = await _service.GetCachedAsync(999);

        Assert.Null(result);
        _translations.Verify(r => r.GetByPlaceIdAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetCached_ReturnsSavedTranslations()
    {
        SetupPlace();
        _translations.Setup(r => r.GetByPlaceIdAsync(1)).ReturnsAsync(new List<Translation>
        {
            new() { PlaceId = 1, LanguageCode = "en", TranslatedText = "Hello" },
            new() { PlaceId = 1, LanguageCode = "ja", TranslatedText = "こんにちは" }
        });

        var result = await _service.GetCachedAsync(1);

        Assert.NotNull(result);
        Assert.Equal(new[] { "en", "ja" }, result!.Select(t => t.LanguageCode));
        Assert.All(result, t => Assert.True(t.FromCache));
    }

    [Fact]
    public async Task ClearCache_PlaceNotFound_ReturnsFalseAndDeletesNothing()
    {
        _places.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Place?)null);

        var result = await _service.ClearCacheAsync(999);

        Assert.False(result);
        _translations.Verify(r => r.DeleteByPlaceIdAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task ClearCache_PlaceFound_DeletesTranslations()
    {
        SetupPlace();

        var result = await _service.ClearCacheAsync(1);

        Assert.True(result);
        _translations.Verify(r => r.DeleteByPlaceIdAsync(1), Times.Once);
    }
}