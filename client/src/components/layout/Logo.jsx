import { Link } from "react-router";

// Biểu tượng TourVoice: ghim bản đồ có sóng âm bên trong (dùng cả ở trang quản trị)
export function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
      <path d="M16 2C9.9 2 5 6.8 5 12.8 5 21 16 30 16 30s11-9 11-17.2C27 6.8 22.1 2 16 2z" fill="#147D78" />
      <path d="M11 13v1.5M13.5 10.5v6.5M16 8.5v10.5M18.5 10.5v6.5M21 13v1.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="25" cy="6" r="3" fill="#E9B86E" />
    </svg>
  );
}

export default function Logo({ onClick }) {
  return (
    <Link to="/" className="tv-logo" onClick={onClick}>
      <LogoMark />
      <span>TourVoice</span>
    </Link>
  );
}
