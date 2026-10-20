using System.Text;
using AudioGuide.Business.Providers;

namespace AudioGuide.Tests;

public class SplitTextTests
{
    [Fact]
    public void ShortText_ReturnsSingleChunk()
    {
        var chunks = MyMemoryTranslationProvider.SplitText("Chợ Bến Thành được xây dựng năm 1914.");

        Assert.Single(chunks);
    }

    [Fact]
    public void LongText_EveryChunkIsWithinByteLimit_AndNothingIsLost()
    {
        var sentence = "Chợ Bến Thành được xây dựng năm 1914 và là biểu tượng của Sài Gòn.";
        var text = string.Join(" ", Enumerable.Repeat(sentence, 20));

        var chunks = MyMemoryTranslationProvider.SplitText(text);

        Assert.True(chunks.Count > 1);
        Assert.All(chunks, c => Assert.True(Encoding.UTF8.GetByteCount(c) <= 450));
        Assert.Equal(text, string.Join(" ", chunks));
    }

    [Fact]
    public void LongSentenceWithoutPunctuation_IsSplitByWords()
    {
        var text = string.Join(" ", Enumerable.Repeat("từ", 400));

        var chunks = MyMemoryTranslationProvider.SplitText(text);

        Assert.True(chunks.Count > 1);
        Assert.All(chunks, c => Assert.True(Encoding.UTF8.GetByteCount(c) <= 450));
        Assert.Equal(text, string.Join(" ", chunks));
    }
}