using AudioGuide.Data.Entities;

namespace AudioGuide.Data.Repositories;

public interface IPlaceImageRepository
{
    // Ảnh của quán, sắp theo thứ tự hiển thị
    Task<List<PlaceImage>> GetByPlaceIdAsync(int placeId);
    Task<PlaceImage> AddAsync(PlaceImage image);
    Task UpdateRangeAsync(IEnumerable<PlaceImage> images);
    Task DeleteAsync(PlaceImage image);
}
