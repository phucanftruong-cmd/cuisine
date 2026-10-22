import { useEffect, useState } from "react";
import { getListenerStats } from "../../api";
import { useAuth } from "../../auth/useAuth";

// Dashboard hỏi server mỗi POLL_MS một lần. Số liệu tính ở server: ListenerService.GetStats()
const POLL_MS = 2000;
// Thẻ gọn: chỉ hiện vài quán đông nhất
const TOP_PLACES = 3;

const LANGUAGE_NAMES = {
  vi: "Tiếng Việt",
  en: "English",
  fr: "Français",
  ja: "日本語",
  ko: "한국어",
  "zh-CN": "简体中文",
};

// Số thiết bị đang nghe thuyết minh, cập nhật liên tục
export default function LiveListeners({ places }) {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    const load = () =>
      getListenerStats(token)
        .then((data) => {
          if (ignore) return;
          setStats(data);
          setError("");
        })
        .catch((err) => {
          if (!ignore) setError(err.message);
        });
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [token]);

  const placeName = (id) => places?.find((p) => p.id === id)?.name ?? `Quán #${id}`;
  const count = stats?.activeDevices ?? 0;
  const max = Math.max(1, ...(stats?.byPlace ?? []).map((p) => p.count));
  const topPlaces = stats?.byPlace.slice(0, TOP_PLACES) ?? [];
  const otherPlaces = (stats?.byPlace.length ?? 0) - topPlaces.length;

  return (
    <section className="surface live" aria-labelledby="live-title">
      <div className="surface-head">
        <h2 id="live-title">
          <span className={error ? "live-dot live-dot--off" : "live-dot"} aria-hidden="true" />
          Đang nghe thuyết minh
        </h2>
        <span className="cell-sub">
          {error
            ? "Mất kết nối, đang thử lại..."
            : stats
              ? `Cập nhật ${new Date(stats.updatedAt).toLocaleTimeString("vi-VN")}`
              : "Đang tải..."}
        </span>
      </div>

      <div className="live-body">
        <div className="live-count" aria-live="polite">
          {/* key đổi theo số để chạy lại hiệu ứng mỗi lần số thay đổi */}
          <span key={count} className="live-value">
            {stats ? count : "—"}
          </span>
          <span className="live-unit">thiết bị</span>
        </div>

        <div className="live-detail">
          {count === 0 ? (
            <p className="muted">Chưa có ai nghe. Khách bấm “Nghe thuyết minh” ở trang quán thì số sẽ tăng.</p>
          ) : (
            <>
              <ul className="bars" aria-label="Theo quán">
                {topPlaces.map((p) => (
                  <li key={p.placeId}>
                    <span className="bar-label" title={placeName(p.placeId)}>
                      {placeName(p.placeId)}
                    </span>
                    <span className="bar-track" aria-hidden="true">
                      <span className="bar-fill" style={{ width: `${(p.count / max) * 100}%` }} />
                    </span>
                    <span className="bar-value">{p.count}</span>
                  </li>
                ))}
              </ul>
              {otherPlaces > 0 && <p className="live-more">và {otherPlaces} quán khác</p>}
              <ul className="live-langs" aria-label="Theo ngôn ngữ">
                {stats.byLanguage.map((l) => (
                  <li key={l.lang}>
                    {LANGUAGE_NAMES[l.lang] ?? l.lang} <strong>{l.count}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
