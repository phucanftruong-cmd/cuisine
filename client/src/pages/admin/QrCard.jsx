import QRCode from "qrcode";
import { useEffect, useState } from "react";

const isLocal = (url) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url);

// Mã QR để khách quét bằng điện thoại vào trang web.
// Mặc định là địa chỉ đang mở dashboard, sửa được khi cần (vd link deploy).
export default function QrCard() {
  const [url, setUrl] = useState(() => window.location.origin);
  const [qr, setQr] = useState({ value: "", image: "" });
  const [zoomed, setZoomed] = useState(false);
  const [copied, setCopied] = useState(false);

  const value = url.trim();
  // Chỉ hiện ảnh khi đã tạo xong cho đúng link đang nhập
  const image = value && qr.value === value ? qr.image : "";

  useEffect(() => {
    if (!value) return;
    let ignore = false;
    QRCode.toDataURL(value, { width: 640, margin: 1, errorCorrectionLevel: "M" })
      .then((data) => !ignore && setQr({ value, image: data }))
      .catch(() => !ignore && setQr({ value, image: "" }));
    return () => {
      ignore = true;
    };
  }, [value]);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e) => e.key === "Escape" && setZoomed(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Trình duyệt không cho chép (http): người dùng tự bôi đen ô link
    }
  }

  return (
    <section className="surface qr" aria-labelledby="qr-title">
      <button
        type="button"
        className="qr-image"
        onClick={() => image && setZoomed(true)}
        title="Bấm để phóng to"
        disabled={!image}
      >
        {image ? <img src={image} alt={`Mã QR mở ${url}`} /> : <span className="muted">Nhập link</span>}
      </button>

      <div>
        <h2 id="qr-title">Quét để vào web</h2>
        <div className="qr-url">
          <input
            id="qr-url"
            aria-label="Link trong mã QR"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            spellCheck={false}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
            {copied ? "Đã chép" : "Chép"}
          </button>
        </div>
        {isLocal(url) ? (
          <p className="qr-hint qr-hint--warn">Link localhost: điện thoại không vào được, hãy thay bằng link deploy.</p>
        ) : (
          <p className="qr-hint">Bấm vào mã để phóng to khi chiếu.</p>
        )}
      </div>

      {zoomed && (
        <div className="qr-overlay" role="dialog" aria-label="Mã QR phóng to" onClick={() => setZoomed(false)}>
          <img src={image} alt={`Mã QR mở ${url}`} />
          <p>{url}</p>
          <span className="qr-overlay-hint">Bấm bất kỳ đâu hoặc Esc để đóng</span>
        </div>
      )}
    </section>
  );
}
