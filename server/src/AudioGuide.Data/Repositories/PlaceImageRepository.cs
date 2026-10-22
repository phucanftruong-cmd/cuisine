using AudioGuide.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AudioGuide.Data.Repositories;

public class PlaceImageRepository : IPlaceImageRepository
{
    private readonly AppDbContext _db;

    public PlaceImageRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<PlaceImage>> GetByPlaceIdAsync(int placeId) =>
        _db.PlaceImages.AsNoTracking()
            .Where(i => i.PlaceId == placeId)
            .OrderBy(i => i.SortOrder).ThenBy(i => i.Id)
            .ToListAsync();

    public async Task<PlaceImage> AddAsync(PlaceImage image)
    {
        _db.PlaceImages.Add(image);
        await _db.SaveChangesAsync();
        return image;
    }

    public async Task UpdateRangeAsync(IEnumerable<PlaceImage> images)
    {
        _db.PlaceImages.UpdateRange(images);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(PlaceImage image)
    {
        _db.PlaceImages.Remove(image);
        await _db.SaveChangesAsync();
    }
}
