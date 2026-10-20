using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace AudioGuide.Business.Providers;

public class MyMemoryTranslationProvider : ITranslationProvider
{
    // Giới hạn của MyMemory là 500 byte mỗi request, chừa dư một chút
    private const int MaxBytes = 450;

    private readonly HttpClient _http;
    private readonly MyMemoryOptions _options;

    public MyMemoryTranslationProvider(HttpClient http, MyMemoryOptions options)
    {
        _http = http;
        _options = options;
    }

    public async Task<string> TranslateAsync(string text, string sourceLang, string targetLang)
    {
        var parts = new List<string>();

        foreach (var chunk in SplitText(text))
        {
            var langPair = Uri.EscapeDataString($"{sourceLang}|{targetLang}");
            var url = $"get?q={Uri.EscapeDataString(chunk)}&langpair={langPair}";
            if (!string.IsNullOrWhiteSpace(_options.Email))
                url += $"&de={Uri.EscapeDataString(_options.Email)}";

            MyMemoryResponse? response;
            try
            {
                response = await _http.GetFromJsonAsync<MyMemoryResponse>(url);
            }
            catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests)
            {
                throw new TranslationProviderException(
                    "Dịch vụ dịch đã hết hạn mức miễn phí trong ngày, hãy thử lại sau.", ex);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                throw new TranslationProviderException("Không gọi được dịch vụ dịch.", ex);
            }

            var translated = response?.ResponseData?.TranslatedText;
            if (response is null || response.ResponseStatus != 200 || string.IsNullOrWhiteSpace(translated))
                throw new TranslationProviderException(
                    "Dịch vụ dịch trả về lỗi hoặc đã hết hạn mức trong ngày.");

            parts.Add(translated);
        }

        return string.Join(" ", parts);
    }

    // Cắt văn bản thành các đoạn <= MaxBytes, ưu tiên cắt ở cuối câu
    public static List<string> SplitText(string text)
    {
        var chunks = new List<string>();
        var current = new StringBuilder();

        foreach (var sentence in Regex.Split(text.Trim(), @"(?<=[.!?])\s+"))
        {
            foreach (var piece in SplitLongSentence(sentence))
            {
                if (current.Length > 0 && ByteCount(current.ToString()) + 1 + ByteCount(piece) > MaxBytes)
                {
                    chunks.Add(current.ToString());
                    current.Clear();
                }

                if (current.Length > 0) current.Append(' ');
                current.Append(piece);
            }
        }

        if (current.Length > 0) chunks.Add(current.ToString());
        return chunks;
    }

    private static IEnumerable<string> SplitLongSentence(string sentence)
    {
        if (ByteCount(sentence) <= MaxBytes)
        {
            yield return sentence;
            yield break;
        }

        var line = new StringBuilder();
        foreach (var word in sentence.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            if (line.Length > 0 && ByteCount(line.ToString()) + 1 + ByteCount(word) > MaxBytes)
            {
                yield return line.ToString();
                line.Clear();
            }

            if (line.Length > 0) line.Append(' ');
            line.Append(word);
        }

        if (line.Length > 0) yield return line.ToString();
    }

    private static int ByteCount(string s) => Encoding.UTF8.GetByteCount(s);

    private class MyMemoryResponse
    {
        public MyMemoryData? ResponseData { get; set; }

        [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
        public int ResponseStatus { get; set; }
    }

    private class MyMemoryData
    {
        public string? TranslatedText { get; set; }
    }
}