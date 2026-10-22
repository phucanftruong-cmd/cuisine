using AudioGuide.Business.Services;

namespace AudioGuide.Tests;

public class TextNormalizerTests
{
    [Theory]
    [InlineData("Phở Bò Đặc Biệt", "pho bo dac biet")]
    [InlineData("  Bún   Thịt Nướng ", "bun thit nuong")]
    [InlineData("Cà phê sữa đá", "ca phe sua da")]
    [InlineData("", "")]
    public void ToSearchKey_RemovesDiacriticsAndNormalizesSpaces(string input, string expected)
    {
        Assert.Equal(expected, TextNormalizer.ToSearchKey(input));
    }

    [Fact]
    public void ToSearchKey_Null_ReturnsEmpty()
    {
        Assert.Equal(string.Empty, TextNormalizer.ToSearchKey(null));
    }
}