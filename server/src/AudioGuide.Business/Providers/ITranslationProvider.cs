namespace AudioGuide.Business.Providers;

public interface ITranslationProvider
{
    Task<string> TranslateAsync(string text, string sourceLang, string targetLang);
}