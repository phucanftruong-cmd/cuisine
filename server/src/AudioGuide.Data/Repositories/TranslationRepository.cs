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

    public async Task<Translation> AddAsync(Translation translation)
    {
        _db.Translations.Add(translation);
        await _db.SaveChangesAsync();
        return translation;
    }
}