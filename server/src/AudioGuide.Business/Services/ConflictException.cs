namespace AudioGuide.Business.Services;

public class ConflictException : Exception
{
    public ConflictException(string message) : base(message)
    {
    }
}