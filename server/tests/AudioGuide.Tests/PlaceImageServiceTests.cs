using AudioGuide.Business.Dtos;
using AudioGuide.Business.Providers;
using AudioGuide.Business.Services;
using AudioGuide.Data.Entities;
using AudioGuide.Data.Repositories;
using Moq;

namespace AudioGuide.Tests;

public class PlaceImageServiceTests
{
    private static readonly byte[] Jpeg = { 0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46 };
    private static readonly byte[] Png = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0 };

    private readonly Mock<IPlaceRepository> _places = new();
    private readonly Mock<IPlaceImageRepository> _images = new();
    private readonly Mock<IImageStorage> _storage = new();
    private readonly List<PlaceImage> _stored = new();
    private readonly Place _place = new() { Id = 1, Name = "A", Description = "a" };
    private readonly PlaceImageService _service;

    public PlaceImageServiceTests()
    {
        _places.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_place);
        _images.Setup(r => r.GetByPlaceIdAsync(1)).ReturnsAsync(() => _stored.OrderBy(i => i.SortOrder).ToList());
        _images.Setup(r => r.AddAsync(It.IsAny<PlaceImage>())).ReturnsAsync((PlaceImage i) =>
        {
            i.Id = _stored.Count + 1;
            _stored.Add(i);
            return i;
        });
        _images.Setup(r => r.DeleteAsync(It.IsAny<PlaceImage>()))
               .Callback((PlaceImage i) => _stored.RemoveAll(s => s.Id == i.Id))
               .Returns(Task.CompletedTask);
        var counter = 0;
        _storage.Setup(s => s.SaveAsync(It.IsAny<byte[]>(), It.IsAny<string>()))
                .ReturnsAsync((byte[] _, string ext) => $"/uploads/places/{++counter}.{ext}");
        _service = new PlaceImageService(_places.Object, _images.Object, _storage.Object);
    }

    private Task<PlaceGalleryDto?> Upload(byte[] bytes, string? caption = null, int placeId = 1) =>
        _service.UploadAsync(placeId, new MemoryStream(bytes), bytes.Length, caption);

    [Fact]
    public async Task Upload_FirstImage_BecomesCover()
    {
        var gallery = await Upload(Jpeg, "  Phở tái  ");

        Assert.NotNull(gallery);
        Assert.Equal("/uploads/places/1.jpg", gallery!.CoverUrl);
        Assert.Equal("/uploads/places/1.jpg", _place.ImageUrl);
        var image = Assert.Single(gallery.Images);
        Assert.Equal("Phở tái", image.Caption);
        Assert.True(image.IsCover);
    }

    [Fact]
    public async Task Upload_KeepsExistingCover_AndAppendsAtEnd()
    {
        _place.ImageUrl = "https://example.com/cover.jpg";
        await Upload(Jpeg);

        var gallery = await Upload(Png);

        Assert.Equal("https://example.com/cover.jpg", gallery!.CoverUrl);
        Assert.Equal(new[] { "/uploads/places/1.jpg", "/uploads/places/2.png" }, gallery.Images.Select(i => i.Url));
        Assert.Equal(new[] { 0, 1 }, gallery.Images.Select(i => i.SortOrder));
        Assert.All(gallery.Images, i => Assert.False(i.IsCover));
    }

    [Fact]
    public async Task Upload_NotAnImage_Throws()
    {
        var text = "hello, this is not an image"u8.ToArray();

        await Assert.ThrowsAsync<ArgumentException>(() => Upload(text));
        _storage.Verify(s => s.SaveAsync(It.IsAny<byte[]>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Upload_TooLarge_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.UploadAsync(1, new MemoryStream(Jpeg), PlaceImageService.MaxFileBytes + 1, null));
    }

    [Fact]
    public async Task Upload_PlaceFull_Throws()
    {
        for (var i = 0; i < PlaceImageService.MaxImagesPerPlace; i++)
            _stored.Add(new PlaceImage { Id = i + 1, PlaceId = 1, Url = $"/uploads/places/x{i}.jpg", SortOrder = i });

        await Assert.ThrowsAsync<ArgumentException>(() => Upload(Jpeg));
    }

    [Fact]
    public async Task Upload_CaptionTooLong_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => Upload(Jpeg, new string('a', 101)));
    }

    [Fact]
    public async Task Upload_DatabaseFails_DeletesSavedFile()
    {
        _images.Setup(r => r.AddAsync(It.IsAny<PlaceImage>())).ThrowsAsync(new InvalidOperationException("db"));

        await Assert.ThrowsAsync<InvalidOperationException>(() => Upload(Jpeg));
        _storage.Verify(s => s.DeleteAsync("/uploads/places/1.jpg"), Times.Once);
    }

    [Fact]
    public async Task UnknownPlace_ReturnsNull()
    {
        _places.Setup(r => r.GetByIdAsync(9)).ReturnsAsync((Place?)null);

        Assert.Null(await _service.GetAsync(9));
        Assert.Null(await Upload(Jpeg, placeId: 9));
        _storage.Verify(s => s.SaveAsync(It.IsAny<byte[]>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SetCover_UpdatesPlaceImageUrl()
    {
        await Upload(Jpeg);
        await Upload(Png);

        var gallery = await _service.SetCoverAsync(1, 2);

        Assert.Equal("/uploads/places/2.png", gallery!.CoverUrl);
        Assert.Equal("/uploads/places/2.png", _place.ImageUrl);
        Assert.Null(await _service.SetCoverAsync(1, 99));
    }

    [Fact]
    public async Task Delete_Cover_MovesCoverToNextImage_ThenClears()
    {
        await Upload(Jpeg);
        await Upload(Png);

        var gallery = await _service.DeleteAsync(1, 1);
        Assert.Equal("/uploads/places/2.png", gallery!.CoverUrl);
        Assert.Single(gallery.Images);
        _storage.Verify(s => s.DeleteAsync("/uploads/places/1.jpg"), Times.Once);

        gallery = await _service.DeleteAsync(1, 2);
        Assert.Null(gallery!.CoverUrl);
        Assert.Null(_place.ImageUrl);
        Assert.Empty(gallery.Images);
    }

    [Fact]
    public async Task Reorder_RequiresExactCurrentIds()
    {
        await Upload(Jpeg);
        await Upload(Png);

        var gallery = await _service.ReorderAsync(1, new ReorderPlaceImagesDto(new List<int> { 2, 1 }));
        Assert.Equal(new[] { 2, 1 }, gallery!.Images.Select(i => i.Id));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.ReorderAsync(1, new ReorderPlaceImagesDto(new List<int> { 1 })));
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.ReorderAsync(1, new ReorderPlaceImagesDto(new List<int> { 1, 1 })));
    }

    [Theory]
    [InlineData(new byte[] { 0xFF, 0xD8, 0xFF, 0xDB }, "jpg")]
    [InlineData(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, "png")]
    [InlineData(new byte[] { 0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50 }, "webp")]
    [InlineData(new byte[] { 0x47, 0x49, 0x46, 0x38, 0x39, 0x61 }, null)] // GIF
    [InlineData(new byte[] { 0xFF, 0xD8 }, null)]
    public void DetectImageType_ReadsMagicBytes(byte[] bytes, string? expected)
    {
        Assert.Equal(expected, PlaceImageService.DetectImageType(bytes));
    }
}

public class LocalImageStorageTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "audioguide-test-" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, true);
    }

    [Fact]
    public async Task SaveThenDelete_RoundTrips()
    {
        var storage = new LocalImageStorage(_root);

        var url = await storage.SaveAsync(new byte[] { 1, 2, 3 }, "jpg");

        Assert.StartsWith(LocalImageStorage.UrlPrefix, url);
        var path = storage.ResolvePath(url)!;
        Assert.True(File.Exists(path));
        await storage.DeleteAsync(url);
        Assert.False(File.Exists(path));
    }

    [Theory]
    [InlineData("/uploads/places/../../appsettings.json")]
    [InlineData("/uploads/places/..\\secret.txt")]
    [InlineData("/uploads/places/sub/a.jpg")]
    [InlineData("/uploads/places/")]
    [InlineData("https://example.com/a.jpg")]
    public void ResolvePath_RejectsPathsOutsideImageFolder(string url)
    {
        Assert.Null(new LocalImageStorage(_root).ResolvePath(url));
    }
}
