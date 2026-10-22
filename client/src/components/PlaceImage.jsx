import { useState } from "react";

// Ảnh quán có ảnh dự phòng: link hỏng, trang gốc chặn nhúng hay không có ảnh
// đều hiện khung 🍜 thay vì biểu tượng ảnh vỡ.
export default function PlaceImage({ src, alt = "", className = "", fallbackClassName = "", loading = "lazy" }) {
  const url = src?.trim();
  if (!url) return <ImageFallback className={`${className} ${fallbackClassName}`} />;
  // key: đổi link thì thử tải lại từ đầu
  return (
    <LoadableImage
      key={url}
      src={url}
      alt={alt}
      className={className}
      fallbackClassName={fallbackClassName}
      loading={loading}
    />
  );
}

function LoadableImage({ src, alt, className, fallbackClassName, loading }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <ImageFallback className={`${className} ${fallbackClassName}`} />;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      // Nhiều trang (báo, mạng xã hội, CDN) chặn ảnh khi thấy trang khác nhúng vào;
      // không gửi Referer giúp phần lớn các link này hiện được.
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function ImageFallback({ className }) {
  return (
    <div className={`image-fallback ${className}`.trim()} role="img" aria-label="Chưa có ảnh">
      <span aria-hidden="true">🍜</span>
    </div>
  );
}
