import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getPlace, getPlaces } from "../api";
import AudioPlayer from "../audio/AudioPlayer";
import { getPlaceText } from "../audio/placeText";
import { useAudio } from "../audio/useAudio";
import { useAuth } from "../auth/useAuth";
import Icon from "../components/Icon";
import PlaceArt from "../components/PlaceArt";
import PlaceCard from "../components/PlaceCard";
import PlaceImage from "../components/PlaceImage";
import PlacesMap from "../components/PlacesMap";
import { ErrorState } from "../components/StateViews";
import { useI18n } from "../i18n/useI18n";
import { directionsUrl } from "../utils/directions";
import { formatPrice } from "../utils/format";
import { hasCoords } from "../utils/geo";

const RELATED = 3;

export default function PlaceDetailPage() {
  const { id } = useParams();
  // key={id}: đổi sang địa điểm khác thì làm lại từ đầu
  return <PlaceDetail key={id} id={id} />;
}

function PlaceDetail({ id }) {
  const { t } = useI18n();
  const [place, setPlace] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    getPlace(id)
      .then((data) => !ignore && setPlace(data))
      .catch((err) => !ignore && setError(err));
    return () => {
      ignore = true;
    };
  }, [id, reloadKey]);

  if (error) {
    return (
      <div className="tv-container tv-page">
        <BackLink />
        {error.status === 404 ? (
          <div className="tv-state">
            <p className="tv-state-title">{t("place.notFound")}</p>
          </div>
        ) : (
          <ErrorState
            error={error}
            onRetry={() => {
              setError(null);
              setReloadKey((k) => k + 1);
            }}
          />
        )}
      </div>
    );
  }

  if (!place) {
    return (
      <div className="tv-container tv-page" aria-busy="true" aria-label={t("state.loading")}>
        <div className="tv-skeleton tv-skeleton--hero" />
        <div className="tv-skeleton tv-skeleton--line" />
        <div className="tv-skeleton tv-skeleton--line tv-skeleton--short" />
      </div>
    );
  }

  return <PlaceView place={place} />;
}

function BackLink() {
  const { t } = useI18n();
  return (
    <Link to="/explore" className="tv-back">
      <Icon name="arrowLeft" size={18} /> {t("place.back")}
    </Link>
  );
}

function PlaceView({ place }) {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const audio = useAudio();
  const price = formatPrice(place);
  const directions = directionsUrl(place);
  const isCurrent = audio.track?.id === place.id;
  const playing = isCurrent && audio.status === "playing";

  function listen() {
    if (playing) return audio.pause();
    if (isCurrent) audio.toggle();
    else audio.playPlace(place);
    document.getElementById("audio-guide")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const facts = [
    price && { icon: "price", label: t("place.price"), value: price },
    place.openingHours && { icon: "clock", label: t("place.hours"), value: place.openingHours },
    place.phone && {
      icon: "phone",
      label: t("place.phone"),
      value: <a href={`tel:${place.phone}`}>{place.phone}</a>,
    },
  ].filter(Boolean);

  return (
    <article className="tv-detail">
      <div className="tv-container">
        <div className="tv-detail-top">
          <BackLink />
          {isAdmin && (
            <Link to={`/admin/places/${place.id}/edit`} className="tv-link">
              <Icon name="edit" size={16} /> {t("place.admin")}
            </Link>
          )}
        </div>

        <header className="tv-detail-hero">
          <div className="tv-detail-media">
            <PlaceImage
              src={place.imageUrl}
              alt={place.name}
              className="tv-detail-img"
              loading="eager"
              fallback={<PlaceArt category={place.category} seed={place.id} className="tv-detail-img" />}
            />
          </div>
          <div className="tv-detail-intro">
            {place.category && <span className="tv-chip">{place.category}</span>}
            <h1>{place.name}</h1>
            {place.address && (
              <p className="tv-detail-address">
                <Icon name="pin" size={18} /> {[place.address, place.ward].filter(Boolean).join(", ")}
              </p>
            )}
            {facts.length > 0 && (
              <dl className="tv-facts">
                {facts.map((f) => (
                  <div key={f.icon}>
                    <dt>
                      <Icon name={f.icon} size={16} /> {f.label}
                    </dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="tv-detail-actions">
              {place.description?.trim() && audio.supported && (
                <button type="button" className="tv-btn tv-btn--primary tv-btn--lg" onClick={listen}>
                  <Icon name={playing ? "pause" : "headphones"} size={20} />
                  {playing ? t("place.pause") : t("place.listen")}
                </button>
              )}
              {directions && (
                <a className="tv-btn tv-btn--outline tv-btn--lg" href={directions} target="_blank" rel="noreferrer">
                  <Icon name="directions" size={20} /> {t("place.directions")}
                </a>
              )}
            </div>
          </div>
        </header>

        <div className="tv-detail-body">
          <div className="tv-detail-main">
            <About place={place} />
            <div id="audio-guide">
              <AudioPlayer place={place} />
            </div>
          </div>

          <aside className="tv-detail-side" aria-labelledby="location-title">
            <h2 id="location-title">{t("place.location")}</h2>
            {hasCoords(place) ? (
              <PlacesMap
                places={[place]}
                height={240}
                pannable
                showLabels={false}
                selectedId={place.id}
                labels={{ zoomIn: t("map.zoomIn"), zoomOut: t("map.zoomOut"), empty: t("place.noLocation") }}
              />
            ) : (
              <p className="tv-muted">{t("place.noLocation")}</p>
            )}
            {place.address && <p className="tv-detail-address">{place.address}</p>}
            {directions && (
              <a className="tv-btn tv-btn--outline tv-btn--block" href={directions} target="_blank" rel="noreferrer">
                <Icon name="directions" size={18} /> {t("place.directions")}
              </a>
            )}
          </aside>
        </div>

        <Related place={place} />
      </div>
    </article>
  );
}

// Mô tả theo ngôn ngữ giao diện (tiếng Việt là bản gốc, ngôn ngữ khác gọi API dịch)
function About({ place }) {
  const { t, lang } = useI18n();
  const [result, setResult] = useState({ lang: "vi", text: place.description, error: "" });
  const [retryKey, setRetryKey] = useState(0);
  const loading = result.lang !== lang;

  useEffect(() => {
    let ignore = false;
    getPlaceText(place, lang)
      .then((text) => !ignore && setResult({ lang, text, error: "" }))
      .catch((err) => !ignore && setResult({ lang, text: place.description, error: err.message }));
    return () => {
      ignore = true;
    };
  }, [place, lang, retryKey]);

  return (
    <section className="tv-about" aria-labelledby="about-title" aria-busy={loading}>
      <h2 id="about-title">{t("place.about")}</h2>
      {loading && <p className="tv-muted">{t("place.translating")}</p>}
      {!loading && result.error && (
        <p className="tv-note tv-note--warn">
          {t("place.translateError")} {t("place.showOriginal")}{" "}
          <button type="button" className="tv-link" onClick={() => setRetryKey((k) => k + 1)}>
            {t("state.retry")}
          </button>
        </p>
      )}
      <div className={loading ? "tv-prose is-loading" : "tv-prose"} lang={result.error ? "vi" : result.lang}>
        {(result.text ?? "")
          .split(/\n+/)
          .filter((p) => p.trim())
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>
      {!loading && !result.error && lang !== "vi" && <p className="tv-note">{t("place.autoTranslated")}</p>}
    </section>
  );
}

// Tối đa 3 địa điểm liên quan: cùng danh mục trước, thiếu thì bù địa điểm khác
function Related({ place }) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let ignore = false;
    const others = (list) => list.filter((p) => p.id !== place.id);
    (async () => {
      let list = place.category ? others((await getPlaces({ category: place.category, pageSize: 4 })).items) : [];
      if (list.length < RELATED) {
        const more = others((await getPlaces({ pageSize: 6 })).items).filter((p) => !list.some((x) => x.id === p.id));
        list = [...list, ...more];
      }
      if (!ignore) setItems(list.slice(0, RELATED));
    })().catch(() => {});
    return () => {
      ignore = true;
    };
  }, [place]);

  if (items.length === 0) return null;
  return (
    <section className="tv-section" aria-labelledby="related-title">
      <h2 id="related-title">{t("place.related")}</h2>
      <div className="tv-grid">
        {items.map((p) => (
          <PlaceCard key={p.id} place={p} />
        ))}
      </div>
    </section>
  );
}
