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

    public Task<List<Place>> GetAllAsync() =>
        _db.Places.AsNoTracking().ToListAsync();

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
}