import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { deletePlace, getAllPlaces, getPlaceFilters, getPlaces } from "../../api";
import { useAuth } from "../../auth/useAuth";
import ConfirmDialog from "../../components/ConfirmDialog";
import Icon from "../../components/Icon";
import Pagination from "../../components/Pagination";
import PlaceImage from "../../components/PlaceImage";
import ProfilePips from "../../components/ProfilePips";
import { formatPrice } from "../../utils/format";
import { MISSING_FILTERS, isSamplePlace, matchesMissingFilter } from "../../utils/placeStatus";
import { useBrokenImages } from "../../utils/useBrokenImages";
import AdminLayout from "./AdminLayout";
import { useToast } from "./toastContext";

const PAGE_SIZE = 10;

export default function AdminPlacesPage() {
  const { token } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const ward = searchParams.get("ward") ?? "";
  const missing = searchParams.get("missing") ?? "";
  const page = Number(searchParams.get("page")) || 1;

  const [filters, setFilters] = useState({ categories: [], wards: [] });
  // data: trang kết quả từ server, hoặc { all } khi lọc "còn thiếu" (lọc ở trình duyệt)
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Bộ lọc gập lại cho gọn; tự mở khi đang có bộ lọc (vd. đi từ trang Tổng quan sang)
  const [showFilters, setShowFilters] = useState(Boolean(category || ward || missing));

  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    getPlaceFilters()
      .then(setFilters)
      .catch(() => {});
  }, [reloadKey]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");

    const params = { search, category, ward };
    const load = missing
      ? getAllPlaces(params).then((all) => ({ all }))
      : getPlaces({ ...params, page, pageSize: PAGE_SIZE });

    load
      .then((loaded) => {
        if (!ignore) setData(loaded);
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
  }, [search, category, ward, missing, page, reloadKey]);

  const brokenImages = useBrokenImages((data?.all ?? data?.items)?.map((p) => p.imageUrl));
  let result = data;
  if (data?.all) {
    const filtered = data.all.filter((p) => matchesMissingFilter(p, missing, { brokenImages }));
    result = {
      items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      total: filtered.length,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(filtered.length / PAGE_SIZE),
    };
  }

  function updateParams(changes) {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === "" || value == null) next.delete(key);
      else next.set(key, String(value));
    });
    if (!("page" in changes)) next.delete("page");
    setSearchParams(next);
  }

  function handleSearch(event) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("search");
    updateParams({ search: String(value).trim() });
  }

  function afterDelete(message) {
    toast(message);
    setDeleting(null);
    setReloadKey((k) => k + 1);
    if (result?.items.length === 1 && page > 1) updateParams({ page: page - 1 });
  }

  async function confirmDelete() {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deletePlace(token, deleting.id);
      afterDelete(`Đã xóa quán “${deleting.name}”.`);
    } catch (err) {
      if (err.status === 404) afterDelete(`Quán “${deleting.name}” đã bị xóa trước đó.`);
      else setDeleteError(err.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  const hasFilters = Boolean(search || category || ward || missing);
  const activeFilters = [category, ward, missing].filter(Boolean).length;
  const returnState = { returnTo: location.search };

  return (
    <AdminLayout
      title="Quán ăn"
      description="Thêm, sửa, xóa quán và nội dung thuyết minh hiển thị cho khách."
      actions={
        <Link to="/admin/places/new" state={returnState} className="btn btn-primary">
          <Icon name="plus" />
          Thêm quán
        </Link>
      }
    >
      <div className="toolbar">
        <div className="toolbar-top">
          <form className="search-field" onSubmit={handleSearch} role="search">
            <Icon name="search" />
            <input
              key={search}
              name="search"
              defaultValue={search}
              placeholder="Tìm theo tên, món, địa chỉ… (gõ không dấu cũng được)"
              aria-label="Tìm quán"
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Tìm
            </button>
          </form>
          <button
            type="button"
            className={showFilters ? "btn btn-secondary is-active" : "btn btn-secondary"}
            aria-expanded={showFilters}
            aria-controls="places-filters"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Icon name="filter" />
            Bộ lọc
            {activeFilters > 0 && <span className="count-badge">{activeFilters}</span>}
          </button>
        </div>

        <div className="toolbar-filters" id="places-filters" hidden={!showFilters}>
          <select
            value={category}
            onChange={(e) => updateParams({ category: e.target.value })}
            aria-label="Lọc theo loại món"
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
            aria-label="Lọc theo phường"
          >
            <option value="">Mọi phường</option>
            {filters.wards.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          <select
            value={missing}
            onChange={(e) => updateParams({ missing: e.target.value })}
            aria-label="Lọc theo hồ sơ"
          >
            <option value="">Mọi hồ sơ</option>
            {MISSING_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button type="button" className="btn-text" onClick={() => setSearchParams({})}>
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="notice notice--error">
          Không tải được danh sách: {error}
          <button type="button" className="btn-text" onClick={() => setReloadKey((k) => k + 1)}>
            Thử lại
          </button>
        </div>
      )}

      {loading && !result && <TableSkeleton />}

      {result && (
        <>
          <p className="result-count">
            {hasFilters ? `Tìm thấy ${result.total} quán` : `Tổng cộng ${result.total} quán`}
            {loading && <span className="muted"> (đang cập nhật…)</span>}
          </p>

          {result.items.length === 0 ? (
            <div className="surface empty-block">
              {page > 1 && result.total > 0 ? (
                <>
                  <h2>Trang {page} không có quán nào</h2>
                  <button type="button" className="btn btn-secondary" onClick={() => updateParams({ page: 1 })}>
                    Về trang 1
                  </button>
                </>
              ) : hasFilters ? (
                <>
                  <h2>Không có quán nào khớp bộ lọc</h2>
                  <p>Thử bỏ bớt điều kiện lọc hoặc tìm bằng từ khác.</p>
                  <button type="button" className="btn btn-secondary" onClick={() => setSearchParams({})}>
                    Xóa bộ lọc
                  </button>
                </>
              ) : (
                <>
                  <h2>Chưa có quán nào</h2>
                  <p>Thêm quán đầu tiên từ dữ liệu bạn đã khảo sát.</p>
                  <Link to="/admin/places/new" state={returnState} className="btn btn-primary">
                    <Icon name="plus" />
                    Thêm quán đầu tiên
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="surface table-surface">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Quán</th>
                    <th scope="col">Địa chỉ</th>
                    <th scope="col">Hồ sơ</th>
                    <th scope="col" className="col-actions">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((place) => {
                    const price = formatPrice(place);
                    return (
                      <tr key={place.id}>
                        <td>
                          <div className="place-cell">
                            <PlaceImage
                              src={place.imageUrl}
                              className="thumb"
                              fallbackClassName="thumb--empty"
                            />
                            <div className="place-cell-text">
                              <Link
                                to={`/admin/places/${place.id}/edit`}
                                state={returnState}
                                className="place-name"
                              >
                                {place.name}
                              </Link>
                              <span className="place-tags">
                                {place.category && <span className="tag">{place.category}</span>}
                                {isSamplePlace(place) && <span className="tag tag--sample">Mẫu</span>}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Địa chỉ">
                          {place.address || <span className="muted">Chưa có địa chỉ</span>}
                          {extra(place, price) && <div className="cell-sub">{extra(place, price)}</div>}
                        </td>
                        <td data-label="Hồ sơ">
                          <ProfilePips place={place} brokenImages={brokenImages} />
                        </td>
                        <td className="col-actions">
                          <div className="row-actions">
                            <Link
                              to={`/admin/places/${place.id}/edit`}
                              state={returnState}
                              className="btn btn-secondary btn-sm"
                              aria-label={`Sửa ${place.name}`}
                            >
                              <Icon name="edit" size={16} />
                              Sửa
                            </Link>
                            <Link
                              to={`/places/${place.id}`}
                              className="admin-icon-button"
                              aria-label={`Xem ${place.name} như khách`}
                              title="Xem như khách"
                            >
                              <Icon name="eye" />
                            </Link>
                            <button
                              type="button"
                              className="admin-icon-button admin-icon-button--danger"
                              onClick={() => {
                                setDeleteError("");
                                setDeleting(place);
                              }}
                              aria-label={`Xóa ${place.name}`}
                              title="Xóa"
                            >
                              <Icon name="trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa quán?"
        confirmLabel="Xóa quán"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>
          Quán <strong>{deleting?.name}</strong> và toàn bộ bản dịch đã lưu của quán sẽ bị xóa vĩnh viễn.
          Không thể hoàn tác.
        </p>
      </ConfirmDialog>
    </AdminLayout>
  );
}

// Dòng phụ dưới địa chỉ: phường, giá, giờ mở cửa (thiếu mục nào thì bỏ, ô "Hồ sơ" đã báo thiếu)
const extra = (place, price) => [place.ward, price, place.openingHours].filter(Boolean).join(" · ");

function TableSkeleton() {
  return (
    <div className="surface table-surface" aria-busy="true" aria-label="Đang tải danh sách">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton skeleton--thumb" />
          <div className="skeleton skeleton--line" />
        </div>
      ))}
    </div>
  );
}
