import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { createPlace, getPlace, getPlaceFilters, mediaUrl, updatePlace } from "../../api";
import { useAuth } from "../../auth/useAuth";
import Icon from "../../components/Icon";
import PlaceCard from "../../components/PlaceCard";
import {
  EMPTY_FORM,
  LIMITS,
  isImageUrl,
  isSameForm,
  isUploadedImage,
  parseCoordinate,
  parsePrice,
  splitCoordinatePair,
  toFormValues,
  toPlacePayload,
  validatePlaceForm,
} from "../../utils/placeForm";
import { PROFILE_ITEMS, isSamplePlace } from "../../utils/placeStatus";
import AdminLayout from "./AdminLayout";
import Field from "./Field";
import PlaceGalleryPanel from "./PlaceGalleryPanel";
import TranslationCachePanel from "./TranslationCachePanel";
import { useToast } from "./toastContext";
import { useImageStatus } from "./useImageStatus";

// Form chia thành các tab; ô nào thuộc tab nào (để báo lỗi và nhảy tới đúng tab)
const TABS = [
  { key: "info", label: "Thông tin" },
  { key: "contact", label: "Liên hệ và vị trí" },
  { key: "media", label: "Giá và ảnh" },
  { key: "translations", label: "Bản dịch", editOnly: true },
];
const FIELD_TAB = {
  name: "info",
  category: "info",
  description: "info",
  address: "contact",
  ward: "contact",
  phone: "contact",
  openingHours: "contact",
  latitude: "contact",
  longitude: "contact",
  priceMin: "media",
  priceMax: "media",
  imageUrl: "media",
};

const IMAGE_ERROR =
  "Không tải được ảnh từ link này. Hãy dùng link trỏ thẳng tới file ảnh: chuột phải vào ảnh, chọn “Sao chép địa chỉ hình ảnh”, rồi dán vào đây.";

export default function PlaceFormPage() {
  const { id } = useParams();
  // key: chuyển từ "thêm" sang "sửa" (hoặc sửa quán khác) thì làm lại form từ đầu
  return <PlaceForm key={id ?? "new"} id={id} />;
}

function PlaceForm({ id }) {
  const isEdit = id !== undefined;
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const listUrl = `/admin/places${location.state?.returnTo ?? ""}`;

  const [values, setValues] = useState(EMPTY_FORM);
  const [original, setOriginal] = useState(isEdit ? null : EMPTY_FORM);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState({ categories: [], wards: [] });

  const [tab, setTab] = useState("info");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    getPlaceFilters()
      .then(setFilters)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let ignore = false;
    getPlace(id)
      .then((place) => {
        if (ignore) return;
        const formValues = toFormValues(place);
        setValues(formValues);
        setOriginal(formValues);
      })
      .catch((err) => {
        if (!ignore) setLoadError(err.status === 404 ? "Không tìm thấy quán này, có thể đã bị xóa." : err.message);
      });
    return () => {
      ignore = true;
    };
  }, [id, isEdit]);

  const imageUrl = values.imageUrl.trim();
  const imageStatus = useImageStatus(isImageUrl(imageUrl) ? mediaUrl(imageUrl) : "");

  const loaded = original !== null;
  const dirty = loaded && !isSameForm(values, original);
  const errors = submitted ? validatePlaceForm(values) : {};
  if (imageStatus === "error" && !errors.imageUrl) errors.imageUrl = IMAGE_ERROR;
  const errorCount = Object.keys(errors).length;
  const errorTabs = new Set(Object.keys(errors).map((key) => FIELD_TAB[key]));
  const descriptionChanged =
    isEdit && loaded && values.description.trim() !== original.description.trim();

  // Cảnh báo khi đóng tab hoặc tải lại trang lúc còn thay đổi chưa lưu
  useEffect(() => {
    if (!dirty || saving) return;
    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty, saving]);

  function handleChange(event) {
    const { name, value } = event.target;
    // Dán cặp tọa độ "10.7465, 106.6350" (copy từ Google Maps) vào ô vĩ độ
    if (name === "latitude") {
      const pair = splitCoordinatePair(value);
      if (pair) {
        setValues((current) => ({ ...current, ...pair }));
        return;
      }
    }
    setValues((current) => ({ ...current, [name]: value }));
  }

  // Ảnh bìa đổi qua mục "Ảnh món ăn" (đã lưu trên server): cập nhật cả giá trị gốc
  // để form không coi là "chưa lưu", và để bấm "Lưu thay đổi" sau đó không ghi đè ảnh bìa cũ.
  function handleCoverChange(url) {
    setValues((current) => ({ ...current, imageUrl: url }));
    setOriginal((current) => ({ ...current, imageUrl: url }));
  }

  // Rời trang khi còn thay đổi chưa lưu thì hỏi lại
  function confirmLeave(event) {
    if (dirty && !window.confirm("Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?")) {
      event.preventDefault();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setServerError("");

    const currentErrors = validatePlaceForm(values);
    if (imageStatus === "error") currentErrors.imageUrl = IMAGE_ERROR;
    if (Object.keys(currentErrors).length > 0) {
      // Mở tab có ô lỗi đầu tiên rồi đưa con trỏ tới ô đó (ô chỉ nhận focus khi tab đã hiện)
      const firstField = Object.keys(EMPTY_FORM).find((key) => currentErrors[key]);
      setTab(FIELD_TAB[firstField] ?? "info");
      setTimeout(() => document.getElementById(`place-${firstField}`)?.focus(), 0);
      return;
    }

    setSaving(true);
    try {
      const payload = toPlacePayload(values);
      const saved = isEdit ? await updatePlace(token, id, payload) : await createPlace(token, payload);
      if (!saved) throw new Error("Không tìm thấy quán này, có thể đã bị xóa.");
      if (isEdit) {
        navigate(listUrl, { state: { flash: `Đã lưu thay đổi của quán “${saved.name}”.` } });
      } else {
        // Quán mới: ở lại trang sửa để thêm ảnh món ngay
        toast(`Đã thêm quán “${saved.name}”. Bạn có thể thêm ảnh món ăn ở bên dưới.`);
        navigate(`/admin/places/${saved.id}/edit`, { replace: true, state: location.state });
      }
    } catch (err) {
      setServerError(
        err.status === 404 ? "Không tìm thấy quán này, có thể đã bị người khác xóa." : err.message,
      );
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const title = isEdit ? "Sửa quán" : "Thêm quán mới";
  const back = { to: listUrl, label: "Danh sách quán", onClick: confirmLeave };

  if (loadError) {
    return (
      <AdminLayout title={title} back={back}>
        <div className="notice notice--error">{loadError}</div>
      </AdminLayout>
    );
  }
  if (!loaded) {
    return (
      <AdminLayout title={title} back={back}>
        <div className="surface" aria-busy="true" aria-label="Đang tải">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line" />
        </div>
      </AdminLayout>
    );
  }

  const latitude = parseCoordinate(values.latitude);
  const longitude = parseCoordinate(values.longitude);
  const hasCoordinates =
    !errors.latitude && !errors.longitude && Number.isFinite(latitude) && Number.isFinite(longitude);

  const preview = {
    name: values.name.trim() || "Tên quán",
    category: values.category.trim(),
    address: [values.address.trim(), values.ward.trim()].filter(Boolean).join(", "),
    priceMin: Number.isFinite(parsePrice(values.priceMin)) ? parsePrice(values.priceMin) : null,
    priceMax: Number.isFinite(parsePrice(values.priceMax)) ? parsePrice(values.priceMax) : null,
    openingHours: values.openingHours.trim(),
    imageUrl: imageStatus === "ok" ? imageUrl : "",
  };

  const fieldProps = (name) => ({
    id: `place-${name}`,
    name,
    value: values[name],
    onChange: handleChange,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `place-${name}-error` : undefined,
  });

  return (
    <AdminLayout
      title={title}
      description={isEdit ? original.name : "Nhập thông tin quán đã khảo sát. Ô có dấu * là bắt buộc."}
      back={back}
    >
      {serverError && (
        <div className="notice notice--error" role="alert">
          Không lưu được: {serverError}
        </div>
      )}
      {submitted && errorCount > 0 && (
        <div className="notice notice--error" role="alert">
          Có {errorCount} ô chưa hợp lệ, vui lòng kiểm tra lại.
        </div>
      )}

      <div className="form-layout">
        <form id="place-form" className="form-main" onSubmit={handleSubmit} noValidate>
          <div className="admin-tabs" role="tablist" aria-label="Các phần của form">
            {TABS.filter((t) => isEdit || !t.editOnly).map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls={`panel-${t.key}`}
                className={`admin-tab${tab === t.key ? " is-active" : ""}${errorTabs.has(t.key) ? " has-error" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {errorTabs.has(t.key) && <span className="sr-only"> (có ô chưa hợp lệ)</span>}
              </button>
            ))}
          </div>

          <div
            className="admin-panel"
            role="tabpanel"
            id="panel-info"
            aria-labelledby="tab-info"
            hidden={tab !== "info"}
          >
            <fieldset className="surface form-section">
              <legend>Thông tin chính</legend>

              <Field label="Tên quán" name="name" required error={errors.name}>
                <input {...fieldProps("name")} maxLength={LIMITS.name} placeholder="Ví dụ: Phở Hòa" />
              </Field>

              <Field
                label="Loại món"
                name="category"
                error={errors.category}
                hint="Chọn loại đã có hoặc gõ loại mới. Khách dùng mục này để lọc quán."
              >
                <input
                  {...fieldProps("category")}
                  list="category-options"
                  maxLength={LIMITS.category}
                  placeholder="Ví dụ: Phở, Bún, Cơm tấm"
                />
                <datalist id="category-options">
                  {filters.categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>

              <Field
                label="Nội dung thuyết minh (tiếng Việt)"
                name="description"
                required
                error={errors.description}
                hint={
                  <>
                    Đoạn giới thiệu này được dịch tự động sang 5 ngôn ngữ cho khách nước ngoài.{" "}
                    <span className={values.description.trim().length > LIMITS.description ? "field-error" : ""}>
                      {values.description.trim().length}/{LIMITS.description} ký tự
                    </span>
                  </>
                }
              >
                <textarea {...fieldProps("description")} rows={8} />
              </Field>
              {descriptionChanged && (
                <div className="notice notice--warning">
                  Bạn đã sửa nội dung thuyết minh. Khi lưu, các bản dịch cũ của quán sẽ bị xóa và được dịch
                  lại khi khách xem.
                </div>
              )}
            </fieldset>
          </div>

          <div
            className="admin-panel"
            role="tabpanel"
            id="panel-contact"
            aria-labelledby="tab-contact"
            hidden={tab !== "contact"}
          >
            <fieldset className="surface form-section">
              <legend>Địa chỉ và liên hệ</legend>

              <Field label="Địa chỉ" name="address" error={errors.address}>
                <input {...fieldProps("address")} maxLength={LIMITS.address} placeholder="Số nhà, tên đường" />
              </Field>

              <div className="form-row">
                <Field label="Phường" name="ward" error={errors.ward}>
                  <input {...fieldProps("ward")} list="ward-options" maxLength={LIMITS.ward} />
                  <datalist id="ward-options">
                    {filters.wards.map((w) => (
                      <option key={w} value={w} />
                    ))}
                  </datalist>
                </Field>

                <Field label="Số điện thoại" name="phone" error={errors.phone}>
                  <input {...fieldProps("phone")} type="tel" inputMode="tel" maxLength={LIMITS.phone} />
                </Field>
              </div>

              <Field label="Giờ mở cửa" name="openingHours" error={errors.openingHours}>
                <input
                  {...fieldProps("openingHours")}
                  maxLength={LIMITS.openingHours}
                  placeholder="Ví dụ: 06:00 - 21:00"
                />
              </Field>
            </fieldset>

            <fieldset className="surface form-section">
              <legend>Vị trí trên bản đồ</legend>
              <p className="field-hint">
                Trên Google Maps, chuột phải vào quán rồi bấm dòng tọa độ đầu tiên để sao chép. Dán cả cặp số
                vào ô Vĩ độ, hệ thống tự tách ra 2 ô.
              </p>
              <div className="form-row">
                <Field label="Vĩ độ" name="latitude" error={errors.latitude}>
                  <input {...fieldProps("latitude")} inputMode="decimal" placeholder="10.7465" />
                </Field>
                <Field label="Kinh độ" name="longitude" error={errors.longitude}>
                  <input {...fieldProps("longitude")} inputMode="decimal" placeholder="106.6350" />
                </Field>
              </div>
              {hasCoordinates && (
                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-text"
                >
                  <Icon name="pin" size={16} />
                  Kiểm tra vị trí trên Google Maps
                </a>
              )}
            </fieldset>
          </div>

          <div
            className="admin-panel"
            role="tabpanel"
            id="panel-media"
            aria-labelledby="tab-media"
            hidden={tab !== "media"}
          >
            <fieldset className="surface form-section">
              <legend>Giá mỗi người</legend>
              <div className="form-row">
                <Field label="Giá thấp nhất (đồng)" name="priceMin" error={errors.priceMin} hint={pricePreview(values.priceMin)}>
                  <input {...fieldProps("priceMin")} inputMode="numeric" placeholder="Ví dụ: 40000" />
                </Field>
                <Field label="Giá cao nhất (đồng)" name="priceMax" error={errors.priceMax} hint={pricePreview(values.priceMax)}>
                  <input {...fieldProps("priceMax")} inputMode="numeric" placeholder="Ví dụ: 70000" />
                </Field>
              </div>
            </fieldset>

            <fieldset className="surface form-section">
              <legend>Ảnh bìa</legend>
              <Field
                label="Link ảnh bìa"
                name="imageUrl"
                error={errors.imageUrl}
                hint={
                  isUploadedImage(imageUrl) && imageStatus !== "loading" ? (
                    "Đang dùng một ảnh món đã tải lên làm ảnh bìa. Đổi ảnh bìa ở mục “Ảnh món ăn”, hoặc dán link ảnh khác vào đây."
                  ) : (
                    <ImageStatusHint status={imageStatus} />
                  )
                }
              >
                <div className="input-group">
                  <input {...fieldProps("imageUrl")} inputMode="url" maxLength={LIMITS.imageUrl} placeholder="https://…/anh-quan.jpg" />
                  {values.imageUrl && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setValues((current) => ({ ...current, imageUrl: "" }))}
                    >
                      Bỏ ảnh
                    </button>
                  )}
                </div>
              </Field>
            </fieldset>

            {isEdit ? (
              <PlaceGalleryPanel placeId={id} token={token} onCoverChange={handleCoverChange} />
            ) : (
              <section className="surface form-section">
                <h2>
                  <Icon name="image" /> Ảnh món ăn
                </h2>
                <p className="field-hint">
                  Bấm “Thêm quán” trước, sau đó trang này chuyển sang chế độ sửa để bạn tải ảnh món ăn từ máy lên.
                </p>
              </section>
            )}
          </div>

          {isEdit && (
            <div
              className="admin-panel"
              role="tabpanel"
              id="panel-translations"
              aria-labelledby="tab-translations"
              hidden={tab !== "translations"}
            >
              <TranslationCachePanel placeId={id} token={token} />
            </div>
          )}
        </form>

        <aside className="form-aside" aria-label="Xem trước">
          <section className="surface aside-section">
            <h2>Khách sẽ thấy</h2>
            <PlaceCard place={preview} preview />
          </section>

          <section className="surface aside-section">
            <h2>Hồ sơ quán</h2>
            <ul className="checklist">
              {PROFILE_ITEMS.map((item) => {
                const ok = item.key === "image" ? imageStatus === "ok" : item.has(values);
                return (
                  <li key={item.key} className={ok ? "is-done" : ""}>
                    <Icon name={ok ? "check" : item.icon} size={16} />
                    {item.label}
                  </li>
                );
              })}
            </ul>
            {isSamplePlace(values) && (
              <p className="notice notice--warning notice--compact">
                Tên còn chữ “[Mẫu]”. Đổi thành tên quán thật sau khi khảo sát.
              </p>
            )}
          </section>

          {isEdit && (
            <Link to={`/places/${id}`} className="btn-text aside-link">
              <Icon name="eye" size={16} />
              Mở trang của quán như khách
            </Link>
          )}
        </aside>
      </div>
      <div className="form-savebar">
        <span className="form-savebar-state" aria-live="polite">
          {dirty ? "Có thay đổi chưa lưu" : isEdit ? "Mọi thay đổi đã được lưu" : ""}
        </span>
        <Link to={listUrl} className="btn btn-secondary" onClick={confirmLeave}>
          Hủy
        </Link>
        <button type="submit" form="place-form" className="btn btn-primary" disabled={saving}>
          {saving ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Thêm quán"}
        </button>
      </div>
    </AdminLayout>
  );
}

function ImageStatusHint({ status }) {
  if (status === "loading") return "Đang kiểm tra ảnh…";
  if (status === "ok")
    return (
      <span className="hint-ok">
        <Icon name="check" size={14} /> Ảnh tải được, xem ở thẻ bên cạnh.
      </span>
    );
  return "Dán link trỏ thẳng tới file ảnh (thường kết thúc bằng .jpg, .png, .webp).";
}

function pricePreview(value) {
  const price = parsePrice(value);
  return Number.isFinite(price) ? `= ${price.toLocaleString("vi-VN")}đ` : null;
}

