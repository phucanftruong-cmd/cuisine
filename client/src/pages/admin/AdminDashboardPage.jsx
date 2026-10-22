import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getAllPlaces } from "../../api";
import Icon from "../../components/Icon";
import PlaceImage from "../../components/PlaceImage";
import PlacesMap from "../../components/PlacesMap";
import {
  averagePrice,
  countBy,
  countRecent,
  describePeakHours,
  openHoursHistogram,
  priceBuckets,
  recentPlaces,
  relativeTime,
} from "../../utils/dashboardStats";
import {
  PROFILE_ITEMS,
  getMissingItems,
  isProfileComplete,
  isSamplePlace,
  summarizePlaces,
} from "../../utils/placeStatus";
import { useBrokenImages } from "../../utils/useBrokenImages";
import AdminLayout from "./AdminLayout";
import LiveListeners from "./LiveListeners";
import QrCard from "./QrCard";
import "./dashboard.css";

const TODO_LIMIT = 5;
const RECENT_LIMIT = 5;
const editUrl = (place) => `/admin/places/${place.id}/edit`;

const TABS = [
  { key: "overview", label: "Tổng quan" },
  { key: "analytics", label: "Phân tích" },
];

export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "analytics" ? "analytics" : "overview";
  const [qrOpen, setQrOpen] = useState(false);
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
  const stats = useMemo(() => {
    if (!places) return null;
    const wards = countBy(places, "ward", "Chưa có phường");
    return {
      avgPrice: averagePrice(places),
      wardCount: wards.filter((w) => !w.empty).length,
      newThisWeek: countRecent(places, 7),
      recent: recentPlaces(places, RECENT_LIMIT),
      wards,
      prices: priceBuckets(places),
      categories: countBy(places, "category", "Chưa có loại món"),
      hours: openHoursHistogram(places),
      located: places.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)).length,
    };
  }, [places]);

  return (
    <AdminLayout
      title="Tổng quan"
      description="Số liệu các quán và những quán còn thiếu thông tin cho khách."
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setQrOpen(true)}>
            Mã QR
          </button>
          <Link to="/admin/places/new" className="btn btn-primary">
            <Icon name="plus" />
            Thêm quán
          </Link>
        </>
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
          <div className="admin-tabs" role="tablist" aria-label="Chế độ xem">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls={`panel-${t.key}`}
                className={tab === t.key ? "admin-tab is-active" : "admin-tab"}
                onClick={() => setSearchParams(t.key === "overview" ? {} : { tab: t.key }, { replace: true })}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="admin-panel" role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
              <section className="kpis" aria-label="Số liệu nhanh">
                <Link to="/admin/places" className="kpi">
                  <span className="kpi-label">Tổng số quán</span>
                  <span className="kpi-value">{summary.total}</span>
                  <span className="kpi-note">{summary.complete} quán đã đủ hồ sơ</span>
                </Link>
                <div className="kpi">
                  <span className="kpi-label">Giá trung bình mỗi người</span>
                  <span className="kpi-value">
                    {stats.avgPrice == null ? "—" : `${stats.avgPrice.toLocaleString("vi-VN")}đ`}
                  </span>
                  <span className="kpi-note">Tính trên các quán đã nhập giá</span>
                </div>
                <div className="kpi">
                  <span className="kpi-label">Số phường có quán</span>
                  <span className="kpi-value">{stats.wardCount}</span>
                  <span className="kpi-note">
                    {stats.wards.find((w) => w.empty)?.count
                      ? `${stats.wards.find((w) => w.empty).count} quán chưa nhập phường`
                      : "Quán nào cũng đã có phường"}
                  </span>
                </div>
                <div className="kpi">
                  <span className="kpi-label">Quán mới trong 7 ngày</span>
                  <span className="kpi-value">{stats.newThisWeek}</span>
                  <span className="kpi-note">
                    {stats.recent[0] ? `Gần nhất: ${relativeTime(stats.recent[0].createdAt)}` : ""}
                  </span>
                </div>
              </section>

                <LiveListeners places={places} />

              <div className="dashboard-columns dashboard-columns--even">
                <section className="surface" aria-labelledby="todo-title">
                  <div className="surface-head">
                    <h2 id="todo-title">Cần bổ sung</h2>
                    {todo.length > TODO_LIMIT && (
                      <Link to="/admin/places?missing=any" className="btn-text">
                        Xem cả {todo.length} quán
                      </Link>
                    )}
                  </div>
                  <div className="gaps gaps--chips" role="group" aria-label="Thông tin còn thiếu">
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
                    <Link to="/admin/places?missing=sample" className={summary.samples ? "gap gap--open" : "gap"}>
                      <Icon name="alert" />
                      <span className="gap-label">Dữ liệu mẫu</span>
                      <span className="gap-count">{summary.samples ? `Còn ${summary.samples}` : "Đã thay hết"}</span>
                    </Link>
                  </div>
                  {todo.length === 0 ? (
                    <p className="muted">Tất cả các quán đã đủ hồ sơ. 🎉</p>
                  ) : (
                    <ul className="todo-list">
                      {todo.slice(0, TODO_LIMIT).map((place) => (
                        <li key={place.id}>
                          <PlaceImage src={place.imageUrl} className="thumb thumb--sm" fallbackClassName="thumb--empty" />
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
                          <Link to={editUrl(place)} className="btn btn-secondary btn-sm">
                            Bổ sung
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="surface" aria-labelledby="recent-title">
                  <div className="surface-head">
                    <h2 id="recent-title">Quán mới thêm gần đây</h2>
                    <Link to="/admin/places" className="btn-text">
                      Tất cả quán
                    </Link>
                  </div>
                  <ul className="todo-list recent-list">
                    {stats.recent.map((place) => (
                      <li key={place.id}>
                        <PlaceImage src={place.imageUrl} className="thumb thumb--sm" fallbackClassName="thumb--empty" />
                        <div className="todo-body">
                          <Link to={editUrl(place)} className="recent-name">
                            {place.name}
                          </Link>
                          <span className="cell-sub">
                            {[place.category, place.ward].filter(Boolean).join(", ") || "Chưa có loại món, phường"}
                          </span>
                        </div>
                        <time className="recent-time" dateTime={place.createdAt}>
                          {relativeTime(place.createdAt)}
                        </time>
                      </li>
                    ))}
                  </ul>
                </section>
            </div>
            </div>
          )}

          {tab === "analytics" && (
            <div className="admin-panel" role="tabpanel" id="panel-analytics" aria-labelledby="tab-analytics">
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
                          to={editUrl(place)}
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

              <section className="surface" aria-labelledby="map-title">
                <div className="surface-head">
                  <h2 id="map-title">
                    <Icon name="pin" /> Bản đồ các quán
                  </h2>
                  {stats.located < summary.total && (
                    <Link to="/admin/places?missing=location" className="btn-text">
                      {summary.total - stats.located} quán chưa có vị trí
                    </Link>
                  )}
                </div>
                <PlacesMap
                  places={places}
                  linkTo={editUrl}
                  markerClass={(p) => (isProfileComplete(p, ctx) ? "map-marker--done" : "map-marker--todo")}
                />
                <p className="field-hint map-caption">
                  Bấm vào một điểm để sửa quán. Điểm xanh: đủ hồ sơ, điểm vàng: còn thiếu thông tin.
                </p>
              </section>

              <HoursChart hours={stats.hours} />

              <div className="dashboard-grid">
                <BarList id="ward-title" title="Theo phường" rows={stats.wards} />
                <BarList id="price-title" title="Theo mức giá" rows={stats.prices} />
                <BarList id="category-title" title="Theo loại món" rows={stats.categories} />
            </div>
            </div>
          )}
        </>
      )}
      {qrOpen && <QrDialog onClose={() => setQrOpen(false)} />}
    </AdminLayout>
  );
}

// Mã QR mở trong hộp thoại, không chiếm chỗ trên trang tổng quan
function QrDialog({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-label="Mã QR vào web">
        <QrCard />
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function BarList({ id, title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="surface" aria-labelledby={id}>
      <div className="surface-head">
        <h2 id={id}>{title}</h2>
      </div>
      <ul className="bars">
        {rows.map((row) => (
          <li key={row.label} className={row.empty ? "is-empty" : undefined}>
            <span className="bar-label" title={row.label}>
              {row.label}
            </span>
            <span className="bar-track" aria-hidden="true">
              <span className="bar-fill" style={{ width: `${(row.count / max) * 100}%` }} />
            </span>
            <span className="bar-value">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Số quán mở cửa trong từng giờ, để biết lúc nào có nhiều lựa chọn cho khách
function HoursChart({ hours: { hours, parsed, unparsed } }) {
  const max = Math.max(...hours.map((h) => h.count));
  const peak = describePeakHours(hours);

  return (
    <section className="surface" aria-labelledby="hours-title">
      <div className="surface-head">
        <h2 id="hours-title">
          <Icon name="clock" /> Số quán mở cửa theo giờ
        </h2>
        {peak && (
          <span className="cell-sub">
            Đông nhất {peak.max} quán mở, lúc {peak.text}
          </span>
        )}
      </div>

      {parsed === 0 ? (
        <p className="muted">Chưa có quán nào nhập giờ mở cửa theo dạng “06:00 - 21:00”.</p>
      ) : (
        <>
          <ol className="hours-chart" aria-label="Số quán mở cửa trong từng giờ">
            {hours.map((h) => (
              <li key={h.hour} title={`${h.hour}h–${h.hour + 1}h: ${h.count} quán mở`}>
                <span className="hours-bar-wrap">
                  <span
                    className={h.count === max ? "hours-bar is-peak" : "hours-bar"}
                    style={{ height: `${max ? (h.count / max) * 100 : 0}%` }}
                  />
                </span>
                <span className={h.hour % 3 === 0 ? "hours-label" : "hours-label is-minor"}>{h.hour}h</span>
                <span className="sr-only">{h.count} quán</span>
              </li>
            ))}
          </ol>
          {unparsed > 0 && (
            <p className="field-hint">
              {unparsed} quán có giờ mở cửa không đọc được (nên nhập dạng “06:00 - 21:00”), chưa tính vào biểu đồ.
            </p>
          )}
        </>
      )}
    </section>
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
