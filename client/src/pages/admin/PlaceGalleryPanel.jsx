import { useEffect, useRef, useState } from "react";
import {
  deletePlaceImage,
  getPlaceImages,
  mediaUrl,
  reorderPlaceImages,
  setPlaceCover,
  updatePlaceImage,
  uploadPlaceImage,
} from "../../api";
import ConfirmDialog from "../../components/ConfirmDialog";
import Icon from "../../components/Icon";
import { GALLERY_LIMITS, checkImageFile } from "../../utils/placeForm";
import { useToast } from "./toastContext";

// Ảnh món ăn của quán: tải lên, đặt tên món, đổi thứ tự, chọn ảnh bìa, xóa.
// Mỗi thao tác server trả về cả thư viện + ảnh bìa mới; onCoverChange báo cho form để ô "Ảnh bìa" khớp theo.
export default function PlaceGalleryPanel({ placeId, token, onCoverChange }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [gallery, setGallery] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [uploads, setUploads] = useState([]); // [{ key, name, status: "uploading" | "error", error }]
  const [busyId, setBusyId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let ignore = false;
    getPlaceImages(placeId)
      .then((data) => {
        if (!ignore) {
          setGallery(data);
          setLoadError("");
        }
      })
      .catch((err) => {
        if (ignore) return;
        // Quán vừa tải được ở form này nên 404 gần như chắc chắn là backend đang chạy bản cũ, chưa có API ảnh
        setLoadError(
          err.status === 404
            ? "Server chưa có chức năng ảnh món (backend đang chạy bản cũ). Hãy tắt rồi chạy lại backend."
            : err.message,
        );
      });
    return () => {
      ignore = true;
    };
  }, [placeId, reloadKey]);

  function apply(data) {
    setGallery(data);
    onCoverChange(data.coverUrl ?? "");
  }

  async function run(imageId, action) {
    setBusyId(imageId);
    try {
      apply(await action());
      return true;
    } catch (err) {
      toast(err.message, "error");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleFiles(event) {
    const files = [...event.target.files];
    event.target.value = "";
    const room = GALLERY_LIMITS.maxImages - (gallery?.images.length ?? 0);
    if (files.length > room) {
      toast(`Mỗi quán có tối đa ${GALLERY_LIMITS.maxImages} ảnh, chỉ thêm được ${Math.max(0, room)} ảnh nữa.`, "error");
    }

    // Tải lần lượt để thứ tự ảnh đúng thứ tự đã chọn
    for (const [i, file] of files.slice(0, Math.max(0, room)).entries()) {
      const key = `${Date.now()}-${i}`;
      const problem = checkImageFile(file);
      if (problem) {
        setUploads((list) => [...list, { key, name: file.name, status: "error", error: problem }]);
        continue;
      }
      setUploads((list) => [...list, { key, name: file.name, status: "uploading" }]);
      try {
        apply(await uploadPlaceImage(token, placeId, file));
        setUploads((list) => list.filter((u) => u.key !== key));
      } catch (err) {
        setUploads((list) => list.map((u) => (u.key === key ? { ...u, status: "error", error: err.message } : u)));
      }
    }
  }

  function saveCaption(image, value) {
    const caption = value.trim();
    if (caption === (image.caption ?? "")) return;
    run(image.id, () => updatePlaceImage(token, placeId, image.id, caption));
  }

  function move(index, step) {
    const ids = gallery.images.map((img) => img.id);
    [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
    run(ids[index], () => reorderPlaceImages(token, placeId, ids));
  }

  async function handleDelete() {
    setDeleteError("");
    setBusyId(deleting.id);
    try {
      apply(await deletePlaceImage(token, placeId, deleting.id));
      setDeleting(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const images = gallery?.images ?? [];
  const full = images.length >= GALLERY_LIMITS.maxImages;

  return (
    <section className="surface form-section gallery-panel" aria-labelledby="gallery-title">
      <div className="surface-head">
        <h2 id="gallery-title">
          <Icon name="image" /> Ảnh món ăn
          {gallery && (
            <span className="tag">
              {images.length}/{GALLERY_LIMITS.maxImages}
            </span>
          )}
        </h2>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={!gallery || full}
        >
          <Icon name="plus" size={16} /> Thêm ảnh
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={GALLERY_LIMITS.accept}
          multiple
          hidden
          onChange={handleFiles}
          aria-label="Chọn ảnh món ăn"
        />
      </div>
      <p className="field-hint">
        Ảnh JPG, PNG hoặc WebP, tối đa {GALLERY_LIMITS.maxMb} MB mỗi ảnh. Ghi tên món dưới mỗi ảnh để khách biết đó
        là món gì. Ảnh bìa hiện ở thẻ quán, bản đồ và đầu trang chi tiết.
      </p>

      {loadError && (
        <p className="field-error">
          Không tải được ảnh: {loadError}{" "}
          <button type="button" className="btn-text" onClick={() => setReloadKey((k) => k + 1)}>
            Thử lại
          </button>
        </p>
      )}
      {!gallery && !loadError && <div className="skeleton skeleton--line" />}
      {gallery && images.length === 0 && uploads.length === 0 && (
        <p className="muted">Chưa có ảnh món nào. Bấm “Thêm ảnh” để chọn ảnh từ máy.</p>
      )}

      {(images.length > 0 || uploads.length > 0) && (
        <ul className="gallery-grid">
          {images.map((image, index) => {
            const busy = busyId === image.id;
            return (
              <li key={image.id} className={image.isCover ? "gallery-item is-cover" : "gallery-item"} aria-busy={busy}>
                <div className="gallery-thumb">
                  <img src={mediaUrl(image.url)} alt={image.caption || `Ảnh ${index + 1}`} loading="lazy" />
                  {image.isCover && <span className="gallery-badge">Ảnh bìa</span>}
                </div>
                <input
                  key={image.caption ?? ""}
                  className="gallery-caption"
                  defaultValue={image.caption ?? ""}
                  maxLength={GALLERY_LIMITS.caption}
                  placeholder="Tên món, ví dụ: Phở tái"
                  aria-label={`Tên món của ảnh ${index + 1}`}
                  onBlur={(e) => saveCaption(image, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  disabled={busy}
                />
                <div className="gallery-actions">
                  <button
                    type="button"
                    className="admin-icon-button"
                    onClick={() => move(index, -1)}
                    disabled={busy || index === 0}
                    aria-label="Đưa ảnh lên trước"
                    title="Đưa lên trước"
                  >
                    <Icon name="arrowLeft" size={16} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-button"
                    onClick={() => move(index, 1)}
                    disabled={busy || index === images.length - 1}
                    aria-label="Đưa ảnh ra sau"
                    title="Đưa ra sau"
                  >
                    <Icon name="arrowRight" size={16} />
                  </button>
                  {!image.isCover && (
                    <button
                      type="button"
                      className="btn-text gallery-cover-btn"
                      onClick={() => run(image.id, () => setPlaceCover(token, placeId, image.id))}
                      disabled={busy}
                    >
                      Đặt làm ảnh bìa
                    </button>
                  )}
                  <button
                    type="button"
                    className="admin-icon-button admin-icon-button--danger"
                    onClick={() => {
                      setDeleteError("");
                      setDeleting(image);
                    }}
                    disabled={busy}
                    aria-label={`Xóa ảnh ${index + 1}`}
                    title="Xóa ảnh"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </li>
            );
          })}
          {uploads.map((u) => (
            <li key={u.key} className={`gallery-item gallery-item--${u.status}`}>
              <div className="gallery-thumb gallery-thumb--pending">
                {u.status === "uploading" ? <span className="gallery-spinner" aria-hidden="true" /> : <Icon name="alert" />}
              </div>
              <p className="gallery-upload-name" title={u.name}>
                {u.name}
              </p>
              {u.status === "uploading" ? (
                <p className="field-hint">Đang tải lên…</p>
              ) : (
                <p className="field-error">
                  {u.error}{" "}
                  <button
                    type="button"
                    className="btn-text"
                    onClick={() => setUploads((list) => list.filter((x) => x.key !== u.key))}
                  >
                    Ẩn
                  </button>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa ảnh này?"
        confirmLabel="Xóa ảnh"
        busy={deleting !== null && busyId === deleting.id}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>
          Ảnh {deleting?.caption ? `“${deleting.caption}” ` : ""}sẽ bị xóa khỏi server.
          {deleting?.isCover && " Đây là ảnh bìa: ảnh kế tiếp sẽ được dùng làm ảnh bìa."}
        </p>
      </ConfirmDialog>
    </section>
  );
}
