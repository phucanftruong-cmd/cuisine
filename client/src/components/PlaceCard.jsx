import { useContext } from "react";
import { Link } from "react-router";
import { AudioContext } from "../audio/audioContext";
import { I18nContext } from "../i18n/i18nContext";
import { translate } from "../i18n/messages";
import { formatPrice } from "../utils/format";
import Icon from "./Icon";
import PlaceArt from "./PlaceArt";
import PlaceImage from "./PlaceImage";
import "./PlaceCard.css";

// Thẻ địa điểm. preview: form admin xem trước (không có link, không có nút nghe).
// Đọc context trực tiếp vì form admin không bọc I18nProvider/AudioProvider.
export default function PlaceCard({ place, preview = false }) {
  const i18n = useContext(I18nContext);
  const audio = useContext(AudioContext);
  const t = i18n?.t ?? ((key, vars) => translate("vi", key, vars));

  const price = formatPrice(place);
  const meta = [price, place.openingHours].filter(Boolean).join(" · ");
  const hasAudio = Boolean(place.description?.trim());
  const url = `/places/${place.id}`;
  // Form admin không có AudioProvider, và địa điểm xem trước có thể chưa có id
  const isCurrent = Boolean(audio?.track) && audio.track.id === place.id;
  const isPlaying = isCurrent && ["playing", "loading"].includes(audio.status);

  const image = (
    <PlaceImage
      src={place.imageUrl}
      alt=""
      className="tv-card-img"
      fallback={<PlaceArt category={place.category} seed={place.id ?? 0} className="tv-card-img" />}
    />
  );

  const body = (
    <>
      {place.category && <span className="tv-chip">{place.category}</span>}
      <h3 className="tv-card-title">{preview ? place.name : <Link to={url}>{place.name}</Link>}</h3>
      {meta && <p className="tv-card-meta">{meta}</p>}
      {place.address && <p className="tv-card-address">{place.address}</p>}
    </>
  );

  if (preview) {
    return (
      <article className="tv-card tv-card--preview">
        <div className="tv-card-media">{image}</div>
        <div className="tv-card-body">{body}</div>
      </article>
    );
  }

  return (
    <article className={isCurrent ? "tv-card is-current" : "tv-card"}>
      <Link to={url} className="tv-card-media" tabIndex={-1} aria-hidden="true">
        {image}
        {hasAudio && (
          <span className="tv-card-badge">
            <Icon name="headphones" size={14} /> {t("card.audio")}
          </span>
        )}
      </Link>
      <div className="tv-card-body">
        {body}
        <div className="tv-card-actions">
          {hasAudio && audio?.supported && (
            <button
              type="button"
              className="tv-btn tv-btn--soft tv-btn--sm"
              onClick={() => (isPlaying ? audio.pause() : audio.playPlace(place))}
              aria-label={isPlaying ? t("card.pause") : t("card.listenTo", { name: place.name })}
            >
              <Icon name={isPlaying ? "pause" : "play"} size={16} />
              {isPlaying ? t("card.pause") : t("card.listen")}
            </button>
          )}
          <Link to={url} className="tv-link">
            {t("card.explore")} <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
