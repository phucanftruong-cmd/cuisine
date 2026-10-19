namespace AudioGuide.Business.Dtos;

public record PlaceDto(int Id, string Name, string Description, DateTime CreatedAt);

public record CreatePlaceDto(string Name, string Description);

public record UpdatePlaceDto(string Name, string Description);