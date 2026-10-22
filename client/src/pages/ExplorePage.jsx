import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { getPlaceFilters, getPlaces } from "../api";
import CategoryChips from "../components/CategoryChips";
import Icon from "../components/Icon";
import PlaceCard from "../components/PlaceCard";
import { CardSkeletons, EmptyState, ErrorState } from "../components/StateViews";
import { useI18n } from "../i18n/useI18n";

const PAGE_SIZE = 9;
const PRICE_OPTIONS = [30000, 50000, 100000];

export default function ExplorePage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({ categories: [], wards: [] });
  // Kết quả gắn với bộ lọc đã gửi đi: bộ lọc hiện tại khác thì đang tải
  const [response, setResponse] = useState({ query: null, result: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  // Toàn bộ trạng thái tìm kiếm nằm trên địa chỉ trang (gửi link cho người khác vẫn đúng)
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const ward = searchParams.get("ward") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
  const [showFilters, setShowFilters] = useState(Boolean(ward || maxPrice));

  useEffect(() => {
    getPlaceFilters()
      .then(setFilters)
      .catch(() => {});
  }, []);

  const query = JSON.stringify({ search, category, ward, maxPrice, page, reloadKey });
  const loading = response.query !== query;
  const error = loading ? null : response.error;
  const result = response.result;

  useEffect(() => {
    let ignore = false;
    const { reloadKey: _, ...params } = JSON.parse(query);
    getPlaces({ ...params, pageSize: PAGE_SIZE })
      .then((data) => !ignore && setResponse({ query, result: data, error: null }))
      .catch((err) => !ignore && setResponse((r) => ({ ...r, query, error: err })));
    return () => {
      ignore = true;
    };
  }, [query]);

  function updateParams(changes) {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === "" || value == null) next.delete(key);
      else next.set(key, value);
    });
    // Đổi bộ lọc thì quay về trang 1
    if (!("page" in changes)) next.delete("page");
    setSearchParams(next);
  }

  function handleSearch(event) {
    event.preventDefault();
    updateParams({ search: String(new FormData(event.currentTarget).get("search")).trim() });
  }

  function goToPage(p) {
    updateParams({ page: p });
    window.scrollTo({ top: 0 });
  }

  const hasFilters = search || category || ward || maxPrice;
  const extraFilters = (ward ? 1 : 0) + (maxPrice ? 1 : 0);
  const clear = (
    <button type="button" className="tv-btn tv-btn--outline" onClick={() => setSearchParams({})}>
      {t("explore.clear")}
    </button>
  );

  return (
    <div className="tv-container tv-page">
      <header className="tv-page-head">
        <h1>{t("explore.title")}</h1>
        <p>{t("explore.text")}</p>
      </header>

      <div className="tv-toolbar">
        <form className="tv-search" role="search" onSubmit={handleSearch}>
          <Icon name="search" size={20} />
          <input
            key={search}
            name="search"
            type="search"
            defaultValue={search}
            placeholder={t("explore.search")}
            aria-label={t("explore.searchLabel")}
          />
        </form>
        <button
          type="button"
          className={showFilters ? "tv-btn tv-btn--outline is-active" : "tv-btn tv-btn--outline"}
          aria-expanded={showFilters}
          aria-controls="explore-filters"
          onClick={() => setShowFilters((s) => !s)}
        >
          <Icon name="filter" size={18} />
          {t("explore.filters")}
          {extraFilters > 0 && <span className="tv-count">{extraFilters}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="tv-filters" id="explore-filters">
          <label>
            <span>{t("explore.ward")}</span>
            <select value={ward} onChange={(e) => updateParams({ ward: e.target.value })}>
              <option value="">{t("explore.anyWard")}</option>
              {filters.wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("explore.price")}</span>
            <select value={maxPrice} onChange={(e) => updateParams({ maxPrice: e.target.value })}>
              <option value="">{t("explore.anyPrice")}</option>
              {PRICE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {t("explore.priceUpTo", { price: `${p.toLocaleString("vi-VN")}đ` })}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <CategoryChips categories={filters.categories} value={category} onChange={(c) => updateParams({ category: c })} />

      <div className="tv-results-bar">
        {result && <span>{t("explore.results", { count: result.total })}</span>}
        {hasFilters && (
          <button type="button" className="tv-link" onClick={() => setSearchParams({})}>
            {t("explore.clear")}
          </button>
        )}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !result ? (
        <CardSkeletons count={6} />
      ) : result.items.length === 0 ? (
        <EmptyState title={t("explore.empty.title")} text={t("explore.empty.text")} action={hasFilters && clear} />
      ) : (
        <>
          <div className={loading ? "tv-grid is-loading" : "tv-grid"}>
            {result.items.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
          {result.totalPages > 1 && (
            <nav className="tv-pager" aria-label={t("explore.page", { page: result.page, total: result.totalPages })}>
              <button
                type="button"
                className="tv-btn tv-btn--outline"
                disabled={result.page <= 1}
                onClick={() => goToPage(result.page - 1)}
              >
                <Icon name="arrowLeft" size={18} /> {t("explore.prev")}
              </button>
              <span>{t("explore.page", { page: result.page, total: result.totalPages })}</span>
              <button
                type="button"
                className="tv-btn tv-btn--outline"
                disabled={result.page >= result.totalPages}
                onClick={() => goToPage(result.page + 1)}
              >
                {t("explore.next")} <Icon name="arrowRight" size={18} />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
