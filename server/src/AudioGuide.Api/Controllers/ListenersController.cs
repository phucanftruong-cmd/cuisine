using AudioGuide.Business.Dtos;
using AudioGuide.Business.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AudioGuide.Api.Controllers;

[ApiController]
[Route("api/listeners")]
public class ListenersController : ControllerBase
{
    private readonly IListenerService _service;

    public ListenersController(IListenerService service)
    {
        _service = service;
    }

    // Trang quán gọi lặp lại khi đang phát thuyết minh
    [HttpPost("heartbeat")]
    public IActionResult Heartbeat(ListenerHeartbeatDto dto)
    {
        _service.Heartbeat(dto);
        return NoContent();
    }

    // Dừng nghe / rời trang. deviceId nằm trên URL vì trình duyệt gửi bằng sendBeacon
    // (gửi JSON khác origin sẽ bị chặn khi đang đóng trang)
    [HttpPost("leave")]
    public IActionResult Leave([FromQuery] string deviceId)
    {
        _service.Leave(deviceId);
        return NoContent();
    }

    // Dashboard admin hỏi số thiết bị đang nghe
    [HttpGet("stats")]
    [Authorize(Roles = Roles.Admin)]
    public ActionResult<ListenerStatsDto> Stats() => Ok(_service.GetStats());
}
