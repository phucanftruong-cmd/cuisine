# Thuyết minh tự động đa ngôn ngữ - Ẩm thực Quận 6

[![CI](https://github.com/phucanftruong-cmd/cuisine/actions/workflows/ci.yml/badge.svg)](https://github.com/phucanftruong-cmd/cuisine/actions/workflows/ci.yml)

Backend ASP.NET Core theo kiến trúc 3 lớp, frontend React (Vite), có CI bằng GitHub Actions.

## Cấu trúc

```
client/   Frontend React + Vite
  src/
    pages/              Trang khách: danh sách quán, chi tiết quán, đăng nhập
    pages/admin/        Trang quản trị: tổng quan, danh sách quán, form thêm/sửa
    auth/               Lưu phiên đăng nhập, chặn trang admin
    utils/              Kiểm tra dữ liệu form, tính hồ sơ quán (kèm unit test)
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

.NET 10, ASP.NET Core Web API, EF Core + SQLite, xUnit, Moq, Scalar (tài liệu API), React 19, React Router, Vite, GitHub Actions.

## Chạy local

```bash
cd server
dotnet run --project src/AudioGuide.Api
```

Mở http://localhost:5295/scalar/v1 để thử API. Database SQLite tự tạo khi khởi động. Lần đầu chạy cần cấu hình `Jwt:Key` và tài khoản admin (xem phần [Xác thực và phân quyền](#xác-thực-và-phân-quyền-jwt)), nếu không server sẽ báo thiếu `Jwt:Key`.

Frontend (mở terminal khác):

```bash
cd client
npm install
npm run dev
```

Mở http://localhost:5173. File `client/.env.development` trỏ frontend tới API ở `http://localhost:5295`.

## Chạy test

```bash
cd server
dotnet test

cd ../client
npm test
```

## Trang quản trị

Vào http://localhost:5173/admin (hoặc bấm **Đăng nhập** trên thanh đầu trang) và đăng nhập bằng tài khoản admin.

- **Tổng quan** (`/admin`): bao nhiêu quán đã đủ hồ sơ (có địa chỉ, ảnh, vị trí bản đồ, giá, giờ mở cửa và không còn là dữ liệu mẫu), mỗi ô vuông là một quán. Bấm vào từng mục còn thiếu để ra danh sách quán cần bổ sung.
- **Quán ăn** (`/admin/places`): tìm không dấu, lọc theo loại món, phường và hồ sơ còn thiếu, phân trang 10 quán mỗi trang. Cột Hồ sơ cho biết quán đã có gì; ô ảnh màu đỏ là link ảnh hỏng.
- **Thêm / sửa quán** (`/admin/places/new`, `/admin/places/{id}/edit`): form kiểm tra dữ liệu ngay trên trình duyệt theo đúng luật của backend. Bên phải có thẻ xem trước đúng như khách thấy. Link ảnh được thử tải ngay khi dán, link hỏng sẽ không cho lưu. Dán cặp tọa độ copy từ Google Maps vào ô Vĩ độ là tự tách. Rời trang mà chưa lưu sẽ được hỏi lại.
- **Bản dịch đã lưu**: ở trang sửa quán, xem các bản dịch đã cache và xóa để dịch lại.
- Tài khoản thường (role `User`) không vào được trang quản trị. Token hết hạn thì tự đăng xuất và đưa về trang đăng nhập; đăng nhập lại sẽ quay về đúng trang đang làm.

Ảnh quán: nhiều trang (báo, mạng xã hội) chặn nhúng ảnh sang web khác. Web không gửi thông tin trang nguồn (`referrerPolicy="no-referrer"`) nên phần lớn link vẫn hiện được; link nào vẫn hỏng thì trang khách hiện khung 🍜 thay vì ảnh vỡ.

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
| GET | /api/places/{placeId}/translations | Các bản dịch đã lưu của địa điểm (Admin) |
| DELETE | /api/places/{placeId}/translations | Xóa bản dịch đã lưu để dịch lại (Admin) |
| POST | /api/auth/register | Đăng ký tài khoản thường |
| POST | /api/auth/login | Đăng nhập, trả về token |
| GET | /api/auth/me | Thông tin tài khoản của token đang dùng |

File `server/src/AudioGuide.Api/AudioGuide.Api.http` có sẵn request mẫu cho từng API (mở bằng Visual Studio, Rider hoặc VS Code + REST Client).

Giới hạn dữ liệu khi thêm/sửa quán: tên tối đa 200 ký tự, nội dung thuyết minh 5.000, địa chỉ 300, phường/loại món/giờ mở cửa 100, số điện thoại 30, link ảnh 1.000. Lỗi không lường trước trả về `500` dạng `{ "error": "..." }` thay vì trang lỗi mặc định.

## Cấu hình dịch thuật

Dịch vụ dịch dùng MyMemory (miễn phí, không cần API key). Để tăng hạn mức lên 50.000 ký tự mỗi ngày, lưu email vào user-secrets (không đưa vào code):

```bash
cd server
dotnet user-secrets set "MyMemory:Email" "email-cua-ban@example.com" --project src/AudioGuide.Api
```

Bản dịch được lưu vào database (cache). Khi nội dung gốc của địa điểm thay đổi, các bản dịch cũ của địa điểm đó tự bị xóa. Nếu hai người cùng lúc mở bản dịch chưa có, request lưu sau dùng lại bản đã lưu trước thay vì báo lỗi.

## Chạy bằng Docker

Tạo file `.env` ở thư mục gốc (file này đã được `.gitignore` bỏ qua):

```
JWT_KEY=chuoi-ngau-nhien-dai-it-nhat-32-ky-tu
ADMIN_USERNAME=admin
ADMIN_PASSWORD=mat-khau-cua-ban
MYMEMORY_EMAIL=email-cua-ban@example.com
```

`JWT_KEY` và `ADMIN_PASSWORD` là bắt buộc. Có thể tạo `JWT_KEY` bằng `openssl rand -base64 48`.

Rồi chạy:

```bash
docker compose up --build
```

Mở http://localhost:8080/scalar/v1. Database và ảnh tải lên được giữ trong Docker volume nên không mất khi khởi động lại.

Nếu volume được tạo từ bản cũ (container chạy bằng root) và server báo không ghi được vào `/data`, xóa volume rồi chạy lại: `docker compose down -v && docker compose up --build` (mất dữ liệu cũ trong volume).

## Xác thực và phân quyền (JWT)

- `POST /api/auth/register`: đăng ký tài khoản thường (role `User`), trả về token.
- `POST /api/auth/login`: đăng nhập, trả về token JWT (hết hạn sau 60 phút).
- `GET /api/auth/me`: kiểm tra token còn dùng được không, trả về tên đăng nhập và role.
- Xem địa điểm và xem bản dịch: không cần đăng nhập.
- Tạo, sửa, xóa địa điểm, xem và xóa bản dịch đã lưu: chỉ role `Admin`. Gửi kèm header `Authorization: Bearer <token>`.

Mật khẩu được băm bằng BCrypt. Cấu hình bí mật lưu bằng user-secrets (không đưa vào code):

```bash
cd server
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)" --project src/AudioGuide.Api
dotnet user-secrets set "Admin:Username" "admin" --project src/AudioGuide.Api
dotnet user-secrets set "Admin:Password" "mat-khau-cua-ban" --project src/AudioGuide.Api
```

Khi khởi động, nếu chưa có tài khoản admin thì server tự tạo từ `Admin:Username` và `Admin:Password`. Nếu bạn đổi `Admin:Password` sau đó, tài khoản đã có không bị đổi mật khẩu.
