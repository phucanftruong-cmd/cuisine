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
| GET | /api/Places?search=&category=&ward=&maxPrice=&page=&pageSize= | Danh sách có tìm kiếm (gõ không dấu cũng được), lọc và phân trang |
| GET | /api/Places/filters | Danh sách loại món và phường để làm bộ lọc |
| GET | /api/Places/{id} | Chi tiết |
| POST | /api/Places | Tạo mới |
| PUT | /api/Places/{id} | Cập nhật |
| DELETE | /api/Places/{id} | Xóa |
| GET | /api/places/{placeId}/translations/{lang} | Bản dịch của địa điểm (en, fr, ja, ko, zh-CN), có cache |
## Cấu hình dịch thuật

Dịch vụ dịch dùng MyMemory (miễn phí, không cần API key). Để tăng hạn mức lên 50.000 ký tự mỗi ngày, lưu email vào user-secrets (không đưa vào code):

```bash
cd server
dotnet user-secrets set "MyMemory:Email" "email-cua-ban@example.com" --project src/AudioGuide.Api
```

Bản dịch được lưu vào database (cache). Khi nội dung gốc của địa điểm thay đổi, các bản dịch cũ của địa điểm đó tự bị xóa.

## Chạy bằng Docker

Tạo file `.env` ở thư mục gốc (file này đã được `.gitignore` bỏ qua):

```
MYMEMORY_EMAIL=email-cua-ban@example.com
```

Rồi chạy:

```bash
docker compose up --build
```

Mở http://localhost:8080/scalar/v1. Database được giữ trong Docker volume nên không mất khi khởi động lại.

## CI/CD

Workflow `.github/workflows/ci.yml` dùng GitHub Actions:

- **CI** (mỗi push và Pull Request vào `main`): restore, build, chạy unit test.
- **CD** (chỉ khi push vào `main` và test đã qua): build Docker image và đẩy lên GitHub Container Registry (`ghcr.io/phucanftruong-cmd/cuisine`) với hai tag là `latest` và mã commit.

Quy trình làm việc: mỗi chức năng một nhánh `feature/...`, mở Pull Request vào `main`, CI phải xanh mới merge.

## Xác thực và phân quyền (JWT)

- `POST /api/auth/register`: đăng ký tài khoản thường (role `User`), trả về token.
- `POST /api/auth/login`: đăng nhập, trả về token JWT (hết hạn sau 60 phút).
- Xem địa điểm và xem bản dịch: không cần đăng nhập.
- Tạo, sửa, xóa địa điểm: chỉ role `Admin`. Gửi kèm header `Authorization: Bearer <token>`.

Mật khẩu được băm bằng BCrypt. Cấu hình bí mật lưu bằng user-secrets (không đưa vào code):

```bash
cd server
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)" --project src/AudioGuide.Api
dotnet user-secrets set "Admin:Username" "admin" --project src/AudioGuide.Api
dotnet user-secrets set "Admin:Password" "mat-khau-cua-ban" --project src/AudioGuide.Api
```

Khi khởi động, nếu chưa có tài khoản admin thì server tự tạo từ `Admin:Username` và `Admin:Password`. Nếu bạn đổi `Admin:Password` sau đó, tài khoản đã có không bị đổi mật khẩu.