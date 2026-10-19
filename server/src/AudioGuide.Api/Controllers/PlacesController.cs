using AudioGuide.Business.Dtos;
using AudioGuide.Business.Services;
using Microsoft.AspNetCore.Mvc;

namespace AudioGuide.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlacesController : ControllerBase
{
    private readonly IPlaceService _service;

    public PlacesController(IPlaceService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<PlaceDto>>> GetAll() =>
        Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PlaceDto>> GetById(int id)
    {
        var place = await _service.GetByIdAsync(id);
        return place is null ? NotFound() : Ok(place);
    }

    [HttpPost]
    public async Task<ActionResult<PlaceDto>> Create(CreatePlaceDto dto)
    {
        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PlaceDto>> Update(int id, UpdatePlaceDto dto)
    {
        var updated = await _service.UpdateAsync(id, dto);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id) =>
        await _service.DeleteAsync(id) ? NoContent() : NotFound();
}