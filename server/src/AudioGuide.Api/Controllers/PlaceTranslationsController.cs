using AudioGuide.Business.Dtos;
using AudioGuide.Business.Services;
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
}