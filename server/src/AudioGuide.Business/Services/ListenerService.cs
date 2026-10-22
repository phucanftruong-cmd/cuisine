using System.Collections.Concurrent;
using AudioGuide.Business.Dtos;

namespace AudioGuide.Business.Services;

public class ListenerService : IListenerService
{
    // Quá thời gian này không nhận heartbeat thì coi như thiết bị đã thoát (đóng app, mất mạng...)
    public const int TimeoutSeconds = 15;
    private const int MaxDeviceIdLength = 64;
    private static readonly string[] SupportedLanguages = { "vi", "en", "fr", "ja", "ko", "zh-CN" };

    private record Session(int PlaceId, string Lang, DateTimeOffset LastSeen);

    // Mỗi thiết bị một dòng (key là deviceId) nên 1 máy gửi nhiều lần vẫn chỉ tính 1
    private readonly ConcurrentDictionary<string, Session> _sessions = new();
    private readonly TimeProvider _time;

    public ListenerService(TimeProvider time)
    {
        _time = time;
    }

    public void Heartbeat(ListenerHeartbeatDto dto)
    {
        var deviceId = NormalizeDeviceId(dto.DeviceId);
        if (dto.PlaceId <= 0)
            throw new ArgumentException("Mã địa điểm không hợp lệ.");

        var lang = SupportedLanguages.FirstOrDefault(l =>
            l.Equals(dto.Lang?.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException(
                $"Ngôn ngữ không được hỗ trợ. Chọn một trong: {string.Join(", ", SupportedLanguages)}.");

        _sessions[deviceId] = new Session(dto.PlaceId, lang, _time.GetUtcNow());
    }

    public void Leave(string deviceId)
    {
        _sessions.TryRemove(NormalizeDeviceId(deviceId), out _);
    }

    public ListenerStatsDto GetStats()
    {
        RemoveExpired();
        var active = _sessions.Values.ToList();

        // SỐ THIẾT BỊ ĐANG NGHE: tính ở đây (dashboard admin hiển thị đúng số này)
        var activeDevices = active.Count;

        var byPlace = active
            .GroupBy(s => s.PlaceId)
            .Select(g => new PlaceListenerCountDto(g.Key, g.Count()))
            .OrderByDescending(p => p.Count).ThenBy(p => p.PlaceId)
            .ToList();

        var byLanguage = active
            .GroupBy(s => s.Lang)
            .Select(g => new LanguageListenerCountDto(g.Key, g.Count()))
            .OrderByDescending(l => l.Count).ThenBy(l => l.Lang)
            .ToList();

        return new ListenerStatsDto(activeDevices, byPlace, byLanguage, _time.GetUtcNow().UtcDateTime);
    }

    private void RemoveExpired()
    {
        var cutoff = _time.GetUtcNow().AddSeconds(-TimeoutSeconds);
        foreach (var (deviceId, session) in _sessions)
        {
            if (session.LastSeen < cutoff)
                _sessions.TryRemove(deviceId, out _);
        }
    }

    private static string NormalizeDeviceId(string? deviceId)
    {
        var id = deviceId?.Trim();
        if (string.IsNullOrEmpty(id) || id.Length > MaxDeviceIdLength)
            throw new ArgumentException("Mã thiết bị không hợp lệ.");
        return id;
    }
}
