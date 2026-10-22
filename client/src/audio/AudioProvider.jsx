import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sendListenerHeartbeat, sendListenerLeave } from "../api";
import { useI18n } from "../i18n/useI18n";
import { estimateSeconds, getDeviceId } from "../utils/narration";
import { AudioContext } from "./audioContext";
import { getPlaceText } from "./placeText";
import { createSpeechEngine } from "./speechEngine";

// Đang nghe thì cứ mỗi HEARTBEAT_MS báo server "còn đây".
// Server quá 15s không nhận được thì tự trừ (ListenerService.TimeoutSeconds).
const HEARTBEAT_MS = 5000;

// status: idle | loading | playing | paused | ended | empty | error
export default function AudioProvider({ children }) {
  const { lang: uiLang } = useI18n();
  const [track, setTrack] = useState(null); // { id, name, category, imageUrl, description }
  const [lang, setLang] = useState(uiLang);
  const [status, setStatus] = useState("idle");
  const [text, setText] = useState("");
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [rate, setRateState] = useState(1);
  const [, setVoicesVersion] = useState(0);
  const [inlineVisible, setInlineVisible] = useState(false);
  // Ngôn ngữ khách chọn trong trình phát khi chưa phát gì; đổi ngôn ngữ giao diện thì bỏ lựa chọn này
  const [picked, setPicked] = useState({ ui: uiLang, code: null });
  const preferredLang = picked.ui === uiLang && picked.code ? picked.code : uiLang;
  const loadRef = useRef(0); // lần tải mới nhất; kết quả tải cũ về muộn thì bỏ qua

  const [engine] = useState(() =>
    createSpeechEngine({
      onProgress: setIndex,
      onEnd: () => setStatus("ended"),
      onError: () => setStatus("error"),
    }),
  );

  // Danh sách giọng đọc tải chậm sau khi mở trang
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth?.addEventListener) return;
    const update = () => setVoicesVersion((v) => v + 1);
    synth.addEventListener("voiceschanged", update);
    return () => synth.removeEventListener("voiceschanged", update);
  }, []);

  useEffect(() => () => engine.stop(), [engine]);

  const load = useCallback(
    async (place, code, autoplay) => {
      const id = ++loadRef.current;
      engine.stop();
      setTrack(place);
      setLang(code);
      setIndex(0);
      setTotal(0);
      setText("");
      setStatus("loading");
      try {
        const content = await getPlaceText(place, code);
        if (id !== loadRef.current) return;
        const count = engine.load(content, code);
        setText(content);
        setTotal(count);
        if (!count) return setStatus("empty");
        if (autoplay) {
          engine.play();
          setStatus("playing");
        } else {
          setStatus("paused");
        }
      } catch {
        if (id === loadRef.current) setStatus("error");
      }
    },
    [engine],
  );

  // Bấm "Nghe" ở thẻ hay trang chi tiết. Gọi trong lúc bấm để iPhone cho phép đọc.
  const playPlace = useCallback(
    (place, code = preferredLang) => {
      if (!engine.supported) return;
      engine.unlock();
      if (track?.id === place.id && lang === code && ["paused", "ended"].includes(status)) {
        if (status === "ended") engine.seek(0);
        engine.play();
        setStatus("playing");
        return;
      }
      load(place, code, true);
    },
    [engine, track, lang, status, preferredLang, load],
  );

  const pause = useCallback(() => {
    engine.pause();
    setStatus((s) => (s === "playing" ? "paused" : s));
  }, [engine]);

  const toggle = useCallback(() => {
    if (!track) return;
    if (status === "playing") return pause();
    if (status === "error") return load(track, lang, true);
    playPlace(track, lang);
  }, [track, status, lang, pause, load, playPlace]);

  // Chọn ngôn ngữ cho lần phát sau (không đụng tới bài đang phát)
  const pickLang = useCallback((code) => setPicked({ ui: uiLang, code }), [uiLang]);

  // Đổi ngôn ngữ thuyết minh: đọc lại từ đầu bằng ngôn ngữ mới (đang phát thì phát tiếp)
  const changeLang = useCallback(
    (code) => {
      pickLang(code);
      if (!track || code === lang) return setLang(code);
      engine.unlock();
      load(track, code, status === "playing");
    },
    [engine, track, lang, status, pickLang, load],
  );

  const seek = useCallback(
    (i) => {
      engine.seek(i);
      if (status === "ended") setStatus("paused");
    },
    [engine, status],
  );

  const setRate = useCallback(
    (r) => {
      engine.setRate(r);
      setRateState(r);
    },
    [engine],
  );

  const close = useCallback(() => {
    loadRef.current++;
    engine.stop();
    setTrack(null);
    setStatus("idle");
  }, [engine]);

  // ---- Đếm thiết bị đang nghe (dashboard admin) ----
  const playing = status === "playing";
  const placeId = track?.id;

  useEffect(() => {
    if (!playing) return;
    const deviceId = getDeviceId();
    const beat = () => sendListenerHeartbeat(deviceId, placeId, lang).catch(() => {});
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [playing, placeId, lang]);

  // Dừng, nghe xong, đóng trình phát: báo server trừ ngay, không chờ hết 15s
  useEffect(() => {
    if (!playing) return;
    return () => sendListenerLeave(getDeviceId());
  }, [playing]);

  // Đóng tab, tải lại trang, chuyển app trên điện thoại
  useEffect(() => {
    if (!playing) return;
    const onHide = () => {
      sendListenerLeave(getDeviceId()); // gửi luôn: trang đóng ngay, không kịp chờ React vẽ lại
      pause();
    };
    // Chuyển app / khóa màn hình trên điện thoại thường chỉ phát visibilitychange, không phát pagehide
    const onVisibility = () => document.hidden && onHide();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [playing, pause]);

  const duration = estimateSeconds(text, lang, rate);
  const elapsed = total ? Math.round((duration * index) / total) : 0;
  // Đọc lại mỗi lần vẽ lại: danh sách giọng có thể vừa tải xong (voiceschanged)
  const missingVoice = !engine.hasVoice(lang);

  const value = useMemo(
    () => ({
      supported: engine.supported,
      track,
      lang,
      preferredLang,
      status,
      index,
      total,
      rate,
      duration,
      elapsed,
      missingVoice,
      inlineVisible,
      setInlineVisible,
      playPlace,
      pause,
      toggle,
      pickLang,
      changeLang,
      seek,
      setRate,
      close,
    }),
    [engine, track, lang, preferredLang, status, index, total, rate, duration, elapsed, missingVoice, inlineVisible,
      playPlace, pause, toggle, pickLang, changeLang, seek, setRate, close],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}
