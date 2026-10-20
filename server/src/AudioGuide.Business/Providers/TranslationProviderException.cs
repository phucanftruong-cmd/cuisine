namespace AudioGuide.Business.Providers;

public class TranslationProviderException : Exception
{
    public TranslationProviderException(string message, Exception? inner = null)
        : base(message, inner)
    {
    }
}