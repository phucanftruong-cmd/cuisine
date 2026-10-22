import { useEffect, useRef } from "react";
import Icon from "../components/Icon";
import { LANGUAGES } from "../i18n/messages";
import { useI18n } from "../i18n/useI18n";
import { estimateSeconds, formatDuration } from "../utils/narration";
import { RATES } from "./rates";
import { useAudio } from "./useAudio";

// Trình phát đầy đủ ở trang chi tiết. Bài đang phát là của địa điểm khác thì nút Phát sẽ chuyển sang địa điểm này.
export default function AudioPlayer({ place }) {
  const { t } = useI18n();
  const audio = useAudio();
  const rootRef = useRef(null);
  const chipsRef = useRef(null);
  const isCurrent = audio.track?.id === place.id;
  const lang = isCurrent ? audio.lang : audio.preferredLang;
  const status = isCurrent ? audio.status : "idle";
  const { setInlineVisible } = audio;

  // Trình phát này đang hiện trên màn hình thì ẩn mini player cho đỡ trùng
  useEffect(() => {
    const el = rootRef.current;
    if (!isCurrent || !el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInlineVisible(entry.isIntersecting));
    observer.observe(el);
    return () => {
      observer.disconnect();
      setInlineVisible(false);
    };
  }, [isCurrent, setInlineVisible]);

  // Chip ngôn ngữ đang chọn có thể nằm ngoài hàng cuộn ngang (mobile): cuộn hàng tới nó
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector(".is-active");
    if (row && chip) row.scrollLeft = chip.offsetLeft - row.offsetLeft - (row.clientWidth - chip.clientWidth) / 2;
  }, [lang]);

  if (!audio.supported || !place.description?.trim()) {
    return (
      <section className="tv-player" aria-label={t("player.title")}>
        <p className="tv-player-note">{!audio.supported ? t("player.unsupported") : t("player.noContent")}</p>
      </section>
    );
  }

  const playing = status === "playing";
  const loading = status === "loading";
  const ended = status === "ended";
  const total = isCurrent ? audio.total : 0;
  const index = isCurrent ? audio.index : 0;
  const shown = ended ? Math.max(0, total - 1) : index;
  const duration = isCurrent ? audio.duration : lang === "vi" ? estimateSeconds(place.description, "vi") : 0;
  const elapsed = isCurrent ? (ended ? audio.duration : audio.elapsed) : 0;

  function handlePlay() {
    if (isCurrent) audio.toggle();
    else audio.playPlace(place, lang);
  }

  let statusText = " ";
  if (loading) statusText = t("player.loading");
  else if (total) statusText = t("player.sentence", { current: Math.min(index + 1, total), total });

  return (
    <section className="tv-player" ref={rootRef} aria-labelledby={`player-${place.id}`}>
      <div className="tv-player-head">
        <h2 id={`player-${place.id}`}>
          <Icon name="headphones" size={20} /> {t("player.title")}
        </h2>
        {playing && <span className="tv-live">{t("player.nowPlaying")}</span>}
        {ended && <span className="tv-player-done">{t("player.ended")}</span>}
      </div>

      <div className="tv-chips tv-chips--scroll" ref={chipsRef} role="group" aria-label={t("player.language")}>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            className={l.code === lang ? "tv-chip-btn is-active" : "tv-chip-btn"}
            aria-pressed={l.code === lang}
            onClick={() => (isCurrent ? audio.changeLang(l.code) : audio.pickLang(l.code))}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="tv-player-main">
        <button
          type="button"
          className="tv-play"
          onClick={handlePlay}
          disabled={loading}
          aria-label={playing ? t("player.pause") : ended ? t("player.replay") : t("player.play")}
        >
          {loading ? <span className="tv-spinner" /> : <Icon name={playing ? "pause" : "play"} size={26} />}
        </button>

        <div className="tv-player-track">
          <input
            type="range"
            className="tv-progress"
            min={0}
            max={Math.max(0, total - 1)}
            step={1}
            value={shown}
            disabled={!isCurrent || total <= 1 || loading}
            onChange={(e) => audio.seek(Number(e.target.value))}
            aria-label={t("player.seek")}
            aria-valuetext={total ? t("player.sentence", { current: shown + 1, total }) : undefined}
            style={{ "--progress": `${total > 1 ? (shown / (total - 1)) * 100 : 0}%` }}
          />
          <div className="tv-player-times">
            <span>{statusText}</span>
            <span title={t("player.estimate")}>
              {formatDuration(elapsed)} / {duration ? `~${formatDuration(duration)}` : "--:--"}
            </span>
          </div>
        </div>
      </div>

      <div className="tv-player-tools">
        <button
          type="button"
          className="tv-icon-btn"
          onClick={() => audio.seek(index - 1)}
          disabled={!isCurrent || index <= 0 || loading}
          aria-label={t("player.prev")}
        >
          <Icon name="prev" size={20} />
        </button>
        <button
          type="button"
          className="tv-icon-btn"
          onClick={() => audio.seek(index + 1)}
          disabled={!isCurrent || index >= total - 1 || loading}
          aria-label={t("player.next")}
        >
          <Icon name="next" size={20} />
        </button>
        <label className="tv-speed">
          <span>{t("player.speed")}</span>
          <select value={audio.rate} onChange={(e) => audio.setRate(Number(e.target.value))}>
            {RATES.map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </label>
      </div>

      {isCurrent && status === "error" && (
        <p className="tv-player-note tv-player-note--error" role="alert">
          {t("player.error")}
        </p>
      )}
      {isCurrent && status === "empty" && <p className="tv-player-note">{t("player.noContent")}</p>}
      {isCurrent && audio.missingVoice && <p className="tv-player-note">{t("player.missingVoice")}</p>}
    </section>
  );
}
