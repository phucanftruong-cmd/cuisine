using AudioGuide.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AudioGuide.Data.Repositories;

public class TranslationRepository : ITranslationRepository
{
    private readonly AppDbContext _db;

    public TranslationRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<Translation?> GetAsync(int placeId, string languageCode) =>
        _db.Translations.AsNoTracking()
            .FirstOrDefaultAsync(t => t.PlaceId == placeId && t.LanguageCode == languageCode);

    public Task<List<Translation>> GetByPlaceIdAsync(int placeId) =>
        _db.Translations.AsNoTracking()
            .Where(t => t.PlaceId == placeId)
            .OrderBy(t => t.LanguageCode)
            .ToListAsync();

    public async Task<Translation> AddAsync(Translation translation)
    {
        _db.Translations.Add(translation);
        try
        {
            await _db.SaveChangesAsync();
            return translation;
        }
        catch (DbUpdateException)
        {
            // Hai request cùng dịch một địa điểm sang cùng một ngôn ngữ:
            // request kia lưu trước nên request này vi phạm unique index (PlaceId, LanguageCode).
            // Bỏ bản của mình và dùng bản đã có.
            _db.Entry(translation).State = EntityState.Detached;

            var existing = await GetAsync(translation.PlaceId, translation.LanguageCode);
            if (existing is null) throw;
            return existing;
        }
    }

    public Task DeleteByPlaceIdAsync(int placeId) =>
        _db.Translations.Where(t => t.PlaceId == placeId).ExecuteDeleteAsync();
}
