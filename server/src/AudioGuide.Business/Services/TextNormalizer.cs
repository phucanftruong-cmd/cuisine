using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace AudioGuide.Business.Services;

public static class TextNormalizer
{
    // "Phở Bò Đặc Biệt" -> "pho bo dac biet"
    public static string ToSearchKey(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var decomposed = text.Trim().ToLowerInvariant().Replace('đ', 'd').Normalize(NormalizationForm.FormD);

        var builder = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                builder.Append(c);
        }

        return Regex.Replace(builder.ToString().Normalize(NormalizationForm.FormC), @"\s+", " ");
    }
}