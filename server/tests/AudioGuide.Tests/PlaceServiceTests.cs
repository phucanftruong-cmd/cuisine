using AudioGuide.Business.Dtos;
using AudioGuide.Business.Services;
using AudioGuide.Data.Entities;
using AudioGuide.Data.Repositories;
using Moq;

namespace AudioGuide.Tests;

public class PlaceServiceTests
{
    private readonly Mock<IPlaceRepository> _repo = new();
    private readonly Mock<ITranslationRepository> _translations = new();
    private readonly PlaceService _service;

    public PlaceServiceTests()
    {
        _service = new PlaceService(_repo.Object, _translations.Object);
    }

    [Fact]
    public async Task SearchAsync_ReturnsMappedPage()
    {
        _repo.Setup(r => r.SearchAsync(It.IsAny<PlaceFilter>()))
             .ReturnsAsync(new PlaceSearchResult(new List<Place>
             {
                 new() { Id = 1, Name = "A", Description = "a", Category = "Phở" },
                 new() { Id = 2, Name = "B", Description = "b" }
             }, 5));

        var result = await _service.SearchAsync(new PlaceQueryDto { Page = 1, PageSize = 2 });

        Assert.Equal(2, result.Items.Count);
        Assert.Equal(5, result.Total);
        Assert.Equal(3, result.TotalPages);
        Assert.Equal("Phở", result.Items[0].Category);
    }

    [Fact]
    public async Task SearchAsync_NormalizesTermsAndClampsPaging()
    {
        PlaceFilter? captured = null;
        _repo.Setup(r => r.SearchAsync(It.IsAny<PlaceFilter>()))
             .Callback<PlaceFilter>(f => captured = f)
             .ReturnsAsync(new PlaceSearchResult(new List<Place>(), 0));

        await _service.SearchAsync(new PlaceQueryDto
        {
            Search = "  Phở  BÒ ",
            Category = "  ",
            Page = 0,
            PageSize = 1000
        });

        Assert.NotNull(captured);
        Assert.Equal(new[] { "pho", "bo" }, captured!.SearchTerms);
        Assert.Null(captured.Category);
        Assert.Equal(1, captured.Page);
        Assert.Equal(50, captured.PageSize);
    }

    [Fact]
    public async Task GetByIdAsync_Found_ReturnsDto()
    {
        _repo.Setup(r => r.GetByIdAsync(1))
             .ReturnsAsync(new Place { Id = 1, Name = "Chợ Bến Thành", Description = "abc" });

        var result = await _service.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal("Chợ Bến Thành", result!.Name);
    }

    [Fact]
    public async Task GetByIdAsync_NotFound_ReturnsNull()
    {
        _repo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Place?)null);

        var result = await _service.GetByIdAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task CreateAsync_ValidInput_TrimsSavesAndBuildsSearchText()
    {
        Place? saved = null;
        _repo.Setup(r => r.AddAsync(It.IsAny<Place>()))
             .Callback<Place>(p => saved = p)
             .ReturnsAsync((Place p) => p);

        var result = await _service.CreateAsync(new CreatePlaceDto(
            "  Phở Bò Đặc Biệt  ", "  Mô tả  ", Category: "Phở", PriceMin: 40000, PriceMax: 70000));

        Assert.Equal("Phở Bò Đặc Biệt", result.Name);
        Assert.Equal("Mô tả", result.Description);
        Assert.NotNull(saved);
        Assert.Contains("pho bo dac biet", saved!.SearchText);
    }

    [Theory]
    [InlineData("", "abc")]
    [InlineData("   ", "abc")]
    [InlineData("abc", "")]
    [InlineData("abc", "   ")]
    public async Task CreateAsync_EmptyFields_ThrowsAndDoesNotSave(string name, string description)
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.CreateAsync(new CreatePlaceDto(name, description)));

        _repo.Verify(r => r.AddAsync(It.IsAny<Place>()), Times.Never);
    }

    [Theory]
    [InlineData(-5, null, null, null, null)]
    [InlineData(100, 50, null, null, null)]
    [InlineData(null, null, 91.0, 106.0, null)]
    [InlineData(null, null, 10.7, null, null)]
    [InlineData(null, null, null, null, "not a url")]
    [InlineData(null, null, null, null, "ftp://example.com/a.png")]
    public async Task CreateAsync_InvalidOptionalFields_ThrowsAndDoesNotSave(
        int? priceMin, int? priceMax, double? latitude, double? longitude, string? imageUrl)
    {
        var dto = new CreatePlaceDto("Tên", "Mô tả",
            PriceMin: priceMin, PriceMax: priceMax,
            ImageUrl: imageUrl, Latitude: latitude, Longitude: longitude);

        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateAsync(dto));

        _repo.Verify(r => r.AddAsync(It.IsAny<Place>()), Times.Never);
    }

    [Fact]
    public async Task UpdateAsync_Found_UpdatesFields()
    {
        var place = new Place { Id = 1, Name = "Cũ", Description = "cũ" };
        _repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(place);

        var result = await _service.UpdateAsync(1, new UpdatePlaceDto("Mới", "mới"));

        Assert.NotNull(result);
        Assert.Equal("Mới", place.Name);
        _repo.Verify(r => r.UpdateAsync(place), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_NotFound_ReturnsNull()
    {
        _repo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Place?)null);

        var result = await _service.UpdateAsync(999, new UpdatePlaceDto("Mới", "mới"));

        Assert.Null(result);
        _repo.Verify(r => r.UpdateAsync(It.IsAny<Place>()), Times.Never);
    }

    [Fact]
    public async Task UpdateAsync_DescriptionChanged_ClearsTranslationCache()
    {
        var place = new Place { Id = 1, Name = "A", Description = "cũ" };
        _repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(place);

        await _service.UpdateAsync(1, new UpdatePlaceDto("A", "mới"));

        _translations.Verify(t => t.DeleteByPlaceIdAsync(1), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_OnlyNameChanged_KeepsTranslationCache()
    {
        var place = new Place { Id = 1, Name = "A", Description = "nội dung" };
        _repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(place);

        await _service.UpdateAsync(1, new UpdatePlaceDto("B", "nội dung"));

        _translations.Verify(t => t.DeleteByPlaceIdAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_Found_ReturnsTrue()
    {
        var place = new Place { Id = 1, Name = "A", Description = "a" };
        _repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(place);

        var result = await _service.DeleteAsync(1);

        Assert.True(result);
        _repo.Verify(r => r.DeleteAsync(place), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_NotFound_ReturnsFalse()
    {
        _repo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Place?)null);

        var result = await _service.DeleteAsync(999);

        Assert.False(result);
        _repo.Verify(r => r.DeleteAsync(It.IsAny<Place>()), Times.Never);
    }

    [Fact]
    public async Task SeedSampleData_WhenEmpty_AddsSamples()
    {
        _repo.Setup(r => r.AnyAsync()).ReturnsAsync(false);

        await _service.SeedSampleDataAsync();

        _repo.Verify(r => r.AddAsync(It.Is<Place>(p => p.Name.StartsWith("[Mẫu]"))), Times.AtLeast(3));
    }

    [Fact]
    public async Task SeedSampleData_WhenNotEmpty_DoesNothing()
    {
        _repo.Setup(r => r.AnyAsync()).ReturnsAsync(true);

        await _service.SeedSampleDataAsync();

        _repo.Verify(r => r.AddAsync(It.IsAny<Place>()), Times.Never);
    }
}