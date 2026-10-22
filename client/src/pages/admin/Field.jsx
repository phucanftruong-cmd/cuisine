// Một ô nhập của form quán: nhãn, ô nhập (children), gợi ý hoặc lỗi
export default function Field({ label, name, required, error, hint, children }) {
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
