import { useContext, useState } from "react";
import { I18nContext } from "../i18n/i18nContext";
import { translate } from "../i18n/messages";

// Ảnh quán có ảnh dự phòng: link hỏng, trang gốc chặn nhúng hay không có ảnh
// đều hiện khung 🍜 thay vì biểu tượng ảnh vỡ. Trang khách truyền `fallback` (hình minh họa) để thay khung đó.
export default function PlaceImage({
  src,
  alt = "",
  className = "",
  fallbackClassName = "",
  loading = "lazy",
  fallback = null,
}) {
  const url = src?.trim();
  if (!url) return fallback ?? <ImageFallback className={`${className} ${fallbackClassName}`} />;
  // key: đổi link thì thử tải lại từ đầu
  return (
    <LoadableImage
      key={url}
      src={url}
      alt={alt}
      className={className}
      fallbackClassName={fallbackClassName}
      loading={loading}
      fallback={fallback}
    />
  );
}

function LoadableImage({ src, alt, className, fallbackClassName, loading, fallback }) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback ?? <ImageFallback className={`${className} ${fallbackClassName}`} />;

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
  // Form admin không bọc I18nProvider: dùng tiếng Việt
  const i18n = useContext(I18nContext);
  const label = i18n ? i18n.t("image.none") : translate("vi", "image.none");
  return (
    <div className={`image-fallback ${className}`.trim()} role="img" aria-label={label}>
      <span aria-hidden="true">🍜</span>
    </div>
  );
}
