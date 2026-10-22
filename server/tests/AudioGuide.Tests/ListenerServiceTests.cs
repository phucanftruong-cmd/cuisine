using AudioGuide.Business.Dtos;
using AudioGuide.Business.Services;

namespace AudioGuide.Tests;

public class ListenerServiceTests
{
    // Đồng hồ giả để thử phần hết hạn mà không phải chờ thật
    private class FakeTime : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 1, 1, 8, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private readonly FakeTime _time = new();
    private readonly ListenerService _service;

    public ListenerServiceTests()
    {
        _service = new ListenerService(_time);
    }

    [Fact]
    public void FourDevices_CountsFour()
    {
        _service.Heartbeat(new ListenerHeartbeatDto("a", 1, "vi"));
        _service.Heartbeat(new ListenerHeartbeatDto("b", 1, "en"));
        _service.Heartbeat(new ListenerHeartbeatDto("c", 2, "en"));
        _service.Heartbeat(new ListenerHeartbeatDto("d", 3, "ja"));

        var stats = _service.GetStats();

        Assert.Equal(4, stats.ActiveDevices);
        Assert.Equal(new PlaceListenerCountDto(1, 2), stats.ByPlace[0]);
        Assert.Equal(new LanguageListenerCountDto("en", 2), stats.ByLanguage[0]);
    }

    [Fact]
    public void SameDeviceRepeated_CountsOnce_AndKeepsLatestPlaceAndLanguage()
    {
        _service.Heartbeat(new ListenerHeartbeatDto("a", 1, "vi"));
        _service.Heartbeat(new ListenerHeartbeatDto("a", 2, "FR"));

        var stats = _service.GetStats();

        Assert.Equal(1, stats.ActiveDevices);
        Assert.Equal(2, Assert.Single(stats.ByPlace).PlaceId);
        Assert.Equal("fr", Assert.Single(stats.ByLanguage).Lang);
    }

    [Fact]
    public void Leave_DecreasesCount()
    {
        _service.Heartbeat(new ListenerHeartbeatDto("a", 1, "vi"));
        _service.Heartbeat(new ListenerHeartbeatDto("b", 1, "vi"));

        _service.Leave("a");

        Assert.Equal(1, _service.GetStats().ActiveDevices);
    }

    [Fact]
    public void LeaveUnknownDevice_DoesNothing()
    {
        _service.Heartbeat(new ListenerHeartbeatDto("a", 1, "vi"));

        _service.Leave("khong-co");

        Assert.Equal(1, _service.GetStats().ActiveDevices);
    }

    [Fact]
    public void NoHeartbeatPastTimeout_DeviceDropsOut()
    {
        _service.Heartbeat(new ListenerHeartbeatDto("a", 1, "vi"));
        _service.Heartbeat(new ListenerHeartbeatDto("b", 1, "vi"));

        _time.Now = _time.Now.AddSeconds(ListenerService.TimeoutSeconds - 5);
        _service.Heartbeat(new ListenerHeartbeatDto("b", 1, "vi"));
        _time.Now = _time.Now.AddSeconds(10);

        var stats = _service.GetStats();
        Assert.Equal(1, stats.ActiveDevices);
    }

    [Theory]
    [InlineData("", 1, "vi")]
    [InlineData("a", 0, "vi")]
    [InlineData("a", 1, "de")]
    public void Heartbeat_InvalidInput_Throws(string deviceId, int placeId, string lang)
    {
        Assert.Throws<ArgumentException>(() =>
            _service.Heartbeat(new ListenerHeartbeatDto(deviceId, placeId, lang)));
    }

    [Fact]
    public void Heartbeat_TooLongDeviceId_Throws()
    {
        Assert.Throws<ArgumentException>(() =>
            _service.Heartbeat(new ListenerHeartbeatDto(new string('x', 65), 1, "vi")));
    }
}
