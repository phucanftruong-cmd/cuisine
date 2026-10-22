import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { getPlaceFilters, getPlaces } from "../api";
import PlaceCard from "../components/PlaceCard";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 6;

const PRICE_OPTIONS = [
  { value: "", label: "Mọi mức giá" },
  { value: "30000", label: "Giá từ tối đa 30.000đ" },
  { value: "50000", label: "Giá từ tối đa 50.000đ" },
  { value: "100000", label: "Giá từ tối đa 100.000đ" },
];

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({ categories: [], wards: [] });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Toàn bộ trạng thái tìm kiếm nằm trên địa chỉ trang
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const ward = searchParams.get("ward") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const page = Number(searchParams.get("page")) || 1;

  useEffect(() => {
    getPlaceFilters()
      .then(setFilters)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");

    getPlaces({ search, category, ward, maxPrice, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (!ignore) setResult(data);
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [search, category, ward, maxPrice, page]);

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
    const value = new FormData(event.currentTarget).get("search");
    updateParams({ search: String(value).trim() });
  }

  const hasFilters = search || category || ward || maxPrice;

  return (
    <>
      <h1>Khám phá ẩm thực Quận 6</h1>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          key={search}
          name="search"
          defaultValue={search}
          placeholder="Tìm quán, món, địa chỉ... (gõ không dấu cũng được)"
        />
        <button type="submit">Tìm</button>
      </form>

      <div className="filters">
        <select
          value={category}
          onChange={(e) => updateParams({ category: e.target.value })}
        >
          <option value="">Mọi loại món</option>
          {filters.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={ward}
          onChange={(e) => updateParams({ ward: e.target.value })}
        >
          <option value="">Mọi phường</option>
          {filters.wards.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>

        <select
          value={maxPrice}
          onChange={(e) => updateParams({ maxPrice: e.target.value })}
        >
          {PRICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            className="link-button"
            onClick={() => setSearchParams({})}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {error && <p className="error">Không tải được dữ liệu: {error}</p>}
      {loading && !result && <p className="muted">Đang tải...</p>}

      {result && (
        <>
          <p className="muted">
            {result.total} quán{loading ? " (đang cập nhật...)" : ""}
          </p>

          {result.items.length === 0 ? (
            <p>Không tìm thấy quán phù hợp.</p>
          ) : (
            <div className="grid">
              {result.items.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          )}

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            onChange={(p) => {
              updateParams({ page: p });
              window.scrollTo({ top: 0 });
            }}
          />
        </>
      )}
    </>
  );
}