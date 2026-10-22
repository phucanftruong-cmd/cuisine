namespace AudioGuide.Business.Dtos;

public record PlaceDto(
    int Id,
    string Name,
    string Description,
    string? Address,
    string? Ward,
    string? Category,
    int? PriceMin,
    int? PriceMax,
    string? OpeningHours,
    string? Phone,
    string? ImageUrl,
    double? Latitude,
    double? Longitude,
    DateTime CreatedAt);

public record CreatePlaceDto(
    string Name,
    string Description,
    string? Address = null,
    string? Ward = null,
    string? Category = null,
    int? PriceMin = null,
    int? PriceMax = null,
    string? OpeningHours = null,
    string? Phone = null,
    string? ImageUrl = null,
    double? Latitude = null,
    double? Longitude = null);

public record UpdatePlaceDto(
    string Name,
    string Description,
    string? Address = null,
    string? Ward = null,
    string? Category = null,
    int? PriceMin = null,
    int? PriceMax = null,
    string? OpeningHours = null,
    string? Phone = null,
    string? ImageUrl = null,
    double? Latitude = null,
    double? Longitude = null);

public class PlaceQueryDto
{
    public string? Search { get; set; }
    public string? Category { get; set; }
    public string? Ward { get; set; }
    public int? MaxPrice { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}

public record PagedResultDto<T>(List<T> Items, int Total, int Page, int PageSize)
{
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(Total / (double)PageSize);
}

public record PlaceFiltersDto(List<string> Categories, List<string> Wards);