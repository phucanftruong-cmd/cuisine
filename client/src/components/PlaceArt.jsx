// Hình minh họa thay cho ảnh khi địa điểm chưa có ảnh (hoặc ảnh lỗi).
// Chọn hình theo danh mục; danh mục lạ thì dùng đèn lồng.

const SHAPES = {
  // Tô phở / bún: tô, đũa, hơi nóng
  bowl: (
    <>
      <path d="M22 54h76c0 20-17 34-38 34S22 74 22 54z" fill="var(--art-fill)" />
      <path d="M22 54h76" />
      <path d="M50 92h20" />
      <path d="M72 30 96 18M76 38l24-10" />
      <path d="M44 44c-4-6 4-10 0-16M58 44c-4-6 4-10 0-16" opacity=".7" />
    </>
  ),
  // Đĩa cơm tấm: đĩa, cơm, sườn
  plate: (
    <>
      <ellipse cx="60" cy="68" rx="44" ry="16" fill="var(--art-fill)" />
      <ellipse cx="60" cy="68" rx="44" ry="16" />
      <path d="M34 64c4-12 22-14 28-4" />
      <path d="M62 66c6-10 22-12 26 0-6 6-20 6-26 0z" />
      <path d="M44 40c-4-6 4-10 0-16M58 40c-4-6 4-10 0-16" opacity=".7" />
    </>
  ),
  // Ly cà phê sữa đá
  cup: (
    <>
      <path d="M40 34h40l-6 56H46z" fill="var(--art-fill)" />
      <path d="M40 34h40l-6 56H46z" />
      <path d="M44 58h32" />
      <rect x="50" y="44" width="8" height="8" rx="2" />
      <rect x="62" y="48" width="8" height="8" rx="2" />
      <path d="M64 34 72 14" />
    </>
  ),
  // Ăn vặt: xiên que, bánh
  snack: (
    <>
      <path d="M30 92 74 28" />
      <circle cx="62" cy="46" r="9" fill="var(--art-fill)" />
      <circle cx="52" cy="60" r="9" fill="var(--art-fill)" />
      <circle cx="42" cy="74" r="9" fill="var(--art-fill)" />
      <path d="M76 86c0-10 8-16 18-16s18 6 18 16z" fill="var(--art-fill)" transform="translate(-14 0)" />
    </>
  ),
  // Chùa
  pagoda: (
    <>
      <path d="M30 50h60L60 30z" fill="var(--art-fill)" />
      <path d="M30 50h60L60 30zM26 50c8 6 60 6 68 0" />
      <path d="M38 56h44v14H38zM32 70h56c-6 6-50 6-56 0zM42 76h36v16H42z" />
      <path d="M56 92V80h8v12M60 30V20" />
    </>
  ),
  // Công viên
  tree: (
    <>
      <circle cx="60" cy="46" r="24" fill="var(--art-fill)" />
      <circle cx="60" cy="46" r="24" />
      <path d="M60 70v22M60 78l-10-8M60 72l10-8M28 92h64" />
    </>
  ),
  // Đèn lồng (mặc định)
  lantern: (
    <>
      <path d="M60 18v10" />
      <ellipse cx="60" cy="56" rx="24" ry="28" fill="var(--art-fill)" />
      <ellipse cx="60" cy="56" rx="24" ry="28" />
      <path d="M48 28h24M48 84h24M60 30c-10 8-10 44 0 52M60 30c10 8 10 44 0 52M60 84v12" />
    </>
  ),
};

const RULES = [
  [/phở|pho|bún|bun|hủ tiếu|hu tieu|mì|mi |miến/i, "bowl"],
  [/cơm|com/i, "plate"],
  [/cà phê|ca phe|cafe|coffee|trà|tra|nước|nuoc/i, "cup"],
  [/ăn vặt|an vat|bánh|banh|chè|che/i, "snack"],
  [/chùa|chua|đình|dinh|miếu|mieu|nhà thờ|nha tho|di sản|di san/i, "pagoda"],
  [/công viên|cong vien|park|vườn|vuon/i, "tree"],
];

// 3 tông màu xen kẽ để các thẻ cạnh nhau không giống hệt nhau
const TONES = ["teal", "amber", "mint"];

function artShape(category) {
  return RULES.find(([re]) => re.test(category ?? ""))?.[1] ?? "lantern";
}

export default function PlaceArt({ category, seed = 0, className = "" }) {
  const tone = TONES[Math.abs(seed) % TONES.length];
  return (
    <div className={`place-art place-art--${tone} ${className}`.trim()} role="img" aria-label={category ?? ""}>
      <svg viewBox="0 0 120 110" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {SHAPES[artShape(category)]}
        </g>
      </svg>
    </div>
  );
}
