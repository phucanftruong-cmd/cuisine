// Chuyển đổi và kiểm tra dữ liệu form thêm/sửa quán.
// Các giới hạn khớp với PlaceService ở backend.

export const LIMITS = {
  name: 200,
  description: 5000,
  address: 300,
  ward: 100,
  category: 100,
  openingHours: 100,
  phone: 30,
  imageUrl: 1000,
};

export const MAX_PRICE = 100_000_000;

export const EMPTY_FORM = {
  name: "",
  category: "",
  description: "",
  address: "",
  ward: "",
  phone: "",
  openingHours: "",
  priceMin: "",
  priceMax: "",
  imageUrl: "",
  latitude: "",
  longitude: "",
};

// Dữ liệu từ API (PlaceDto) -> giá trị các ô nhập (luôn là chuỗi)
export function toFormValues(place) {
  const values = { ...EMPTY_FORM };
  for (const key of Object.keys(EMPTY_FORM)) {
    const value = place?.[key];
    values[key] = value === null || value === undefined ? "" : String(value);
  }
  return values;
}

const text = (value) => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

// "40000", "40.000", "40 000" -> 40000; ô trống -> null; không phải số nguyên -> NaN
export function parsePrice(value) {
  const raw = (value ?? "").trim();
  if (raw === "") return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  // Dấu chấm hoặc dấu cách phân cách hàng nghìn
  if (/^\d{1,3}([.\s]\d{3})+$/.test(raw)) return Number(raw.replace(/[.\s]/g, ""));
  return Number.NaN;
}

// Chấp nhận cả dấu phẩy thập phân: "10,7465" -> 10.7465
export function parseCoordinate(value) {
  const raw = (value ?? "").trim();
  if (raw === "") return null;
  const normalized = raw.includes(".") ? raw : raw.replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

// Dán "10.7465, 106.6350" (copy từ Google Maps) vào ô vĩ độ -> tách thành 2 số
export function splitCoordinatePair(value) {
  const match = /^\s*(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)\s*$/.exec(value ?? "");
  return match ? { latitude: match[1], longitude: match[2] } : null;
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Trả về object { tênÔ: "thông báo lỗi" }; rỗng nghĩa là hợp lệ
export function validatePlaceForm(values) {
  const errors = {};
  const tooLong = (key, label) => {
    const value = (values[key] ?? "").trim();
    if (value.length > LIMITS[key]) {
      errors[key] = `${label} tối đa ${LIMITS[key]} ký tự (đang có ${value.length}).`;
    }
  };

  if (!text(values.name)) errors.name = "Vui lòng nhập tên quán.";
  else tooLong("name", "Tên quán");

  if (!text(values.description)) errors.description = "Vui lòng nhập nội dung thuyết minh.";
  else tooLong("description", "Nội dung thuyết minh");

  tooLong("address", "Địa chỉ");
  tooLong("ward", "Phường");
  tooLong("category", "Loại món");
  tooLong("openingHours", "Giờ mở cửa");

  const phone = text(values.phone);
  if (phone && !/^[0-9+().\-\s]+$/.test(phone)) {
    errors.phone = "Số điện thoại chỉ gồm chữ số, dấu cách và các ký tự + - . ( ).";
  } else {
    tooLong("phone", "Số điện thoại");
  }

  const image = text(values.imageUrl);
  if (image && !isHttpUrl(image)) {
    errors.imageUrl = "Link ảnh phải bắt đầu bằng http:// hoặc https://.";
  } else {
    tooLong("imageUrl", "Link ảnh");
  }

  const priceMin = parsePrice(values.priceMin);
  const priceMax = parsePrice(values.priceMax);
  for (const [key, price] of [["priceMin", priceMin], ["priceMax", priceMax]]) {
    if (Number.isNaN(price)) errors[key] = "Giá phải là số nguyên không âm (đơn vị đồng).";
    else if (price !== null && price > MAX_PRICE) errors[key] = "Giá quá lớn.";
  }
  if (!errors.priceMin && !errors.priceMax && priceMin !== null && priceMax !== null && priceMin > priceMax) {
    errors.priceMax = "Giá cao nhất phải lớn hơn hoặc bằng giá thấp nhất.";
  }

  const latitude = parseCoordinate(values.latitude);
  const longitude = parseCoordinate(values.longitude);
  if (Number.isNaN(latitude)) errors.latitude = "Vĩ độ phải là số, ví dụ 10.7465.";
  else if (latitude !== null && (latitude < -90 || latitude > 90))
    errors.latitude = "Vĩ độ phải nằm trong khoảng -90 đến 90.";
  if (Number.isNaN(longitude)) errors.longitude = "Kinh độ phải là số, ví dụ 106.6350.";
  else if (longitude !== null && (longitude < -180 || longitude > 180))
    errors.longitude = "Kinh độ phải nằm trong khoảng -180 đến 180.";
  if (!errors.latitude && !errors.longitude && (latitude === null) !== (longitude === null)) {
    errors[latitude === null ? "latitude" : "longitude"] =
      "Cần nhập cả vĩ độ và kinh độ, hoặc để trống cả hai.";
  }

  return errors;
}

// Giá trị các ô nhập -> dữ liệu gửi lên API (CreatePlaceDto / UpdatePlaceDto)
export function toPlacePayload(values) {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    address: text(values.address),
    ward: text(values.ward),
    category: text(values.category),
    priceMin: parsePrice(values.priceMin),
    priceMax: parsePrice(values.priceMax),
    openingHours: text(values.openingHours),
    phone: text(values.phone),
    imageUrl: text(values.imageUrl),
    latitude: parseCoordinate(values.latitude),
    longitude: parseCoordinate(values.longitude),
  };
}

// So sánh hai bộ giá trị form sau khi chuẩn hóa (để biết người dùng đã sửa gì chưa)
export function isSameForm(a, b) {
  return JSON.stringify(toPlacePayloadLoose(a)) === JSON.stringify(toPlacePayloadLoose(b));
}

function toPlacePayloadLoose(values) {
  const result = {};
  for (const key of Object.keys(EMPTY_FORM)) result[key] = (values?.[key] ?? "").trim();
  return result;
}
