import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getPlaces } from "../api";
import Icon from "../components/Icon";
import PlaceCard from "../components/PlaceCard";
import { CardSkeletons, ErrorState } from "../components/StateViews";
import { LANGUAGES } from "../i18n/messages";
import { useI18n } from "../i18n/useI18n";

const FEATURED = 6;

const BENEFITS = [
  { icon: "utensils", key: "culture" },
  { icon: "headphones", key: "language" },
  { icon: "directions", key: "route" },
];

export default function HomePage() {
  const { t } = useI18n();
  const [places, setPlaces] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    getPlaces({ pageSize: FEATURED })
      .then((data) => !ignore && setPlaces(data.items))
      .catch((err) => !ignore && setError(err));
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  return (
    <>
      <section className="tv-hero">
        <div className="tv-container tv-hero-inner">
          <div className="tv-hero-text">
            <p className="tv-eyebrow">{t("home.hero.eyebrow")}</p>
            <h1>{t("home.hero.title")}</h1>
            <p className="tv-hero-lead">{t("home.hero.text")}</p>
            <div className="tv-hero-actions">
              <Link to="/explore" className="tv-btn tv-btn--primary tv-btn--lg">
                {t("home.hero.explore")} <Icon name="arrowRight" size={18} />
              </Link>
              <Link to="/map" className="tv-btn tv-btn--ghost tv-btn--lg">
                <Icon name="map" size={18} /> {t("home.hero.map")}
              </Link>
            </div>
            <p className="tv-hero-note">
              <Icon name="headphones" size={16} /> {t("home.hero.languages", { count: LANGUAGES.length })}
            </p>
          </div>
          <HeroArt />
        </div>
      </section>

      <section className="tv-container tv-section" aria-labelledby="featured-title">
        <div className="tv-section-head">
          <div>
            <h2 id="featured-title">{t("home.featured.title")}</h2>
            <p>{t("home.featured.text")}</p>
          </div>
          <Link to="/explore" className="tv-link">
            {t("home.featured.all")} <Icon name="arrowRight" size={16} />
          </Link>
        </div>
        {error ? (
          <ErrorState
            error={error}
            onRetry={() => {
              setError(null);
              setReloadKey((k) => k + 1);
            }}
          />
        ) : !places ? (
          <CardSkeletons count={3} />
        ) : (
          <div className="tv-grid">
            {places.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        )}
      </section>

      <section className="tv-container tv-section" aria-labelledby="why-title">
        <h2 id="why-title" className="tv-center">
          {t("home.why.title")}
        </h2>
        <ul className="tv-benefits">
          {BENEFITS.map((b) => (
            <li key={b.key}>
              <span className="tv-benefit-icon">
                <Icon name={b.icon} size={24} />
              </span>
              <h3>{t(`home.why.${b.key}.title`)}</h3>
              <p>{t(`home.why.${b.key}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

// Minh họa hero: dãy phố chợ với mái ngói, đèn lồng và sóng âm (thay bằng ảnh thật ở client/public/hero.jpg nếu có)
function HeroArt() {
  return (
    <div className="tv-hero-art" aria-hidden="true">
      <svg viewBox="0 0 480 380" role="presentation">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#DDF3EF" />
            <stop offset="1" stopColor="#F7F9FA" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="480" height="380" rx="28" fill="url(#sky)" />
        <circle cx="380" cy="86" r="34" fill="#E9B86E" opacity=".9" />
        {/* dãy nhà phố */}
        <g fill="#fff" stroke="#147D78" strokeWidth="3" strokeLinejoin="round">
          <path d="M40 330V170l50-34 50 34v160z" />
          <path d="M140 330V140l60-40 60 40v190z" />
          <path d="M260 330V180l50-30 50 30v150z" />
          <path d="M360 330V200l40-26 40 26v130z" />
        </g>
        {/* mái ngói */}
        <g fill="#147D78" opacity=".9">
          <path d="M30 172 90 128l60 44-10 6-50-36-50 36z" />
          <path d="M130 142 200 92l70 50-10 6-60-42-60 42z" />
          <path d="M250 182 310 142l60 40-10 6-50-32-50 32z" />
          <path d="M352 202 400 168l48 34-8 6-40-28-40 28z" />
        </g>
        {/* cửa, cửa sổ */}
        <g fill="#DDF3EF" stroke="#147D78" strokeWidth="2.5">
          <rect x="70" y="250" width="40" height="80" rx="4" />
          <rect x="176" y="236" width="48" height="94" rx="4" />
          <rect x="290" y="250" width="40" height="80" rx="4" />
          <rect x="384" y="262" width="32" height="68" rx="4" />
          <rect x="62" y="196" width="22" height="26" rx="3" />
          <rect x="96" y="196" width="22" height="26" rx="3" />
          <rect x="164" y="166" width="26" height="30" rx="3" />
          <rect x="210" y="166" width="26" height="30" rx="3" />
          <rect x="282" y="204" width="56" height="24" rx="3" />
        </g>
        {/* dây đèn lồng */}
        <path d="M20 112c80 40 180 40 260 10s140-26 190 4" fill="none" stroke="#202B33" strokeWidth="1.5" opacity=".4" />
        <g fill="#E9B86E" stroke="#B97E2E" strokeWidth="2">
          <ellipse cx="70" cy="140" rx="12" ry="15" />
          <ellipse cx="150" cy="152" rx="12" ry="15" />
          <ellipse cx="240" cy="140" rx="12" ry="15" />
          <ellipse cx="330" cy="118" rx="12" ry="15" />
          <ellipse cx="420" cy="122" rx="12" ry="15" />
        </g>
        {/* mặt đường */}
        <rect x="0" y="330" width="480" height="50" fill="#147D78" opacity=".12" />
        {/* ghim bản đồ + sóng âm */}
        <g transform="translate(206 20)">
          <path d="M34 0C15 0 0 15 0 33c0 25 34 55 34 55s34-30 34-55C68 15 53 0 34 0z" fill="#147D78" />
          <path d="M20 34v6M27 26v22M34 20v34M41 26v22M48 34v6" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
