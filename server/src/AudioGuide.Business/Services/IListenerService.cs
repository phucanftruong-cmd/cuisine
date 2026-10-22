using AudioGuide.Business.Dtos;

namespace AudioGuide.Business.Services;

// Đếm số thiết bị đang nghe thuyết minh (lưu trong bộ nhớ, không lưu database)
public interface IListenerService
{
    // Thiết bị đang nghe: thêm mới hoặc gia hạn
    void Heartbeat(ListenerHeartbeatDto dto);

    // Thiết bị dừng nghe hoặc rời trang
    void Leave(string deviceId);

    ListenerStatsDto GetStats();
}
