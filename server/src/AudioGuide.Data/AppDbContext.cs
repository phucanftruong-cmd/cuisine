using AudioGuide.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AudioGuide.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Place> Places => Set<Place>();
    public DbSet<Translation> Translations => Set<Translation>();
    public DbSet<User> Users => Set<User>();
    public DbSet<PlaceImage> PlaceImages => Set<PlaceImage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Mỗi địa điểm chỉ có một bản dịch cho mỗi ngôn ngữ
        modelBuilder.Entity<Translation>()
            .HasIndex(t => new { t.PlaceId, t.LanguageCode })
            .IsUnique();

        // Tên đăng nhập không được trùng
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        // Xóa quán thì xóa luôn các ảnh món của quán
        modelBuilder.Entity<PlaceImage>()
            .HasOne(i => i.Place)
            .WithMany(p => p.Images)
            .HasForeignKey(i => i.PlaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PlaceImage>()
            .HasIndex(i => new { i.PlaceId, i.SortOrder });
    }
}