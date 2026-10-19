# Thuyết minh tự động đa ngôn ngữ - Backend

[![CI](https://github.com/phucanftruong-cmd/cuisine/actions/workflows/ci.yml/badge.svg)](https://github.com/phucanftruong-cmd/cuisine/actions/workflows/ci.yml)

Backend ASP.NET Core theo kiến trúc 3 lớp, có CI bằng GitHub Actions.

## Cấu trúc

```
client/   Frontend (chưa làm)
server/
  src/
    AudioGuide.Api/       Presentation: Controllers, Middleware, Program.cs
    AudioGuide.Business/  Business: Services, DTOs
    AudioGuide.Data/      Data Access: Entities, DbContext, Repositories, Migrations
  tests/
    AudioGuide.Tests/     Unit test (xUnit + Moq)
```

Phụ thuộc một chiều: Api → Business → Data.

## Công nghệ

.NET 10, ASP.NET Core Web API, EF Core + SQLite, xUnit, Moq, Scalar (tài liệu API), GitHub Actions.

## Chạy local

```bash
cd server
dotnet run --project src/AudioGuide.Api
```

Mở http://localhost:5295/scalar/v1 để thử API. Database SQLite tự tạo khi khởi động.

## Chạy test

```bash
cd server
dotnet test
```

## API hiện có

| Method | Đường dẫn | Mô tả |
|--------|-----------|-------|
| GET | /api/Places | Danh sách địa điểm |
| GET | /api/Places/{id} | Chi tiết |
| POST | /api/Places | Tạo mới |
| PUT | /api/Places/{id} | Cập nhật |
| DELETE | /api/Places/{id} | Xóa |