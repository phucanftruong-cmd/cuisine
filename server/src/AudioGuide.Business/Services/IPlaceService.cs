using AudioGuide.Business.Dtos;

namespace AudioGuide.Business.Services;

public interface IPlaceService
{
    Task<PagedResultDto<PlaceDto>> SearchAsync(PlaceQueryDto query);
    Task<PlaceFiltersDto> GetFiltersAsync();
    Task<PlaceDto?> GetByIdAsync(int id);
    Task<PlaceDto> CreateAsync(CreatePlaceDto dto);
    Task<PlaceDto?> UpdateAsync(int id, UpdatePlaceDto dto);
    Task<bool> DeleteAsync(int id);

    // Nạp vài quán mẫu nếu database chưa có quán nào
    Task SeedSampleDataAsync();
}