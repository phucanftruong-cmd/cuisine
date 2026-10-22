import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

// Bản đồ nhỏ đánh dấu các quán, dùng ảnh nền (tile) của OpenStreetMap.
// Tự vẽ bằng phép chiếu Web Mercator nên không cần cài thư viện bản đồ.
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

export default function PlacesMap({ places, height = 360, markerClass = () => "", linkTo }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [zoomDelta, setZoomDelta] = useState(0);

  // Đo chiều rộng khung để tính mức zoom và số ô ảnh cần tải
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const points = places
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map((p) => ({ place: p, lat: p.latitude, lng: p.longitude }));

  let content = null;
  if (width > 0 && points.length > 0) {
    const baseZoom = fitZoom(points, width, height);
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, baseZoom + zoomDelta));
    const xy = points.map((p) => project(p.lat, p.lng, zoom));
    const centerX = (Math.min(...xy.map((p) => p.x)) + Math.max(...xy.map((p) => p.x))) / 2;
    const centerY = (Math.min(...xy.map((p) => p.y)) + Math.max(...xy.map((p) => p.y))) / 2;
    const originX = centerX - width / 2;
    const originY = centerY - height / 2;

    const tiles = [];
    const count = 2 ** zoom;
    for (let tx = Math.floor(originX / TILE); tx <= Math.floor((originX + width) / TILE); tx++) {
      for (let ty = Math.floor(originY / TILE); ty <= Math.floor((originY + height) / TILE); ty++) {
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

    content = (
      <>
        {tiles}
        {points.map((p, i) => (
          <Link
            key={p.place.id}
            to={linkTo(p.place)}
            className={`map-marker ${markerClass(p.place)}`.trim()}
            style={{ left: xy[i].x - originX, top: xy[i].y - originY }}
            aria-label={p.place.name}
          >
            <span className="map-marker-label">{p.place.name}</span>
          </Link>
        ))}
        <div className="map-zoom">
          <button
            type="button"
            onClick={() => setZoomDelta((d) => d + 1)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Phóng to"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoomDelta((d) => d - 1)}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Thu nhỏ"
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
    <div ref={containerRef} className="places-map" style={{ height }}>
      {content}
      {points.length === 0 && <p className="places-map-empty">Chưa có quán nào nhập vị trí bản đồ.</p>}
    </div>
  );
}
