namespace AudioGuide.Business.Providers;

public class LocalImageStorage : IImageStorage
{
    // Server phục vụ thư mục uploads tại /uploads; ảnh món nằm trong thư mục con "places"
    public const string UrlPrefix = "/uploads/places/";

    private readonly string _directory;

    public LocalImageStorage(string uploadsRoot)
    {
        _directory = Path.GetFullPath(Path.Combine(uploadsRoot, "places"));
    }

    public async Task<string> SaveAsync(byte[] content, string extension)
    {
        Directory.CreateDirectory(_directory);
        // Tên file ngẫu nhiên: không đoán được, không trùng, không lấy gì từ tên file người dùng gửi
        var fileName = $"{Guid.NewGuid():N}.{extension}";
        await File.WriteAllBytesAsync(Path.Combine(_directory, fileName), content);
        return UrlPrefix + fileName;
    }

    public Task DeleteAsync(string url)
    {
        var path = ResolvePath(url);
        if (path is not null && File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }

    // Chỉ nhận đúng dạng /uploads/places/<tên file>, không cho thoát ra ngoài thư mục ảnh
    public string? ResolvePath(string url)
    {
        if (!url.StartsWith(UrlPrefix, StringComparison.Ordinal)) return null;
        var fileName = url[UrlPrefix.Length..];
        if (fileName.Length == 0 || fileName != Path.GetFileName(fileName) || fileName.Contains("..")) return null;

        var path = Path.GetFullPath(Path.Combine(_directory, fileName));
        return Path.GetDirectoryName(path) == _directory ? path : null;
    }
}
