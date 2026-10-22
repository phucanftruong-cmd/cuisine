using AudioGuide.Business.Dtos;

namespace AudioGuide.Business.Services;

// Ảnh món ăn của quán. Các hàm trả về null khi quán (hoặc ảnh) không tồn tại.
public interface IPlaceImageService
{
    Task<PlaceGalleryDto?> GetAsync(int placeId);
    Task<PlaceGalleryDto?> UploadAsync(int placeId, Stream content, long length, string? caption);
    Task<PlaceGalleryDto?> UpdateAsync(int placeId, int imageId, UpdatePlaceImageDto dto);
    Task<PlaceGalleryDto?> ReorderAsync(int placeId, ReorderPlaceImagesDto dto);
    Task<PlaceGalleryDto?> SetCoverAsync(int placeId, int imageId);
    Task<PlaceGalleryDto?> DeleteAsync(int placeId, int imageId);
}
