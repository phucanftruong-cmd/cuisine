using AudioGuide.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AudioGuide.Data.Repositories;

public class PlaceRepository : IPlaceRepository
{
    private readonly AppDbContext _db;

    public PlaceRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PlaceSearchResult> SearchAsync(PlaceFilter filter)
    {
        var query = _db.Places.AsNoTracking().AsQueryable();

        // Mọi từ khóa đều phải xuất hiện (AND)
        foreach (var term in filter.SearchTerms)
        {
            var pattern = $"%{EscapeLike(term)}%";
            query = query.Where(p => EF.Functions.Like(p.SearchText, pattern, "\\"));
        }

        if (!string.IsNullOrEmpty(filter.Category))
            query = query.Where(p => p.Category == filter.Category);

        if (!string.IsNullOrEmpty(filter.Ward))
            query = query.Where(p => p.Ward == filter.Ward);

        if (filter.MaxPrice is int maxPrice)
            query = query.Where(p => p.PriceMin != null && p.PriceMin <= maxPrice);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(p => p.Id)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return new PlaceSearchResult(items, total);
    }

    public Task<List<string>> GetCategoriesAsync() =>
        _db.Places.AsNoTracking()
            .Where(p => p.Category != null)
            .Select(p => p.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

    public Task<List<string>> GetWardsAsync() =>
        _db.Places.AsNoTracking()
            .Where(p => p.Ward != null)
            .Select(p => p.Ward!)
            .Distinct()
            .OrderBy(w => w)
            .ToListAsync();

    public Task<bool> AnyAsync() => _db.Places.AnyAsync();

    public Task<Place?> GetByIdAsync(int id) =>
        _db.Places.FirstOrDefaultAsync(p => p.Id == id);

    public async Task<Place> AddAsync(Place place)
    {
        _db.Places.Add(place);
        await _db.SaveChangesAsync();
        return place;
    }

    public async Task UpdateAsync(Place place)
    {
        _db.Places.Update(place);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Place place)
    {
        _db.Places.Remove(place);
        await _db.SaveChangesAsync();
    }

    private static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}