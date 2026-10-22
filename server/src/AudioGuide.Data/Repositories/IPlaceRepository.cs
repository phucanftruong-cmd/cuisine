using AudioGuide.Data.Entities;

namespace AudioGuide.Data.Repositories;

public record PlaceFilter(
    string[] SearchTerms,
    string? Category,
    string? Ward,
    int? MaxPrice,
    int Page,
    int PageSize);

public record PlaceSearchResult(List<Place> Items, int Total);

public interface IPlaceRepository
{
    Task<PlaceSearchResult> SearchAsync(PlaceFilter filter);
    Task<List<string>> GetCategoriesAsync();
    Task<List<string>> GetWardsAsync();
    Task<bool> AnyAsync();
    Task<Place?> GetByIdAsync(int id);
    Task<Place> AddAsync(Place place);
    Task UpdateAsync(Place place);
    Task DeleteAsync(Place place);
}