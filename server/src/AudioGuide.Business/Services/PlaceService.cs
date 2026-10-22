using AudioGuide.Business.Dtos;
using AudioGuide.Business.Providers;
using AudioGuide.Data.Entities;
using AudioGuide.Data.Repositories;

namespace AudioGuide.Business.Services;

public class PlaceService : IPlaceService
{
    private const int MaxPageSize = 50;
    private const int MaxSearchTerms = 5;

    // Giới hạn độ dài dữ liệu nhập (frontend dùng cùng các con số này)
    public const int MaxNameLength = 200;
    public const int MaxDescriptionLength = 5000;
    public const int MaxShortTextLength = 300;
    public const int MaxLabelLength = 100;
    public const int MaxPhoneLength = 30;
    public const int MaxUrlLength = 1000;

    private readonly IPlaceRepository _repo;
    private readonly ITranslationRepository _translations;
    private readonly IPlaceImageRepository _images;
    private readonly IImageStorage _storage;

    public PlaceService(
        IPlaceRepository repo, ITranslationRepository translations,
        IPlaceImageRepository images, IImageStorage storage)
    {
        _repo = repo;
        _translations = translations;
        _images = images;
        _storage = storage;
    }

    public async Task<PagedResultDto<PlaceDto>> SearchAsync(PlaceQueryDto query)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var terms = TextNormalizer.ToSearchKey(query.Search)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Take(MaxSearchTerms)
            .ToArray();

        var filter = new PlaceFilter(
            terms, CleanText(query.Category), CleanText(query.Ward), query.MaxPrice, page, pageSize);

        var result = await _repo.SearchAsync(filter);
        return new PagedResultDto<PlaceDto>(result.Items.Select(ToDto).ToList(), result.Total, page, pageSize);
    }

    public async Task<PlaceFiltersDto> GetFiltersAsync() =>
        new(await _repo.GetCategoriesAsync(), await _repo.GetWardsAsync());

    public async Task<PlaceDto?> GetByIdAsync(int id)
    {
        var place = await _repo.GetByIdAsync(id);
        return place is null ? null : ToDto(place);
    }

    public async Task<PlaceDto> CreateAsync(CreatePlaceDto dto)
    {
        var fields = Clean(dto.Name, dto.Description, dto.Address, dto.Ward, dto.Category,
            dto.PriceMin, dto.PriceMax, dto.OpeningHours, dto.Phone, dto.ImageUrl,
            dto.Latitude, dto.Longitude);

        var place = new Place();
        Apply(place, fields);

        await _repo.AddAsync(place);
        return ToDto(place);
    }

    public async Task<PlaceDto?> UpdateAsync(int id, UpdatePlaceDto dto)
    {
        var fields = Clean(dto.Name, dto.Description, dto.Address, dto.Ward, dto.Category,
            dto.PriceMin, dto.PriceMax, dto.OpeningHours, dto.Phone, dto.ImageUrl,
            dto.Latitude, dto.Longitude);

        var place = await _repo.GetByIdAsync(id);
        if (place is null) return null;

        var descriptionChanged = place.Description != fields.Description;

        Apply(place, fields);
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

        // Database tự xóa các dòng ảnh theo quán; file ảnh thì phải xóa tay
        var images = await _images.GetByPlaceIdAsync(id);
        await _repo.DeleteAsync(place);
        foreach (var image in images)
            await _storage.DeleteAsync(image.Url);
        return true;
    }

    public async Task SeedSampleDataAsync()
    {
        if (await _repo.AnyAsync()) return;

        foreach (var sample in Samples)
        {
            var fields = Clean(sample.Name, sample.Description, sample.Address, sample.Ward, sample.Category,
                sample.PriceMin, sample.PriceMax, sample.OpeningHours, sample.Phone, sample.ImageUrl,
                sample.Latitude, sample.Longitude);

            var place = new Place();
            Apply(place, fields);
            await _repo.AddAsync(place);
        }
    }

    // ---- Dữ liệu mẫu (không phải quán thật, hãy thay bằng dữ liệu khảo sát) ----
    private const string SampleNote =
        "Dữ liệu mẫu để thử giao diện, không phải quán thật. Hãy thay bằng thông tin bạn đã khảo sát.";

    private static readonly CreatePlaceDto[] Samples =
    {
        new("[Mẫu] Phở bò", SampleNote, "Địa chỉ mẫu số 1, Quận 6, TP.HCM", "Phường mẫu 1", "Phở",
            40000, 70000, "06:00 - 21:00", null, null, 10.7465, 106.6350),
        new("[Mẫu] Bún thịt nướng", SampleNote, "Địa chỉ mẫu số 2, Quận 6, TP.HCM", "Phường mẫu 1", "Bún",
            30000, 50000, "07:00 - 20:00", null, null, 10.7472, 106.6361),
        new("[Mẫu] Cơm tấm sườn", SampleNote, "Địa chỉ mẫu số 3, Quận 6, TP.HCM", "Phường mẫu 2", "Cơm tấm",
            35000, 60000, "06:30 - 22:00", null, null, 10.7458, 106.6342),
        new("[Mẫu] Cà phê sữa đá", SampleNote, "Địa chỉ mẫu số 4, Quận 6, TP.HCM", "Phường mẫu 2", "Cà phê",
            20000, 45000, "06:00 - 23:00", null, null, 10.7481, 106.6370),
        new("[Mẫu] Ăn vặt chiều", SampleNote, "Địa chỉ mẫu số 5, Quận 6, TP.HCM", "Phường mẫu 3", "Ăn vặt",
            10000, 30000, "15:00 - 22:00", null, null, 10.7449, 106.6335),
    };

    // ---- Kiểm tra và chuẩn hóa dữ liệu nhập ----
    private sealed record PlaceFields(
        string Name, string Description, string? Address, string? Ward, string? Category,
        int? PriceMin, int? PriceMax, string? OpeningHours, string? Phone, string? ImageUrl,
        double? Latitude, double? Longitude);

    private static PlaceFields Clean(
        string name, string description, string? address, string? ward, string? category,
        int? priceMin, int? priceMax, string? openingHours, string? phone, string? imageUrl,
        double? latitude, double? longitude)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên địa điểm không được để trống.");
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Nội dung thuyết minh không được để trống.");

        CheckLength(name, MaxNameLength, "Tên địa điểm");
        CheckLength(description, MaxDescriptionLength, "Nội dung thuyết minh");
        CheckLength(address, MaxShortTextLength, "Địa chỉ");
        CheckLength(ward, MaxLabelLength, "Phường");
        CheckLength(category, MaxLabelLength, "Loại món");
        CheckLength(openingHours, MaxLabelLength, "Giờ mở cửa");
        CheckLength(phone, MaxPhoneLength, "Số điện thoại");
        CheckLength(imageUrl, MaxUrlLength, "Link ảnh");

        if (priceMin < 0 || priceMax < 0)
            throw new ArgumentException("Giá không được âm.");
        if (priceMin > priceMax)
            throw new ArgumentException("Giá thấp nhất không được lớn hơn giá cao nhất.");

        if ((latitude is null) != (longitude is null))
            throw new ArgumentException("Cần nhập cả vĩ độ và kinh độ, hoặc để trống cả hai.");
        if (latitude is < -90 or > 90)
            throw new ArgumentException("Vĩ độ phải nằm trong khoảng từ -90 đến 90.");
        if (longitude is < -180 or > 180)
            throw new ArgumentException("Kinh độ phải nằm trong khoảng từ -180 đến 180.");

        // Ảnh bìa: link http(s) bên ngoài, hoặc ảnh đã tải lên server (/uploads/places/...)
        var image = CleanText(imageUrl);
        if (image is not null &&
            !(image.StartsWith(LocalImageStorage.UrlPrefix, StringComparison.Ordinal) && !image.Contains("..")) &&
            !(Uri.TryCreate(image, UriKind.Absolute, out var uri) &&
              (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)))
            throw new ArgumentException("Link ảnh phải là địa chỉ http hoặc https hợp lệ.");

        return new PlaceFields(
            name.Trim(), description.Trim(), CleanText(address), CleanText(ward), CleanText(category),
            priceMin, priceMax, CleanText(openingHours), CleanText(phone), image, latitude, longitude);
    }

    private static void CheckLength(string? value, int max, string label)
    {
        if (value is not null && value.Trim().Length > max)
            throw new ArgumentException($"{label} tối đa {max} ký tự.");
    }

    private static void Apply(Place place, PlaceFields f)
    {
        place.Name = f.Name;
        place.Description = f.Description;
        place.Address = f.Address;
        place.Ward = f.Ward;
        place.Category = f.Category;
        place.PriceMin = f.PriceMin;
        place.PriceMax = f.PriceMax;
        place.OpeningHours = f.OpeningHours;
        place.Phone = f.Phone;
        place.ImageUrl = f.ImageUrl;
        place.Latitude = f.Latitude;
        place.Longitude = f.Longitude;

        var searchable = new[] { f.Name, f.Address, f.Ward, f.Category, f.Description }
            .Where(s => !string.IsNullOrWhiteSpace(s));
        place.SearchText = TextNormalizer.ToSearchKey(string.Join(' ', searchable));
    }

    private static string? CleanText(string? text) =>
        string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    private static PlaceDto ToDto(Place p) =>
        new(p.Id, p.Name, p.Description, p.Address, p.Ward, p.Category, p.PriceMin, p.PriceMax,
            p.OpeningHours, p.Phone, p.ImageUrl, p.Latitude, p.Longitude, p.CreatedAt);
}