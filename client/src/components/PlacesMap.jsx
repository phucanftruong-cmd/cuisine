import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import "./PlacesMap.css";

// Bản đồ đánh dấu các địa điểm, dùng ảnh nền (tile) của OpenStreetMap.
// Tự vẽ bằng phép chiếu Web Mercator nên không cần cài thư viện bản đồ.
//  - Admin: linkTo(place) -> bấm điểm để mở trang sửa.
//  - Trang khách: onSelect(place) + selectedId -> bấm điểm để chọn; kéo để di chuyển bản đồ.
const TILE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

// Kinh độ/vĩ độ -> tọa độ điểm ảnh ở mức zoom z
function project(lat, lng, zoom) {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

// Mức zoom lớn nhất mà vẫn chứa hết các điểm (chừa lề)
function fitZoom(points, width, height, padding = 48) {
  if (points.length === 1) return 16;
  for (let zoom = 17; zoom > MIN_ZOOM; zoom--) {
    const xy = points.map((p) => project(p.lat, p.lng, zoom));
    const w = Math.max(...xy.map((p) => p.x)) - Math.min(...xy.map((p) => p.x));
    const h = Math.max(...xy.map((p) => p.y)) - Math.min(...xy.map((p) => p.y));
    if (w <= width - padding * 2 && h <= height - padding * 2) return zoom;
  }
  return MIN_ZOOM;
}

export default function PlacesMap({
  places,
  height = 360, // số (px) hoặc "100%" để cao theo khung chứa
  markerClass = () => "",
  linkTo,
  onSelect,
  pannable = Boolean(onSelect), // cho kéo bản đồ (trang chi tiết không cần chọn điểm)
  selectedId,
  showLabels = true, // false: không hiện tên trên điểm (vd. bản đồ một quán ở trang chi tiết)
  userLocation, // { lat, lng } nếu khách cho phép lấy vị trí
  labels = {},
}) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoomDelta, setZoomDelta] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Đo khung để tính mức zoom và số ô ảnh cần tải
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const points = places
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map((p) => ({ place: p, lat: p.latitude, lng: p.longitude }));

  const { width } = size;
  const viewHeight = typeof height === "number" ? height : size.height;

  // Phóng to/thu nhỏ quanh tâm khung: độ lệch do kéo cũng nhân/chia theo
  function zoomBy(step) {
    setZoomDelta((d) => d + step);
    setPan((p) => ({ x: p.x * 2 ** step, y: p.y * 2 ** step }));
  }

  // Kéo bản đồ (chỉ khi bấm vào nền, không phải vào điểm đánh dấu)
  function onPointerDown(e) {
    if (!pannable || e.target !== e.currentTarget) return;
    dragRef.current = { x: e.clientX, y: e.clientY, pan };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    setPan({ x: drag.pan.x - (e.clientX - drag.x), y: drag.pan.y - (e.clientY - drag.y) });
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  let content = null;
  if (width > 0 && viewHeight > 0 && points.length > 0) {
    const baseZoom = fitZoom(points, width, viewHeight);
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, baseZoom + zoomDelta));
    const xy = points.map((p) => project(p.lat, p.lng, zoom));
    const centerX = (Math.min(...xy.map((p) => p.x)) + Math.max(...xy.map((p) => p.x))) / 2 + pan.x;
    const centerY = (Math.min(...xy.map((p) => p.y)) + Math.max(...xy.map((p) => p.y))) / 2 + pan.y;
    const originX = centerX - width / 2;
    const originY = centerY - viewHeight / 2;

    const tiles = [];
    const count = 2 ** zoom;
    for (let tx = Math.floor(originX / TILE); tx <= Math.floor((originX + width) / TILE); tx++) {
      for (let ty = Math.floor(originY / TILE); ty <= Math.floor((originY + viewHeight) / TILE); ty++) {
        if (ty < 0 || ty >= count) continue;
        const wrappedX = ((tx % count) + count) % count;
        tiles.push(
          <img
            key={`${zoom}/${tx}/${ty}`}
            className="map-tile"
            src={`https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`}
            alt=""
            draggable="false"
            style={{ left: tx * TILE - originX, top: ty * TILE - originY }}
          />,
        );
      }
    }

    const me = userLocation ? project(userLocation.lat, userLocation.lng, zoom) : null;

    content = (
      <>
        {tiles}
        {points.map((p, i) => {
          const selected = p.place.id === selectedId;
          const className = `map-marker ${markerClass(p.place)} ${selected ? "is-selected" : ""}`.trim();
          const style = { left: xy[i].x - originX, top: xy[i].y - originY };
          const label = showLabels && <span className="map-marker-label">{p.place.name}</span>;
          return onSelect ? (
            <button
              key={p.place.id}
              type="button"
              className={className}
              style={style}
              aria-label={p.place.name}
              aria-pressed={selected}
              onClick={() => onSelect(p.place)}
            >
              {label}
            </button>
          ) : linkTo ? (
            <Link key={p.place.id} to={linkTo(p.place)} className={className} style={style} aria-label={p.place.name}>
              {label}
            </Link>
          ) : (
            <span key={p.place.id} className={className} style={style} role="img" aria-label={p.place.name}>
              {label}
            </span>
          );
        })}
        {me && <span className="map-me" style={{ left: me.x - originX, top: me.y - originY }} aria-hidden="true" />}
        <div className="map-zoom">
          <button
            type="button"
            onClick={() => zoomBy(1)}
            disabled={zoom >= MAX_ZOOM}
            aria-label={labels.zoomIn ?? "Phóng to"}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(-1)}
            disabled={zoom <= MIN_ZOOM}
            aria-label={labels.zoomOut ?? "Thu nhỏ"}
          >
            −
          </button>
        </div>
        <a
          className="map-attribution"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap
        </a>
      </>
    );
  }

  return (
    <div
      ref={containerRef}
      className={pannable ? "places-map places-map--pannable" : "places-map"}
      style={{ height }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {content}
      {points.length === 0 && (
        <p className="places-map-empty">{labels.empty ?? "Chưa có quán nào nhập vị trí bản đồ."}</p>
      )}
    </div>
  );
}
