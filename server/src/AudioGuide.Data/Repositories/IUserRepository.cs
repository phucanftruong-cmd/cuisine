using AudioGuide.Data.Entities;

namespace AudioGuide.Data.Repositories;

public interface IUserRepository
{
    Task<User?> GetByUsernameAsync(string username);
    Task<User> AddAsync(User user);
}