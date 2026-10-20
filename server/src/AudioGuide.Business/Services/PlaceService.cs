using AudioGuide.Business.Dtos;
using AudioGuide.Data.Entities;
using AudioGuide.Data.Repositories;

namespace AudioGuide.Business.Services;

public class PlaceService : IPlaceService
{
    private readonly IPlaceRepository _repo;
    private readonly ITranslationRepository _translations;

    public PlaceService(IPlaceRepository repo, ITranslationRepository translations)
    {
        _repo = repo;
        _translations = translations;
    }

    public async Task<List<PlaceDto>> GetAllAsync()
    {
        var places = await _repo.GetAllAsync();
        return places.Select(ToDto).ToList();
    }

    public async Task<PlaceDto?> GetByIdAsync(int id)
    {
        var place = await _repo.GetByIdAsync(id);
        return place is null ? null : ToDto(place);
    }

    public async Task<PlaceDto> CreateAsync(CreatePlaceDto dto)
    {
        Validate(dto.Name, dto.Description);

        var place = new Place
        {
            Name = dto.Name.Trim(),
            Description = dto.Description.Trim()
        };

        await _repo.AddAsync(place);
        return ToDto(place);
    }

    public async Task<PlaceDto?> UpdateAsync(int id, UpdatePlaceDto dto)
    {
        Validate(dto.Name, dto.Description);

        var place = await _repo.GetByIdAsync(id);
        if (place is null) return null;

        var newDescription = dto.Description.Trim();
        var descriptionChanged = place.Description != newDescription;

        place.Name = dto.Name.Trim();
        place.Description = newDescription;

        await _repo.UpdateAsync(place);

        // Nội dung gốc đổi thì các bản dịch cũ không còn đúng nữa
        if (descriptionChanged)
            await _translations.DeleteByPlaceIdAsync(id);

        return ToDto(place);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var place = await _repo.GetByIdAsync(id);
        if (place is null) return false;

        await _repo.DeleteAsync(place);
        return true;
    }

    private static void Validate(string name, string description)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên địa điểm không được để trống.");
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Nội dung thuyết minh không được để trống.");
    }

    private static PlaceDto ToDto(Place p) =>
        new(p.Id, p.Name, p.Description, p.CreatedAt);
}