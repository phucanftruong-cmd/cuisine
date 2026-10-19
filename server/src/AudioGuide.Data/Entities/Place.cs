namespace AudioGuide.Data.Entities;

public class Place
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    // Nội dung thuyết minh gốc (tiếng Việt)
    public string Description { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}