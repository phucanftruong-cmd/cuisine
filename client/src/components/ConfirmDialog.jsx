import { useEffect, useRef } from "react";

// Hộp thoại xác nhận cho thao tác nguy hiểm (xóa quán, xóa bản dịch...)
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Xác nhận",
  busy = false,
  error = "",
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function handleKey(event) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <div className="dialog-body">{children}</div>
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <button
            type="button"
            ref={cancelRef}
            className="button-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Hủy
          </button>
          <button
            type="button"
            className="button-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
