namespace AudioGuide.Business.Providers;

// Nơi lưu file ảnh món ăn. Hiện lưu trong thư mục trên server (LocalImageStorage);
// sau này chuyển lên dịch vụ lưu trữ khác chỉ cần viết implementation mới.
public interface IImageStorage
{
    // Lưu ảnh, trả về đường dẫn công khai (ví dụ /uploads/places/abc.jpg)
    Task<string> SaveAsync(byte[] content, string extension);

    // Xóa ảnh theo đường dẫn công khai. Đường dẫn không do kho này tạo ra thì bỏ qua.
    Task DeleteAsync(string url);
}
