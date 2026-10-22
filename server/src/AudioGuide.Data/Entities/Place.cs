namespace AudioGuide.Data.Entities;

public class Place
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    // Nội dung thuyết minh gốc (tiếng Việt)
    public string Description { get; set; } = string.Empty;

    public string? Address { get; set; }
    public string? Ward { get; set; }
    public string? Category { get; set; }

    // Giá một người, đơn vị VND
    public int? PriceMin { get; set; }
    public int? PriceMax { get; set; }

    public string? OpeningHours { get; set; }
    public string? Phone { get; set; }
    public string? ImageUrl { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    // Chuỗi đã bỏ dấu, viết thường để tìm kiếm
    public string SearchText { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}