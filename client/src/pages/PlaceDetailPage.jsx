import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getPlace, getTranslation } from "../api";
import { useAuth } from "../auth/useAuth";
import { formatPrice } from "../utils/format";

const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh-CN", label: "简体中文" },
];

export default function PlaceDetailPage() {
  const { id } = useParams();
  // key={id}: đổi sang quán khác thì làm lại từ đầu
  return <PlaceDetail key={id} id={id} />;
}

function PlaceDetail({ id }) {
  const { isAdmin } = useAuth();
  const [place, setPlace] = useState(null);
  const [error, setError] = useState("");
  const [lang, setLang] = useState("vi");
  const [translations, setTranslations] = useState({});
  const [translateErrors, setTranslateErrors] = useState({});
  const [loadingLang, setLoadingLang] = useState(null);

  useEffect(() => {
    getPlace(id)
      .then(setPlace)
      .catch((err) => setError(err.message));
  }, [id]);

  function translate(code) {
    setTranslateErrors((prev) => ({ ...prev, [code]: "" }));
    setLoadingLang(code);

    getTranslation(id, code)
      .then((data) =>
        setTranslations((prev) => ({ ...prev, [code]: data.translatedText })),
      )
      .catch((err) =>
        setTranslateErrors((prev) => ({ ...prev, [code]: err.message })),
      )
      .finally(() =>
        setLoadingLang((current) => (current === code ? null : current)),
      );
  }

  function handleLanguageChange(code) {
    setLang(code);
    if (code !== "vi" && !translations[code] && loadingLang !== code) {
      translate(code);
    }
  }

  if (error) {
    return (
      <>
        <Link to="/" className="back">
          ← Quay lại
        </Link>
        <p className="error">Không tải được quán: {error}</p>
      </>
    );
  }
  if (!place) return <p className="muted">Đang tải...</p>;

  const price = formatPrice(place);
  const text = lang === "vi" ? place.description : translations[lang];
  const hasMap = place.latitude != null && place.longitude != null;

  return (
    <>
      <div className="detail-top">
        <Link to="/" className="back">
          ← Quay lại danh sách
        </Link>
        {isAdmin && (
          <Link to={`/admin/places/${id}/edit`} className="action-link">
            ✏️ Sửa quán này
          </Link>
        )}
      </div>

      <article className="detail">
        {place.imageUrl && (
          <img src={place.imageUrl} alt={place.name} className="detail-image" />
        )}

        {place.category && <span className="badge">{place.category}</span>}
        <h1>{place.name}</h1>

        <ul className="info-list">
          {place.address && (
            <li>
              📍 {place.address}
              {place.ward ? `, ${place.ward}` : ""}
            </li>
          )}
          {price && <li>💰 {price}</li>}
          {place.openingHours && <li>🕒 {place.openingHours}</li>}
          {place.phone && (
            <li>
              📞 <a href={`tel:${place.phone}`}>{place.phone}</a>
            </li>
          )}
          {hasMap && (
            <li>
              🗺️{" "}
              <a
                href={`https://www.google.com/maps?q=${place.latitude},${place.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Xem trên bản đồ
              </a>
            </li>
          )}
        </ul>

        <div className="lang-bar">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={l.code === lang ? "lang active" : "lang"}
              onClick={() => handleLanguageChange(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>

        {lang !== "vi" && loadingLang === lang && (
          <p className="muted">Đang dịch...</p>
        )}
        {lang !== "vi" && translateErrors[lang] && (
          <p className="error">
            {translateErrors[lang]}{" "}
            <button className="link-button" onClick={() => translate(lang)}>
              Thử lại
            </button>
          </p>
        )}

        {text && <p className="description">{text}</p>}
        {lang !== "vi" && text && (
          <p className="note">Bản dịch tự động, có thể chưa chính xác.</p>
        )}
      </article>
    </>
  );
}