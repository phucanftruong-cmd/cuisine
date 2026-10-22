import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { getAllPlaces } from "../../api";
import Icon from "../../components/Icon";
import PlaceImage from "../../components/PlaceImage";
import {
  PROFILE_ITEMS,
  getMissingItems,
  isProfileComplete,
  isSamplePlace,
  summarizePlaces,
} from "../../utils/placeStatus";
import { useBrokenImages } from "../../utils/useBrokenImages";
import AdminLayout from "./AdminLayout";

const TODO_LIMIT = 6;

export default function AdminDashboardPage() {
  const [places, setPlaces] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    getAllPlaces()
      .then((items) => {
        if (!ignore) {
          setPlaces(items);
          setError("");
        }
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const brokenImages = useBrokenImages(places?.map((p) => p.imageUrl));
  const brokenKey = [...brokenImages].join("\n");
  const ctx = useMemo(() => ({ brokenImages: new Set(brokenKey ? brokenKey.split("\n") : []) }), [brokenKey]);
  const summary = useMemo(() => (places ? summarizePlaces(places, ctx) : null), [places, ctx]);
  const todo = useMemo(
    () => (places ? places.filter((p) => !isProfileComplete(p, ctx)) : []),
    [places, ctx],
  );

  return (
    <AdminLayout
      title="Tổng quan"
      description="Theo dõi các quán đã nhập đủ thông tin cho khách chưa."
      actions={
        <Link to="/admin/places/new" className="btn btn-primary">
          <Icon name="plus" />
          Thêm quán
        </Link>
      }
    >
      {error && (
        <div className="notice notice--error">
          Không tải được dữ liệu: {error}
          <button type="button" className="btn-text" onClick={() => setReloadKey((k) => k + 1)}>
            Thử lại
          </button>
        </div>
      )}

      {!summary && !error && <DashboardSkeleton />}

      {summary && summary.total === 0 && (
        <section className="surface empty-block">
          <h2>Chưa có quán nào</h2>
          <p>Thêm quán đầu tiên từ dữ liệu bạn đã khảo sát. Khách sẽ thấy quán ngay sau khi lưu.</p>
          <Link to="/admin/places/new" className="btn btn-primary">
            <Icon name="plus" />
            Thêm quán
          </Link>
        </section>
      )}

      {summary && summary.total > 0 && (
        <>
          <section className="surface ledger" aria-labelledby="ledger-title">
            <div className="ledger-head">
              <h2 id="ledger-title">
                <span className="ledger-count">{summary.complete}</span>
                <span className="ledger-of"> / {summary.total} quán</span> đã đủ hồ sơ
              </h2>
              <p>
                Một quán đủ hồ sơ khi có địa chỉ, ảnh, vị trí bản đồ, giá và giờ mở cửa, và không còn là
                dữ liệu mẫu.
              </p>
            </div>

            <ol className="ledger-strip" aria-label="Hồ sơ từng quán">
              {places.map((place) => {
                const missing = getMissingItems(place, ctx);
                const sample = isSamplePlace(place);
                const state = sample ? "sample" : missing.length === 0 ? "done" : "todo";
                const label = sample
                  ? `${place.name}: dữ liệu mẫu`
                  : missing.length === 0
                    ? `${place.name}: đủ hồ sơ`
                    : `${place.name}: thiếu ${missing.map((m) => m.label.toLowerCase()).join(", ")}`;
                return (
                  <li key={place.id}>
                    <Link
                      to={`/admin/places/${place.id}/edit`}
                      className={`ledger-cell ledger-cell--${state}`}
                      title={label}
                      aria-label={label}
                    />
                  </li>
                );
              })}
            </ol>
            <ul className="ledger-legend">
              <li>
                <span className="ledger-cell ledger-cell--done" aria-hidden="true" /> Đủ hồ sơ
              </li>
              <li>
                <span className="ledger-cell ledger-cell--todo" aria-hidden="true" /> Còn thiếu thông tin
              </li>
              <li>
                <span className="ledger-cell ledger-cell--sample" aria-hidden="true" /> Dữ liệu mẫu, cần thay
              </li>
            </ul>
          </section>

          <section className="gaps" aria-label="Thông tin còn thiếu">
            {PROFILE_ITEMS.map((item) => {
              const count = summary.missingCounts[item.key];
              return (
                <Link
                  key={item.key}
                  to={`/admin/places?missing=${item.key}`}
                  className={count ? "gap gap--open" : "gap"}
                >
                  <Icon name={item.icon} />
                  <span className="gap-label">{item.label}</span>
                  <span className="gap-count">{count ? `Thiếu ${count}` : "Đủ"}</span>
                </Link>
              );
            })}
            <Link
              to="/admin/places?missing=sample"
              className={summary.samples ? "gap gap--open" : "gap"}
            >
              <Icon name="alert" />
              <span className="gap-label">Dữ liệu mẫu</span>
              <span className="gap-count">{summary.samples ? `Còn ${summary.samples}` : "Đã thay hết"}</span>
            </Link>
          </section>

          <div className="dashboard-columns">
            <section className="surface" aria-labelledby="todo-title">
              <div className="surface-head">
                <h2 id="todo-title">Cần bổ sung</h2>
                {todo.length > TODO_LIMIT && (
                  <Link to="/admin/places?missing=any" className="btn-text">
                    Xem cả {todo.length} quán
                  </Link>
                )}
              </div>
              {todo.length === 0 ? (
                <p className="muted">Tất cả các quán đã đủ hồ sơ. 🎉</p>
              ) : (
                <ul className="todo-list">
                  {todo.slice(0, TODO_LIMIT).map((place) => (
                    <li key={place.id}>
                      <PlaceImage
                        src={place.imageUrl}
                        className="thumb thumb--sm"
                        fallbackClassName="thumb--empty"
                      />
                      <div className="todo-body">
                        <strong>{place.name}</strong>
                        <span className="todo-missing">
                          {isSamplePlace(place) && <span className="tag tag--sample">Mẫu</span>}
                          {getMissingItems(place, ctx).map((m) => (
                            <span key={m.key} className="tag">
                              {m.key === "image" && place.imageUrl ? "Ảnh lỗi" : m.label}
                            </span>
                          ))}
                        </span>
                      </div>
                      <Link to={`/admin/places/${place.id}/edit`} className="btn btn-secondary btn-sm">
                        Bổ sung
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="surface" aria-labelledby="category-title">
              <div className="surface-head">
                <h2 id="category-title">Theo loại món</h2>
              </div>
              <ul className="bars">
                {summary.categories.map((c) => (
                  <li key={c.name}>
                    <span className="bar-label">{c.name}</span>
                    <span className="bar-track" aria-hidden="true">
                      <span
                        className="bar-fill"
                        style={{ width: `${(c.count / summary.categories[0].count) * 100}%` }}
                      />
                    </span>
                    <span className="bar-value">{c.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div className="surface" aria-busy="true" aria-label="Đang tải">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--strip" />
    </div>
  );
}
