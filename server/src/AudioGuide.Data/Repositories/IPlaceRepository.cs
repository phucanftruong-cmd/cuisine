using AudioGuide.Data.Entities;

namespace AudioGuide.Data.Repositories;

public interface IPlaceRepository
{
    Task<List<Place>> GetAllAsync();
    Task<Place?> GetByIdAsync(int id);
    Task<Place> AddAsync(Place place);
    Task UpdateAsync(Place place);
    Task DeleteAsync(Place place);
}