import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { getAllPlaces } from "../api";
import { useAudio } from "../audio/useAudio";
import CategoryChips from "../components/CategoryChips";
import Icon from "../components/Icon";
import PlaceArt from "../components/PlaceArt";
import PlaceImage from "../components/PlaceImage";
import PlacesMap from "../components/PlacesMap";
import { ErrorState } from "../components/StateViews";
import { useI18n } from "../i18n/useI18n";
import { directionsUrl } from "../utils/directions";
import { distanceMeters, formatDistance, hasCoords } from "../utils/geo";

// Bản đồ toàn màn hình. Desktop: danh sách ở cột phải. Mobile: danh sách là bottom sheet kéo lên/xuống.
export default function MapPage() {
  const { t, lang } = useI18n();
  const [places, setPlaces] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  useEffect(() => {
    let ignore = false;
    getAllPlaces()
      .then((items) => !ignore && setPlaces(items))
      .catch((err) => !ignore && setError(err));
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const categories = useMemo(
    () => [...new Set((places ?? []).map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")),
    [places],
  );

  const visible = useMemo(() => {
    const list = (places ?? []).filter((p) => !category || p.category === category);
    const withDistance = list.map((p) => ({
      place: p,
      distance: me && hasCoords(p) ? distanceMeters(me, { lat: p.latitude, lng: p.longitude }) : null,
    }));
    // Có vị trí của khách thì gần nhất lên đầu
    if (me) withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    return withDistance;
  }, [places, category, me]);

  const onMap = visible.filter((v) => hasCoords(v.place));
  const offMap = visible.filter((v) => !hasCoords(v.place));
  const selected = visible.find((v) => v.place.id === selectedId) ?? null;

  function select(place) {
    setSelectedId(place.id);
    setSheetOpen(true);
  }

  function locate() {
    if (!navigator.geolocation) return setLocateError(t("map.locationDenied"));
    setLocating(true);
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocateError(t("map.locationDenied"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="tv-map-page">
      <div className="tv-map-area">
        {error ? (
          <ErrorState error={error} onRetry={() => {
              setError(null);
              setReloadKey((k) => k + 1);
            }}
          />
        ) : !places ? (
          <div className="tv-skeleton tv-skeleton--fill" aria-busy="true" aria-label={t("state.loading")} />
        ) : (
          <PlacesMap
            key={category}
            places={onMap.map((v) => v.place)}
            height="100%"
            onSelect={select}
            selectedId={selectedId}
            userLocation={me}
            labels={{ zoomIn: t("map.zoomIn"), zoomOut: t("map.zoomOut"), empty: t("map.empty") }}
          />
        )}
      </div>

      <section className={sheetOpen ? "tv-map-panel is-open" : "tv-map-panel"} aria-labelledby="map-title">
        <button
          type="button"
          className="tv-sheet-handle"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen((o) => !o)}
        >
          <span className="tv-sheet-grip" aria-hidden="true" />
          <span>{sheetOpen ? t("map.hideList") : t("map.showList")}</span>
          <Icon name={sheetOpen ? "chevronDown" : "chevronUp"} size={18} />
        </button>

        <div className="tv-map-panel-head">
          <div>
            <h1 id="map-title">{t("map.title")}</h1>
            <p className="tv-muted">{places ? t("map.count", { count: visible.length }) : t("map.text")}</p>
          </div>
          <button type="button" className="tv-btn tv-btn--outline tv-btn--sm" onClick={locate} disabled={locating}>
            <Icon name="locate" size={16} />
            {locating ? t("map.locating") : t("map.useLocation")}
          </button>
        </div>
        {locateError && <p className="tv-note tv-note--warn">{locateError}</p>}

        <CategoryChips
          categories={categories}
          value={category}
          onChange={(c) => {
            setCategory(c);
            setSelectedId(null);
          }}
        />

        <div className="tv-map-panel-body">
          {selected && <SelectedPlace item={selected} lang={lang} onClose={() => setSelectedId(null)} />}

          <h2 className="tv-map-list-title">{t("map.list")}</h2>
          <ul className="tv-map-list">
            {onMap.map((v) => (
              <PlaceRow key={v.place.id} item={v} lang={lang} active={v.place.id === selectedId} onSelect={select} />
            ))}
          </ul>
          {offMap.length > 0 && (
            <>
              <h2 className="tv-map-list-title">{t("map.noCoords")}</h2>
              <ul className="tv-map-list">
                {offMap.map((v) => (
                  <li key={v.place.id}>
                    <Link to={`/places/${v.place.id}`} className="tv-map-row">
                      <RowBody item={v} lang={lang} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function RowBody({ item: { place, distance }, lang }) {
  return (
    <>
      <span className="tv-map-thumb">
        <PlaceImage
          src={place.imageUrl}
          alt=""
          className="tv-map-thumb-img"
          fallback={<PlaceArt category={place.category} seed={place.id} className="tv-map-thumb-img" />}
        />
      </span>
      <span className="tv-map-row-text">
        <strong>{place.name}</strong>
        <span>
          {[place.category, distance != null && formatDistance(distance, lang)].filter(Boolean).join(" · ")}
        </span>
      </span>
    </>
  );
}

function PlaceRow({ item, lang, active, onSelect }) {
  return (
    <li>
      <button
        type="button"
        className={active ? "tv-map-row is-active" : "tv-map-row"}
        aria-pressed={active}
        onClick={() => onSelect(item.place)}
      >
        <RowBody item={item} lang={lang} />
      </button>
    </li>
  );
}

// Thẻ địa điểm đang chọn trên bản đồ
function SelectedPlace({ item: { place, distance }, lang, onClose }) {
  const { t } = useI18n();
  const audio = useAudio();
  const directions = directionsUrl(place);
  const playing = audio.track?.id === place.id && audio.status === "playing";
  const summary = place.description?.trim();

  return (
    <div className="tv-map-selected" aria-live="polite">
      <div className="tv-map-selected-media">
        <PlaceImage
          src={place.imageUrl}
          alt=""
          className="tv-map-selected-img"
          fallback={<PlaceArt category={place.category} seed={place.id} className="tv-map-selected-img" />}
        />
        <button type="button" className="tv-icon-btn tv-map-selected-close" onClick={onClose} aria-label={t("nav.close")}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="tv-map-selected-body">
        {place.category && <span className="tv-chip">{place.category}</span>}
        <h2>{place.name}</h2>
        {distance != null && <p className="tv-muted">{t("map.distance", { distance: formatDistance(distance, lang) })}</p>}
        {summary && <p className="tv-map-selected-text">{summary}</p>}
        <div className="tv-map-selected-actions">
          {summary && audio.supported && (
            <button
              type="button"
              className="tv-btn tv-btn--primary tv-btn--sm"
              onClick={() => (playing ? audio.pause() : audio.playPlace(place))}
            >
              <Icon name={playing ? "pause" : "play"} size={16} />
              {playing ? t("card.pause") : t("card.listen")}
            </button>
          )}
          {directions && (
            <a className="tv-btn tv-btn--outline tv-btn--sm" href={directions} target="_blank" rel="noreferrer">
              <Icon name="directions" size={16} /> {t("place.directions")}
            </a>
          )}
          <Link to={`/places/${place.id}`} className="tv-link">
            {t("map.viewDetail")} <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
