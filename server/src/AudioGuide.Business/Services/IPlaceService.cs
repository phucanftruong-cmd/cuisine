using AudioGuide.Business.Dtos;

namespace AudioGuide.Business.Services;

public interface IPlaceService
{
    Task<List<PlaceDto>> GetAllAsync();
    Task<PlaceDto?> GetByIdAsync(int id);
    Task<PlaceDto> CreateAsync(CreatePlaceDto dto);
    Task<PlaceDto?> UpdateAsync(int id, UpdatePlaceDto dto);
    Task<bool> DeleteAsync(int id);
}