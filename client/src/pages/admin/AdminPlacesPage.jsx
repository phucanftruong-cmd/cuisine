import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { deletePlace, getPlaceFilters, getPlaces } from "../../api";
import { useAuth } from "../../auth/useAuth";
import ConfirmDialog from "../../components/ConfirmDialog";
import Pagination from "../../components/Pagination";
import { formatPrice } from "../../utils/format";

const PAGE_SIZE = 10;

export default function AdminPlacesPage() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const ward = searchParams.get("ward") ?? "";
  const page = Number(searchParams.get("page")) || 1;

  const [filters, setFilters] = useState({ categories: [], wards: [] });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Thông báo sau khi thêm/sửa (trang form gửi qua location.state) hoặc sau khi xóa
  const [flash, setFlash] = useState(() => location.state?.flash ?? "");

  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Xóa state khỏi lịch sử để tải lại trang không hiện lại thông báo cũ
  useEffect(() => {
    if (location.state?.flash) {
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
    }
  }, [location, navigate]);

  useEffect(() => {
    getPlaceFilters()
      .then(setFilters)
      .catch(() => {});
  }, [reloadKey]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");

    getPlaces({ search, category, ward, page, pageSize: PAGE_SIZE })
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
  }, [search, category, ward, page, reloadKey]);

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

  function openDelete(place) {
    setDeleteError("");
    setDeleting(place);
  }

  function closeDelete() {
    setDeleting(null);
    setDeleteError("");
  }

  // Sau khi xóa: tải lại danh sách; nếu vừa xóa quán cuối cùng của trang thì lùi một trang
  function afterDelete(message) {
    setFlash(message);
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

  const hasFilters = search || category || ward;
  const returnState = { returnTo: location.search };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Quản lý quán ăn</h1>
          <p className="muted">
            Thêm, sửa, xóa quán và nội dung thuyết minh hiển thị cho khách.
          </p>
        </div>
        <Link to="/admin/places/new" state={returnState} className="button-link">
          + Thêm quán
        </Link>
      </div>

      {flash && (
        <div className="alert alert--success" role="status">
          <span>{flash}</span>
          <button
            type="button"
            className="alert-close"
            aria-label="Đóng thông báo"
            onClick={() => setFlash("")}
          >
            ×
          </button>
        </div>
      )}

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          key={search}
          name="search"
          defaultValue={search}
          placeholder="Tìm theo tên, món, địa chỉ... (gõ không dấu cũng được)"
          aria-label="Tìm quán"
        />
        <button type="submit">Tìm</button>
      </form>

      <div className="filters">
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
        {hasFilters && (
          <button type="button" className="link-button" onClick={() => setSearchParams({})}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      {error && (
        <p className="alert alert--error">
          Không tải được danh sách: {error}{" "}
          <button type="button" className="link-button" onClick={() => setReloadKey((k) => k + 1)}>
            Thử lại
          </button>
        </p>
      )}
      {loading && !result && <p className="muted">Đang tải...</p>}

      {result && (
        <>
          <p className="muted">
            {hasFilters ? `Tìm thấy ${result.total} quán` : `Tổng cộng ${result.total} quán`}
            {loading ? " (đang cập nhật...)" : ""}
          </p>

          {result.items.length === 0 ? (
            <div className="empty-state">
              {page > 1 && result.total > 0 ? (
                <>
                  <p>Trang {page} không có quán nào.</p>
                  <button type="button" onClick={() => updateParams({ page: 1 })}>
                    Về trang 1
                  </button>
                </>
              ) : hasFilters ? (
                <p>Không có quán nào khớp với bộ lọc.</p>
              ) : (
                <>
                  <p>Chưa có quán nào.</p>
                  <Link to="/admin/places/new" state={returnState} className="button-link">
                    Thêm quán đầu tiên
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Quán</th>
                    <th scope="col">Địa chỉ</th>
                    <th scope="col">Giá</th>
                    <th scope="col">Giờ mở cửa</th>
                    <th scope="col" className="col-actions">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((place) => (
                    <tr key={place.id}>
                      <td>
                        <div className="place-cell">
                          {place.imageUrl ? (
                            <img src={place.imageUrl} alt="" className="thumb" loading="lazy" />
                          ) : (
                            <div className="thumb thumb--empty" aria-hidden="true">
                              🍜
                            </div>
                          )}
                          <div>
                            <strong>{place.name}</strong>
                            {place.category && (
                              <div>
                                <span className="badge">{place.category}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td data-label="Địa chỉ">
                        {place.address || <span className="muted">Chưa có</span>}
                        {place.ward && <div className="muted small">{place.ward}</div>}
                      </td>
                      <td data-label="Giá">
                        {formatPrice(place) ?? <span className="muted">Chưa có</span>}
                      </td>
                      <td data-label="Giờ mở cửa">
                        {place.openingHours || <span className="muted">Chưa có</span>}
                      </td>
                      <td className="col-actions">
                        <div className="row-actions">
                          <Link to={`/places/${place.id}`} className="action-link">
                            Xem
                          </Link>
                          <Link
                            to={`/admin/places/${place.id}/edit`}
                            state={returnState}
                            className="action-link"
                          >
                            Sửa
                          </Link>
                          <button
                            type="button"
                            className="action-link action-link--danger"
                            onClick={() => openDelete(place)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
        onCancel={closeDelete}
      >
        <p>
          Quán <strong>{deleting?.name}</strong> và toàn bộ bản dịch đã lưu của quán sẽ bị
          xóa vĩnh viễn. Không thể hoàn tác.
        </p>
      </ConfirmDialog>
    </>
  );
}
