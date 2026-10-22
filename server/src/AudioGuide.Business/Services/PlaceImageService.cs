using AudioGuide.Business.Dtos;
using AudioGuide.Business.Providers;
using AudioGuide.Data.Entities;
using AudioGuide.Data.Repositories;

namespace AudioGuide.Business.Services;

public class PlaceImageService : IPlaceImageService
{
    // Giới hạn (frontend dùng cùng các con số này)
    public const int MaxFileBytes = 5 * 1024 * 1024;
    public const int MaxImagesPerPlace = 20;
    public const int MaxCaptionLength = 100;

    private readonly IPlaceRepository _places;
    private readonly IPlaceImageRepository _images;
    private readonly IImageStorage _storage;

    public PlaceImageService(IPlaceRepository places, IPlaceImageRepository images, IImageStorage storage)
    {
        _places = places;
        _images = images;
        _storage = storage;
    }

    public async Task<PlaceGalleryDto?> GetAsync(int placeId)
    {
        var place = await _places.GetByIdAsync(placeId);
        return place is null ? null : ToDto(place, await _images.GetByPlaceIdAsync(placeId));
    }

    public async Task<PlaceGalleryDto?> UploadAsync(int placeId, Stream content, long length, string? caption)
    {
        var cleanCaption = CleanCaption(caption);
        if (length <= 0)
            throw new ArgumentException("File ảnh trống.");
        if (length > MaxFileBytes)
            throw new ArgumentException($"Ảnh tối đa {MaxFileBytes / 1024 / 1024} MB.");

        var place = await _places.GetByIdAsync(placeId);
        if (place is null) return null;

        var images = await _images.GetByPlaceIdAsync(placeId);
        if (images.Count >= MaxImagesPerPlace)
            throw new ArgumentException($"Mỗi quán có tối đa {MaxImagesPerPlace} ảnh. Hãy xóa bớt ảnh cũ.");

        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer);
        var bytes = buffer.ToArray();
        // Không tin tên file hay Content-Type do trình duyệt gửi: xem nội dung file
        var extension = DetectImageType(bytes)
            ?? throw new ArgumentException("File không phải ảnh JPG, PNG hoặc WebP.");

        var url = await _storage.SaveAsync(bytes, extension);
        try
        {
            await _images.AddAsync(new PlaceImage
            {
                PlaceId = placeId,
                Url = url,
                Caption = cleanCaption,
                SortOrder = images.Count == 0 ? 0 : images.Max(i => i.SortOrder) + 1
            });
        }
        catch
        {
            // Không lưu được vào database thì bỏ luôn file vừa ghi
            await _storage.DeleteAsync(url);
            throw;
        }

        // Quán chưa có ảnh bìa: ảnh đầu tiên thành ảnh bìa
        if (string.IsNullOrWhiteSpace(place.ImageUrl))
        {
            place.ImageUrl = url;
            await _places.UpdateAsync(place);
        }

        return ToDto(place, await _images.GetByPlaceIdAsync(placeId));
    }

    public async Task<PlaceGalleryDto?> UpdateAsync(int placeId, int imageId, UpdatePlaceImageDto dto)
    {
        var caption = CleanCaption(dto.Caption);
        var place = await _places.GetByIdAsync(placeId);
        if (place is null) return null;

        var images = await _images.GetByPlaceIdAsync(placeId);
        var image = images.FirstOrDefault(i => i.Id == imageId);
        if (image is null) return null;

        image.Caption = caption;
        await _images.UpdateRangeAsync(new[] { image });
        return ToDto(place, images);
    }

    public async Task<PlaceGalleryDto?> ReorderAsync(int placeId, ReorderPlaceImagesDto dto)
    {
        var place = await _places.GetByIdAsync(placeId);
        if (place is null) return null;

        var images = await _images.GetByPlaceIdAsync(placeId);
        var ids = dto.ImageIds ?? new List<int>();
        // Phải gửi đủ và đúng các ảnh hiện có (tránh ghi đè khi người khác vừa thêm/xóa ảnh)
        if (ids.Count != images.Count || ids.Distinct().Count() != ids.Count ||
            !ids.All(id => images.Any(i => i.Id == id)))
            throw new ArgumentException("Danh sách ảnh đã thay đổi, vui lòng tải lại trang.");

        foreach (var image in images)
            image.SortOrder = ids.IndexOf(image.Id);
        await _images.UpdateRangeAsync(images);

        return ToDto(place, images.OrderBy(i => i.SortOrder).ToList());
    }

    public async Task<PlaceGalleryDto?> SetCoverAsync(int placeId, int imageId)
    {
        var place = await _places.GetByIdAsync(placeId);
        if (place is null) return null;

        var images = await _images.GetByPlaceIdAsync(placeId);
        var image = images.FirstOrDefault(i => i.Id == imageId);
        if (image is null) return null;

        place.ImageUrl = image.Url;
        await _places.UpdateAsync(place);
        return ToDto(place, images);
    }

    public async Task<PlaceGalleryDto?> DeleteAsync(int placeId, int imageId)
    {
        var place = await _places.GetByIdAsync(placeId);
        if (place is null) return null;

        var images = await _images.GetByPlaceIdAsync(placeId);
        var image = images.FirstOrDefault(i => i.Id == imageId);
        if (image is null) return null;

        await _images.DeleteAsync(image);
        images.Remove(image);

        // Xóa đúng ảnh bìa: chuyển bìa sang ảnh đầu tiên còn lại (hết ảnh thì bỏ bìa)
        if (place.ImageUrl == image.Url)
        {
            place.ImageUrl = images.FirstOrDefault()?.Url;
            await _places.UpdateAsync(place);
        }

        await _storage.DeleteAsync(image.Url);
        return ToDto(place, images);
    }

    // Nhận diện ảnh theo vài byte đầu file. Trả về đuôi file, hoặc null nếu không phải ảnh được hỗ trợ.
    public static string? DetectImageType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
            return "jpg";
        if (bytes.Length >= 8 && bytes[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return "png";
        if (bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8))
            return "webp";
        return null;
    }

    private static string? CleanCaption(string? caption)
    {
        if (string.IsNullOrWhiteSpace(caption)) return null;
        var trimmed = caption.Trim();
        if (trimmed.Length > MaxCaptionLength)
            throw new ArgumentException($"Tên món tối đa {MaxCaptionLength} ký tự.");
        return trimmed;
    }

    private static PlaceGalleryDto ToDto(Place place, List<PlaceImage> images) =>
        new(place.ImageUrl,
            images.Select(i => new PlaceImageDto(i.Id, i.Url, i.Caption, i.SortOrder, i.Url == place.ImageUrl)).ToList());
}
