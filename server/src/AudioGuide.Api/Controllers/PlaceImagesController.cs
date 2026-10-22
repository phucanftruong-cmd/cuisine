using AudioGuide.Business.Dtos;
using AudioGuide.Business.Services;
using AudioGuide.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AudioGuide.Api.Controllers;

// Ảnh món ăn của quán. Khách xem; Admin tải lên, sửa tên món, đổi thứ tự, chọn ảnh bìa, xóa.
[ApiController]
[Route("api/places/{placeId:int}/images")]
public class PlaceImagesController : ControllerBase
{
    // Chừa thêm chỗ cho phần đầu/cuối của form multipart ngoài file 5 MB
    private const long MaxRequestBytes = PlaceImageService.MaxFileBytes + 1024 * 1024;

    private readonly IPlaceImageService _service;

    public PlaceImagesController(IPlaceImageService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<PlaceGalleryDto>> Get(int placeId) =>
        OkOrNotFound(await _service.GetAsync(placeId));

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    [RequestSizeLimit(MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxRequestBytes)]
    public async Task<ActionResult<PlaceGalleryDto>> Upload(int placeId, IFormFile? file, [FromForm] string? caption)
    {
        if (file is null)
            throw new ArgumentException("Chưa chọn file ảnh.");

        await using var stream = file.OpenReadStream();
        return OkOrNotFound(await _service.UploadAsync(placeId, stream, file.Length, caption));
    }

    [HttpPut("{imageId:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PlaceGalleryDto>> Update(int placeId, int imageId, UpdatePlaceImageDto dto) =>
        OkOrNotFound(await _service.UpdateAsync(placeId, imageId, dto));

    [HttpPut("order")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PlaceGalleryDto>> Reorder(int placeId, ReorderPlaceImagesDto dto) =>
        OkOrNotFound(await _service.ReorderAsync(placeId, dto));

    [HttpPut("{imageId:int}/cover")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PlaceGalleryDto>> SetCover(int placeId, int imageId) =>
        OkOrNotFound(await _service.SetCoverAsync(placeId, imageId));

    [HttpDelete("{imageId:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PlaceGalleryDto>> Delete(int placeId, int imageId) =>
        OkOrNotFound(await _service.DeleteAsync(placeId, imageId));

    private ActionResult<PlaceGalleryDto> OkOrNotFound(PlaceGalleryDto? gallery) =>
        gallery is null ? NotFound() : Ok(gallery);
}
