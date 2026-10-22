namespace AudioGuide.Data.Entities;

// Ảnh món ăn của một quán (file nằm trong thư mục uploads của server)
public class PlaceImage
{
    public int Id { get; set; }
    public int PlaceId { get; set; }
    public Place? Place { get; set; }

    // Đường dẫn tương đối, ví dụ /uploads/places/abc.jpg
    public string Url { get; set; } = string.Empty;

    // Tên món (giữ nguyên, không dịch)
    public string? Caption { get; set; }

    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
