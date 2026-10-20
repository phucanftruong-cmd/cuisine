using AudioGuide.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AudioGuide.Data.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public UserRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<User?> GetByUsernameAsync(string username) =>
        _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username);

    public async Task<User> AddAsync(User user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }
}