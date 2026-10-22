import { useEffect, useId, useState, useSyncExternalStore } from "react";
import {
  LANGUAGE_NAMES,
  SPEECH_RATE,
  pickVoice,
  speechLang,
  splitForSpeech,
  voiceLabel,
  voicesForLang,
} from "../utils/speech";
import Icon from "./Icon";
import "./SpeakButton.css";

// ---- Bộ điều khiển chung: cả trang chỉ có một nút được đọc tại một thời điểm ----
let state = { owner: null };
const listeners = new Set();
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;
function setOwner(owner) {
  state = { owner };
  listeners.forEach((listener) => listener());
}

// Trả về bộ đọc của trình duyệt, hoặc null nếu trình duyệt không hỗ trợ
function getSynth() {
  if (typeof window === "undefined") return null;
  const synth = window.speechSynthesis;
  return synth && typeof window.SpeechSynthesisUtterance === "function" ? synth : null;
}

// Giọng người dùng đã chọn cho từng ngôn ngữ, nhớ trên trình duyệt này
const VOICE_KEY = (lang) => `audioguide.voice.${lang}`;
function getPreferredVoice(lang) {
  try {
    return localStorage.getItem(VOICE_KEY(lang));
  } catch {
    return null;
  }
}
function setPreferredVoice(lang, name) {
  try {
    localStorage.setItem(VOICE_KEY(lang), name);
  } catch {
    // Trình duyệt chặn lưu: vẫn dùng được giọng đã chọn cho lần đọc này
  }
}

// Danh sách giọng trên máy, cập nhật khi trình duyệt tải xong (Chrome tải không đồng bộ)
function useVoices() {
  const [voices, setVoices] = useState(() => getSynth()?.getVoices() ?? []);
  useEffect(() => {
    const synth = getSynth();
    if (!synth) return;
    const update = () => setVoices(synth.getVoices());
    update();
    synth.addEventListener?.("voiceschanged", update);
    return () => synth.removeEventListener?.("voiceschanged", update);
  }, []);
  return voices;
}

// Mỗi lần bắt đầu/dừng tăng số phiên, để bỏ qua sự kiện của các câu đọc cũ
let session = 0;

function stopSpeaking() {
  session += 1;
  getSynth()?.cancel();
  setOwner(null);
}

// Danh sách giọng có thể chưa có ngay khi mở trang (Chrome tải không đồng bộ)
function loadVoices(synth) {
  const voices = synth.getVoices();
  if (voices.length) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener?.("voiceschanged", done);
      resolve(synth.getVoices());
    };
    synth.addEventListener?.("voiceschanged", done);
    setTimeout(done, 1000);
  });
}

async function startSpeaking(owner, text, lang, onIssue) {
  const synth = getSynth();
  if (!synth) return;
  stopSpeaking();
  const mySession = ++session;
  setOwner(owner);

  const tag = speechLang(lang);
  const voices = await loadVoices(synth);
  if (mySession !== session) return;

  const voice = pickVoice(voices, tag, getPreferredVoice(lang));
  onIssue(
    voice
      ? ""
      : `Máy này chưa có giọng đọc ${LANGUAGE_NAMES[lang] ?? lang}, trình duyệt sẽ đọc bằng giọng mặc định.`,
  );

  const chunks = splitForSpeech(text);
  chunks.forEach((chunk, index) => {
    const utterance = new window.SpeechSynthesisUtterance(chunk);
    utterance.lang = tag;
    utterance.rate = SPEECH_RATE;
    if (voice) utterance.voice = voice;
    if (index === chunks.length - 1) {
      utterance.onend = () => {
        if (mySession === session) setOwner(null);
      };
    }
    utterance.onerror = (event) => {
      if (mySession !== session || event.error === "interrupted" || event.error === "canceled") return;
      stopSpeaking();
      onIssue("Không phát được giọng đọc trên trình duyệt này.");
    };
    synth.speak(utterance);
  });
}

// Nút nghe thuyết minh. compact: chỉ có biểu tượng (dùng trong bảng)
export default function SpeakButton({
  text,
  lang = "vi",
  label = "Nghe thuyết minh",
  stopLabel = "Dừng đọc",
  compact = false,
}) {
  const id = useId();
  const { owner } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const speaking = owner === id;
  const [issue, setIssue] = useState("");
  const supported = getSynth() !== null;
  const voices = useVoices();
  const langVoices = compact ? [] : voicesForLang(voices, speechLang(lang));
  // Mỗi ngôn ngữ nhớ giọng riêng: đổi ngôn ngữ thì đọc lại lựa chọn của ngôn ngữ đó
  const [choice, setChoice] = useState({ lang, name: getPreferredVoice(lang) });
  const chosenVoice = choice.lang === lang ? choice.name : getPreferredVoice(lang);
  const currentVoice = pickVoice(langVoices, speechLang(lang), chosenVoice);

  function handleVoiceChange(event) {
    const name = event.target.value;
    setPreferredVoice(lang, name);
    setChoice({ lang, name });
    if (speaking) stopSpeaking();
  }
  const hasText = Boolean(text?.trim());

  // Đổi nội dung, đổi ngôn ngữ hoặc rời trang thì dừng đọc
  useEffect(
    () => () => {
      if (getSnapshot().owner === id) stopSpeaking();
    },
    [id, text, lang],
  );

  function handleClick() {
    if (speaking) stopSpeaking();
    else startSpeaking(id, text, lang, setIssue);
  }

  const disabledReason = !supported
    ? "Trình duyệt này không hỗ trợ đọc thành tiếng"
    : !hasText
      ? "Chưa có nội dung thuyết minh"
      : "";
  const actionLabel = speaking ? stopLabel : label;

  if (compact) {
    return (
      <button
        type="button"
        className={speaking ? "admin-icon-button speak-compact is-speaking" : "admin-icon-button speak-compact"}
        onClick={handleClick}
        disabled={Boolean(disabledReason)}
        aria-pressed={speaking}
        aria-label={actionLabel}
        title={disabledReason || issue || actionLabel}
      >
        <Icon name={speaking ? "stop" : "volume"} />
      </button>
    );
  }

  return (
    <div className="speak">
      <div className="speak-row">
        <button
          type="button"
          className={speaking ? "speak-button is-speaking" : "speak-button"}
          onClick={handleClick}
          disabled={Boolean(disabledReason)}
          aria-pressed={speaking}
          title={disabledReason || undefined}
        >
          <Icon name={speaking ? "stop" : "volume"} size={18} />
          <span>{actionLabel}</span>
          {speaking && (
            <span className="speak-wave" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          )}
        </button>
        {langVoices.length > 1 && (
          <label className="speak-voice" title="Chọn giọng đọc">
            <span className="sr-only">Giọng đọc</span>
            <select value={currentVoice?.name ?? ""} onChange={handleVoiceChange}>
              {langVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {voiceLabel(v)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {disabledReason && supported === false && <p className="speak-issue">{disabledReason}.</p>}
      {issue && <p className="speak-issue">{issue}</p>}
    </div>
  );
}
