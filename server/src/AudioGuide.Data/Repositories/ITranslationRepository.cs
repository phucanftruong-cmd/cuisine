using AudioGuide.Data.Entities;

namespace AudioGuide.Data.Repositories;

public interface ITranslationRepository
{
    Task<Translation?> GetAsync(int placeId, string languageCode);

    // Các bản dịch đã lưu của một địa điểm, sắp theo mã ngôn ngữ
    Task<List<Translation>> GetByPlaceIdAsync(int placeId);

    // Lưu bản dịch. Nếu một request khác vừa lưu bản dịch cùng địa điểm và ngôn ngữ
    // thì trả về bản đã có trong database thay vì báo lỗi.
    Task<Translation> AddAsync(Translation translation);

    Task DeleteByPlaceIdAsync(int placeId);
}
