export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="admin-pager" aria-label="Phân trang">
      <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Trước
      </button>
      <span>
        Trang {page} / {totalPages}
      </span>
      <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Sau →
      </button>
    </nav>
  );
}