using AudioGuide.Business.Dtos;
using AudioGuide.Business.Services;
using AudioGuide.Data.Entities;
using AudioGuide.Data.Repositories;
using Moq;

namespace AudioGuide.Tests;

public class PlaceServiceTests
{
    private readonly Mock<IPlaceRepository> _repo = new();
    private readonly PlaceService _service;

    public PlaceServiceTests()
    {
        _service = new PlaceService(_repo.Object);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsMappedDtos()
    {
        _repo.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<Place>
        {
            new() { Id = 1, Name = "A", Description = "a" },
            new() { Id = 2, Name = "B", Description = "b" }
        });

        var result = await _service.GetAllAsync();

        Assert.Equal(2, result.Count);
        Assert.Equal("A", result[0].Name);
    }

    [Fact]
    public async Task GetByIdAsync_Found_ReturnsDto()
    {
        _repo.Setup(r => r.GetByIdAsync(1))
             .ReturnsAsync(new Place { Id = 1, Name = "Chợ Bến Thành", Description = "abc" });

        var result = await _service.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal("Chợ Bến Thành", result!.Name);
    }

    [Fact]
    public async Task GetByIdAsync_NotFound_ReturnsNull()
    {
        _repo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Place?)null);

        var result = await _service.GetByIdAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task CreateAsync_ValidInput_TrimsAndSaves()
    {
        var dto = new CreatePlaceDto("  Chợ Bến Thành  ", "  Mô tả  ");

        var result = await _service.CreateAsync(dto);

        Assert.Equal("Chợ Bến Thành", result.Name);
        Assert.Equal("Mô tả", result.Description);
        _repo.Verify(r => r.AddAsync(It.Is<Place>(p => p.Name == "Chợ Bến Thành")), Times.Once);
    }

    [Theory]
    [InlineData("", "abc")]
    [InlineData("   ", "abc")]
    [InlineData("abc", "")]
    [InlineData("abc", "   ")]
    public async Task CreateAsync_EmptyFields_ThrowsAndDoesNotSave(string name, string description)
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.CreateAsync(new CreatePlaceDto(name, description)));

        _repo.Verify(r => r.AddAsync(It.IsAny<Place>()), Times.Never);
    }

    [Fact]
    public async Task UpdateAsync_Found_UpdatesFields()
    {
        var place = new Place { Id = 1, Name = "Cũ", Description = "cũ" };
        _repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(place);

        var result = await _service.UpdateAsync(1, new UpdatePlaceDto("Mới", "mới"));

        Assert.NotNull(result);
        Assert.Equal("Mới", place.Name);
        _repo.Verify(r => r.UpdateAsync(place), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_NotFound_ReturnsNull()
    {
        _repo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Place?)null);

        var result = await _service.UpdateAsync(999, new UpdatePlaceDto("Mới", "mới"));

        Assert.Null(result);
        _repo.Verify(r => r.UpdateAsync(It.IsAny<Place>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_Found_ReturnsTrue()
    {
        var place = new Place { Id = 1, Name = "A", Description = "a" };
        _repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(place);

        var result = await _service.DeleteAsync(1);

        Assert.True(result);
        _repo.Verify(r => r.DeleteAsync(place), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_NotFound_ReturnsFalse()
    {
        _repo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Place?)null);

        var result = await _service.DeleteAsync(999);

        Assert.False(result);
        _repo.Verify(r => r.DeleteAsync(It.IsAny<Place>()), Times.Never);
    }
}