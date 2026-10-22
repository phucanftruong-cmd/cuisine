import { PROFILE_ITEMS } from "../utils/placeStatus";
import Icon from "./Icon";

// 5 ô nhỏ cho biết quán đã có địa chỉ, ảnh, vị trí, giá, giờ mở cửa chưa
export default function ProfilePips({ place, brokenImages }) {
  const ctx = { brokenImages };
  const imageBroken = Boolean(place.imageUrl?.trim()) && brokenImages?.has(place.imageUrl.trim());
  const missing = PROFILE_ITEMS.filter((item) => !item.has(place, ctx));
  const summary =
    missing.length === 0
      ? "Đủ hồ sơ"
      : `Thiếu ${missing.map((m) => m.label.toLowerCase()).join(", ")}${imageBroken ? " (link ảnh hỏng)" : ""}`;

  return (
    <ul className="pips" aria-label={summary} title={summary}>
      {PROFILE_ITEMS.map((item) => {
        const ok = item.has(place, ctx);
        const broken = item.key === "image" && imageBroken;
        return (
          <li key={item.key} className={ok ? "pip pip--ok" : broken ? "pip pip--broken" : "pip pip--missing"}>
            <Icon name={item.icon} size={14} />
          </li>
        );
      })}
    </ul>
  );
}
