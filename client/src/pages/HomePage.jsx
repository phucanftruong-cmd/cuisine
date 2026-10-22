import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getPlaces } from "../api";
import Icon from "../components/Icon";
import PlaceCard from "../components/PlaceCard";
import heroImage from "../assets/quan6.jpg";
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

// Ảnh hero: toàn cảnh Quận 6 nhìn từ trên cao (chợ Bình Tây ở trung tâm)
function HeroArt() {
  return (
    <div className="tv-hero-art">
      <img src={heroImage} alt="" width="554" height="554" fetchPriority="high" />
    </div>
  );
}
