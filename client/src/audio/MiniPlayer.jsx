import { Link } from "react-router";
import Icon from "../components/Icon";
import PlaceArt from "../components/PlaceArt";
import PlaceImage from "../components/PlaceImage";
import { useI18n } from "../i18n/useI18n";
import { useAudio } from "./useAudio";

// Trình phát nhỏ dính đáy màn hình: nghe tiếp khi chuyển trang.
// Ẩn khi trình phát đầy đủ của cùng địa điểm đang hiện trên màn hình.
export default function MiniPlayer() {
  const { t } = useI18n();
  const audio = useAudio();
  const { track, status, index, total } = audio;
  if (!track || status === "idle" || audio.inlineVisible) return null;

  const playing = status === "playing";
  const progress = total > 1 ? (status === "ended" ? 100 : (index / (total - 1)) * 100) : 0;
  let statusText = "";
  if (status === "loading") statusText = t("player.loading");
  else if (status === "ended") statusText = t("player.ended");
  else if (status === "error") statusText = t("player.error");
  else if (total) statusText = t("player.sentence", { current: index + 1, total });

  return (
    <>
      <div className="tv-mini-spacer" aria-hidden="true" />
      <section className="tv-mini" aria-label={t("player.title")}>
        <span className="tv-mini-bar" style={{ width: `${progress}%` }} aria-hidden="true" />
        <Link to={`/places/${track.id}`} className="tv-mini-thumb" tabIndex={-1} aria-hidden="true">
          <PlaceImage
            src={track.imageUrl}
            alt=""
            className="tv-mini-img"
            fallback={<PlaceArt category={track.category} seed={track.id} className="tv-mini-img" />}
          />
        </Link>
        <div className="tv-mini-text">
          <Link to={`/places/${track.id}`} className="tv-mini-title">
            {track.name}
          </Link>
          <span className="tv-mini-status">
            {playing && <span className="tv-dot" aria-hidden="true" />}
            {statusText}
          </span>
        </div>
        <button
          type="button"
          className="tv-play tv-play--sm"
          onClick={audio.toggle}
          disabled={status === "loading"}
          aria-label={playing ? t("player.pause") : t("player.play")}
        >
          {status === "loading" ? (
            <span className="tv-spinner" />
          ) : (
            <Icon name={playing ? "pause" : "play"} size={20} />
          )}
        </button>
        <button type="button" className="tv-icon-btn" onClick={audio.close} aria-label={t("player.close")}>
          <Icon name="close" size={20} />
        </button>
      </section>
    </>
  );
}
