FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore trước, chỉ cần các file .csproj: đổi code mà không đổi package thì Docker dùng lại cache bước này
COPY global.json ./
COPY src/AudioGuide.Api/AudioGuide.Api.csproj src/AudioGuide.Api/
COPY src/AudioGuide.Business/AudioGuide.Business.csproj src/AudioGuide.Business/
COPY src/AudioGuide.Data/AudioGuide.Data.csproj src/AudioGuide.Data/
RUN dotnet restore src/AudioGuide.Api/AudioGuide.Api.csproj

COPY src/ src/
RUN dotnet publish src/AudioGuide.Api -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

# Database và ảnh tải lên nằm trong /data (gắn volume để không mất khi tạo lại container)
RUN mkdir -p /data/uploads && chown -R $APP_UID /data
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:8080 \
    ConnectionStrings__Default="Data Source=/data/audioguide.db" \
    Uploads__Path=/data/uploads

# Chạy bằng user thường (có sẵn trong image .NET), không chạy bằng root
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "AudioGuide.Api.dll"]
