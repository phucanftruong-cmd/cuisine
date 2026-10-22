# Quy trình làm việc

## Nhánh

`main` luôn chạy được và chỉ nhận code qua Pull Request.

```
main ──●──────●──────●──
        \    /  \   /
     feat/abc   fix/xyz      nhánh ngắn, xong là merge rồi xóa
```

1. Tạo nhánh mới từ `main` mới nhất:
   ```bash
   git fetch origin
   git switch --no-track -c feat/ten-chuc-nang origin/main
   git push -u origin feat/ten-chuc-nang
   ```
2. Đặt tên nhánh theo loại việc: `feat/...` (chức năng mới), `fix/...` (sửa lỗi), `chore/...` (cập nhật thư viện, dọn dẹp), `ci/...` (CI/CD), `docs/...` (tài liệu).
3. Mỗi nhánh làm một việc. Việc lớn thì chia thành nhiều PR nhỏ.
4. Trước khi mở PR, cập nhật nhánh theo `main`: `git fetch origin && git merge origin/main` (hoặc `git rebase origin/main` nếu nhánh chỉ có mình bạn làm).
5. Không force-push lên `main`. Trên nhánh của mình, nếu cần thì dùng `git push --force-with-lease`.

## Commit

Dùng [Conventional Commits](https://www.conventionalcommits.org/): `loại(phạm vi): mô tả ngắn`.

```
feat(client): thêm thư viện ảnh món ăn
fix(api): trả 404 khi xóa ảnh không tồn tại
chore(client): cập nhật vite
ci: chạy lint trong CI
```

Phạm vi thường dùng: `api` (server), `client`, `admin`. Mỗi commit làm một việc, để revert riêng được.

## Pull Request và merge

- Tên PR cũng theo Conventional Commits, điền đủ template.
- Cần ít nhất 1 người duyệt và CI xanh (3 check `server`, `client`, `docker`).
- Merge bằng **"Create a merge commit"** để giữ lịch sử từng commit trong nhánh. Merge xong thì xóa nhánh.

## CI/CD (`.github/workflows/ci.yml`)

Chạy trên mọi PR vào `main` và mỗi lần push vào `main`:

| Job | Làm gì |
|---|---|
| `server` | restore, build, chạy test, kiểm tra migration khớp với model (quên `migrations add` thì đỏ) |
| `client` | `npm ci`, lint, test, build |
| `docker` | build image API và chạy thử container (gọi `/api/Places`), không push |
| `publish` | chỉ khi push vào `main` và 3 job trên xanh: đẩy image lên `ghcr.io/phucanftruong-cmd/cuisine` với tag `sha-<commit>` và `main` |

Dependabot mở PR cập nhật thư viện mỗi tuần (`.github/dependabot.yml`).

## Cài đặt bảo vệ nhánh `main` (admin repo làm một lần)

Settings → Branches → Add branch ruleset (hoặc Branch protection rule) cho `main`:

- Require a pull request before merging, 1 approval
- Require status checks to pass: `server`, `client`, `docker`; bật "Require branches to be up to date"
- Block force pushes, không cho xóa nhánh
- Settings → General → Pull Requests: chỉ bật "Allow merge commits", bật "Automatically delete head branches"
