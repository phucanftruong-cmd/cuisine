import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  clearCachedTranslations,
  createPlace,
  getCachedTranslations,
  getPlace,
  getPlaceFilters,
  updatePlace,
} from "../../api";
import { useAuth } from "../../auth/useAuth";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  EMPTY_FORM,
  LIMITS,
  isHttpUrl,
  isSameForm,
  parseCoordinate,
  parsePrice,
  splitCoordinatePair,
  toFormValues,
  toPlacePayload,
  validatePlaceForm,
} from "../../utils/placeForm";

const LANGUAGE_NAMES = {
  en: "English",
  fr: "Français",
  ja: "日本語",
  ko: "한국어",
  "zh-CN": "简体中文",
};

export default function PlaceFormPage() {
  const { id } = useParams();
  // key: chuyển từ "thêm" sang "sửa" (hoặc sửa quán khác) thì làm lại form từ đầu
  return <PlaceForm key={id ?? "new"} id={id} />;
}

function PlaceForm({ id }) {
  const isEdit = id !== undefined;
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const listUrl = `/admin${location.state?.returnTo ?? ""}`;

  const [values, setValues] = useState(EMPTY_FORM);
  const [original, setOriginal] = useState(isEdit ? null : EMPTY_FORM);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState({ categories: [], wards: [] });

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

  const loaded = original !== null;
  const dirty = loaded && !isSameForm(values, original);
  const errors = submitted ? validatePlaceForm(values) : {};
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

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

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
    setField(name, value);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setServerError("");

    const currentErrors = validatePlaceForm(values);
    if (Object.keys(currentErrors).length > 0) {
      // Đưa con trỏ tới ô lỗi đầu tiên
      const firstField = Object.keys(EMPTY_FORM).find((key) => currentErrors[key]);
      document.getElementById(`place-${firstField}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      const payload = toPlacePayload(values);
      const saved = isEdit ? await updatePlace(token, id, payload) : await createPlace(token, payload);
      if (!saved) throw new Error("Không tìm thấy quán này, có thể đã bị xóa.");
      const flash = isEdit ? `Đã lưu thay đổi của quán “${saved.name}”.` : `Đã thêm quán “${saved.name}”.`;
      navigate(listUrl, { state: { flash } });
    } catch (err) {
      setServerError(
        err.status === 404 ? "Không tìm thấy quán này, có thể đã bị người khác xóa." : err.message,
      );
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (loadError) {
    return (
      <>
        <Link to={listUrl} className="back">
          ← Danh sách quán
        </Link>
        <p className="alert alert--error">{loadError}</p>
      </>
    );
  }
  if (!loaded) return <p className="muted">Đang tải...</p>;

  const priceMinPreview = formatPreviewPrice(values.priceMin);
  const priceMaxPreview = formatPreviewPrice(values.priceMax);
  const latitude = parseCoordinate(values.latitude);
  const longitude = parseCoordinate(values.longitude);
  const hasCoordinates =
    !errors.latitude && !errors.longitude &&
    Number.isFinite(latitude) && Number.isFinite(longitude);
  const imageUrl = values.imageUrl.trim();

  // Rời trang khi còn thay đổi chưa lưu thì hỏi lại
  function confirmLeave(event) {
    if (dirty && !window.confirm("Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?")) {
      event.preventDefault();
    }
  }

  const fieldProps = (name) => ({
    id: `place-${name}`,
    name,
    value: values[name],
    onChange: handleChange,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `place-${name}-error` : undefined,
  });

  return (
    <>
      <Link to={listUrl} className="back" onClick={confirmLeave}>
        ← Danh sách quán
      </Link>

      <div className="page-header">
        <div>
          <h1>{isEdit ? "Sửa quán" : "Thêm quán mới"}</h1>
          {isEdit && <p className="muted">{original.name}</p>}
        </div>
        {isEdit && (
          <Link to={`/places/${id}`} className="button-link button-secondary">
            Xem trang khách
          </Link>
        )}
      </div>

      {serverError && (
        <p className="alert alert--error" role="alert">
          Không lưu được: {serverError}
        </p>
      )}
      {submitted && Object.keys(errors).length > 0 && (
        <p className="alert alert--error" role="alert">
          Có {Object.keys(errors).length} ô chưa hợp lệ, vui lòng kiểm tra lại.
        </p>
      )}

      <form className="form place-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="form-section">
          <legend>Thông tin chính</legend>

          <Field label="Tên quán" name="name" required error={errors.name}>
            <input {...fieldProps("name")} maxLength={LIMITS.name} placeholder="Ví dụ: Phở Hòa" />
          </Field>

          <Field
            label="Loại món"
            name="category"
            error={errors.category}
            hint="Chọn loại đã có hoặc gõ loại mới. Dùng để lọc ở trang chủ."
          >
            <input
              {...fieldProps("category")}
              list="category-options"
              maxLength={LIMITS.category}
              placeholder="Ví dụ: Phở, Bún, Cơm tấm..."
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
                Đây là đoạn giới thiệu được dịch tự động sang các ngôn ngữ khác.{" "}
                <span className={values.description.trim().length > LIMITS.description ? "error" : ""}>
                  {values.description.trim().length}/{LIMITS.description} ký tự
                </span>
              </>
            }
          >
            <textarea {...fieldProps("description")} rows={8} />
          </Field>
          {descriptionChanged && (
            <p className="alert alert--warning">
              Bạn đã sửa nội dung thuyết minh. Khi lưu, các bản dịch cũ của quán sẽ bị xóa và
              được dịch lại khi khách xem.
            </p>
          )}
        </fieldset>

        <fieldset className="form-section">
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

        <fieldset className="form-section">
          <legend>Giá mỗi người (đồng)</legend>
          <div className="form-row">
            <Field label="Giá thấp nhất" name="priceMin" error={errors.priceMin} hint={priceMinPreview}>
              <input {...fieldProps("priceMin")} inputMode="numeric" placeholder="Ví dụ: 40000" />
            </Field>
            <Field label="Giá cao nhất" name="priceMax" error={errors.priceMax} hint={priceMaxPreview}>
              <input {...fieldProps("priceMax")} inputMode="numeric" placeholder="Ví dụ: 70000" />
            </Field>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Hình ảnh</legend>
          <Field
            label="Link ảnh"
            name="imageUrl"
            error={errors.imageUrl}
            hint="Dán đường dẫn ảnh bắt đầu bằng https://"
          >
            <input {...fieldProps("imageUrl")} type="url" maxLength={LIMITS.imageUrl} />
          </Field>
          {imageUrl && isHttpUrl(imageUrl) && <ImagePreview key={imageUrl} src={imageUrl} />}
        </fieldset>

        <fieldset className="form-section">
          <legend>Vị trí trên bản đồ</legend>
          <p className="muted small">
            Mẹo: trên Google Maps, bấm chuột phải vào quán rồi bấm vào dòng tọa độ để sao chép,
            sau đó dán cả cặp số vào ô Vĩ độ.
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
              className="link"
            >
              Kiểm tra vị trí trên Google Maps ↗
            </a>
          )}
        </fieldset>

        <div className="form-actions form-actions--sticky">
          <button type="submit" disabled={saving}>
            {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm quán"}
          </button>
          <Link to={listUrl} className="button-link button-secondary" onClick={confirmLeave}>
            Hủy
          </Link>
          {isEdit && !dirty && <span className="muted small">Chưa có thay đổi</span>}
        </div>
      </form>

      {isEdit && <TranslationCachePanel placeId={id} token={token} />}
    </>
  );
}

function Field({ label, name, required, error, hint, children }) {
  return (
    <div className={error ? "field field--error" : "field"}>
      <label htmlFor={`place-${name}`}>
        {label}
        {required && (
          <span className="required" aria-label="bắt buộc">
            {" "}*
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`place-${name}-error`}>
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

function ImagePreview({ src }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <p className="field-error">Không tải được ảnh từ link này. Hãy kiểm tra lại link.</p>;
  }
  return <img src={src} alt="Xem trước ảnh quán" className="image-preview" onError={() => setFailed(true)} />;
}

function formatPreviewPrice(value) {
  const price = parsePrice(value);
  return Number.isFinite(price) ? `= ${price.toLocaleString("vi-VN")}đ` : null;
}

// Xem và xóa các bản dịch đã lưu của quán
function TranslationCachePanel({ placeId, token }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clearError, setClearError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    getCachedTranslations(token, placeId)
      .then((data) => {
        if (!ignore) {
          setItems(data ?? []);
          setError("");
        }
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [placeId, token, reloadKey]);

  async function handleClear() {
    setBusy(true);
    setClearError("");
    try {
      await clearCachedTranslations(token, placeId);
      setConfirming(false);
      setMessage("Đã xóa các bản dịch đã lưu. Khách xem lần tới sẽ được dịch lại.");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setClearError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel translation-panel">
      <h2>Bản dịch đã lưu</h2>
      <p className="muted small">
        Bản dịch tự động được lưu lại sau lần dịch đầu tiên để không phải gọi dịch vụ dịch nhiều
        lần. Xóa đi nếu bản dịch sai hoặc dịch vụ dịch đã dịch tốt hơn.
      </p>

      {message && <p className="alert alert--success">{message}</p>}
      {error && <p className="error">Không tải được bản dịch: {error}</p>}
      {!items && !error && <p className="muted">Đang tải...</p>}

      {items && items.length === 0 && <p>Chưa có bản dịch nào được lưu.</p>}
      {items && items.length > 0 && (
        <>
          <ul className="translation-list">
            {items.map((t) => (
              <li key={t.languageCode}>
                <strong>{LANGUAGE_NAMES[t.languageCode] ?? t.languageCode}</strong>
                <p className="translation-text">{t.translatedText}</p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="button-danger"
            onClick={() => {
              setClearError("");
              setMessage("");
              setConfirming(true);
            }}
          >
            Xóa tất cả bản dịch đã lưu
          </button>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title="Xóa bản dịch đã lưu?"
        confirmLabel="Xóa bản dịch"
        busy={busy}
        error={clearError}
        onConfirm={handleClear}
        onCancel={() => setConfirming(false)}
      >
        <p>
          {items?.length ?? 0} bản dịch của quán sẽ bị xóa. Khi khách chọn ngôn ngữ, hệ thống sẽ dịch
          lại từ nội dung tiếng Việt hiện tại.
        </p>
      </ConfirmDialog>
    </section>
  );
}
