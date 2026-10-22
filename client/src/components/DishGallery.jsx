import { useEffect, useRef, useState } from "react";
import { getPlaceImages, mediaUrl } from "../api";
import { useI18n } from "../i18n/useI18n";
import Icon from "./Icon";

// Ảnh món ăn ở trang chi tiết. Quán chưa có ảnh (hoặc tải lỗi) thì không hiện gì.
// Tên món giữ nguyên như tên quán, không dịch.
export default function DishGallery({ placeId, placeName }) {
  const { t } = useI18n();
  const [images, setImages] = useState([]);
  const [open, setOpen] = useState(null); // vị trí ảnh đang phóng to
  const dialogRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    getPlaceImages(placeId)
      .then((data) => !ignore && setImages(data?.images ?? []))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [placeId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) dialog.showModal?.();
    if (open === null && dialog.open) dialog.close();
  }, [open]);

  if (images.length === 0) return null;

  const total = images.length;
  const current = open === null ? null : images[open];
  const label = (image, i) => image.caption || `${placeName} ${i + 1}`;
  const go = (step) => setOpen((i) => (i + step + total) % total);

  function handleKeyDown(event) {
    if (total < 2) return;
    if (event.key === "ArrowLeft") go(-1);
    if (event.key === "ArrowRight") go(1);
  }

  return (
    <section className="tv-dishes" aria-labelledby="dishes-title">
      <h2 id="dishes-title">{t("gallery.title")}</h2>
      <ul className="tv-dishes-grid">
        {images.map((image, i) => (
          <li key={image.id}>
            <figure>
              <button
                type="button"
                className="tv-dish-btn"
                onClick={() => setOpen(i)}
                aria-label={t("gallery.open", { name: label(image, i) })}
              >
                <img src={mediaUrl(image.url)} alt="" loading="lazy" />
              </button>
              {image.caption && <figcaption>{image.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="tv-lightbox"
        aria-label={current ? label(current, open) : t("gallery.title")}
        onClose={() => setOpen(null)}
        onKeyDown={handleKeyDown}
        // Bấm ra vùng tối bên ngoài ảnh thì đóng
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
      >
        {current && (
          <figure className="tv-lightbox-body">
            <img src={mediaUrl(current.url)} alt={label(current, open)} />
            <figcaption>
              <span>{current.caption}</span>
              <span className="tv-lightbox-count">{t("gallery.count", { current: open + 1, total })}</span>
            </figcaption>
          </figure>
        )}
        <button type="button" className="tv-lightbox-btn tv-lightbox-close" onClick={() => setOpen(null)} aria-label={t("gallery.close")}>
          <Icon name="close" size={22} />
        </button>
        {total > 1 && (
          <>
            <button type="button" className="tv-lightbox-btn tv-lightbox-prev" onClick={() => go(-1)} aria-label={t("gallery.prev")}>
              <Icon name="arrowLeft" size={22} />
            </button>
            <button type="button" className="tv-lightbox-btn tv-lightbox-next" onClick={() => go(1)} aria-label={t("gallery.next")}>
              <Icon name="arrowRight" size={22} />
            </button>
          </>
        )}
      </dialog>
    </section>
  );
}
