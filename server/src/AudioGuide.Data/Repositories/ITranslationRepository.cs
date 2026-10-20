using AudioGuide.Data.Entities;

namespace AudioGuide.Data.Repositories;

public interface ITranslationRepository
{
    Task<Translation?> GetAsync(int placeId, string languageCode);
    Task<Translation> AddAsync(Translation translation);
}