import { useI18n } from "../i18n/useI18n";

// Chip chọn danh mục (Tất cả + danh mục lấy từ API). value "" = tất cả.
export default function CategoryChips({ categories, value, onChange }) {
  const { t } = useI18n();
  const items = [{ value: "", label: t("explore.all") }, ...categories.map((c) => ({ value: c, label: c }))];

  return (
    <div className="tv-chips" role="group" aria-label={t("explore.categories")}>
      {items.map((item) => (
        <button
          key={item.value || "all"}
          type="button"
          className={item.value === value ? "tv-chip-btn is-active" : "tv-chip-btn"}
          aria-pressed={item.value === value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
