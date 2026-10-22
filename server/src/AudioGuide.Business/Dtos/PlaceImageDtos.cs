namespace AudioGuide.Business.Dtos;

public record PlaceImageDto(int Id, string Url, string? Caption, int SortOrder, bool IsCover);

// Toàn bộ ảnh của quán kèm ảnh bìa hiện tại. Mọi thao tác thêm/sửa/xóa đều trả về object này
// để client thay hết một lần, không phải tự suy ra ảnh bìa mới.
public record PlaceGalleryDto(string? CoverUrl, List<PlaceImageDto> Images);

public record UpdatePlaceImageDto(string? Caption);

public record ReorderPlaceImagesDto(List<int> ImageIds);
