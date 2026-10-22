using AudioGuide.Business.Dtos;
using AudioGuide.Business.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AudioGuide.Api.Controllers;

[ApiController]
[Route("api/places/{placeId:int}/translations")]
public class PlaceTranslationsController : ControllerBase
{
    private readonly IPlaceTranslationService _service;

    public PlaceTranslationsController(IPlaceTranslationService service)
    {
        _service = service;
    }

    [HttpGet("{lang}")]
    public async Task<ActionResult<TranslationDto>> Get(int placeId, string lang)
    {
        var result = await _service.GetOrTranslateAsync(placeId, lang);
        return result is null ? NotFound() : Ok(result);
    }

    // Admin xem các bản dịch đã lưu của địa điểm
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<List<TranslationDto>>> GetCached(int placeId)
    {
        var result = await _service.GetCachedAsync(placeId);
        return result is null ? NotFound() : Ok(result);
    }

    // Admin xóa bản dịch đã lưu để lần sau dịch lại
    [HttpDelete]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> ClearCache(int placeId) =>
        await _service.ClearCacheAsync(placeId) ? NoContent() : NotFound();
}
