namespace AudioGuide.Business.Dtos;

// Thiết bị đang nghe báo "còn đây" (gửi lặp lại vài giây một lần)
public record ListenerHeartbeatDto(string DeviceId, int PlaceId, string Lang);

public record PlaceListenerCountDto(int PlaceId, int Count);

public record LanguageListenerCountDto(string Lang, int Count);

public record ListenerStatsDto(
    int ActiveDevices,
    List<PlaceListenerCountDto> ByPlace,
    List<LanguageListenerCountDto> ByLanguage,
    DateTime UpdatedAt);
