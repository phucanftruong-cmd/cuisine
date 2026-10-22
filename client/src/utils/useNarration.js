import { useCallback, useEffect, useRef, useState } from "react";
import { sendListenerHeartbeat, sendListenerLeave } from "../api";
import { getDeviceId, pickVoice, speechLang, splitSentences } from "./narration";

// Đang nghe thì cứ mỗi HEARTBEAT_MS báo server "còn đây".
// Server quá 15s không nhận được thì tự trừ (ListenerService.TimeoutSeconds).
const HEARTBEAT_MS = 5000;

const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;

// Đọc thuyết minh bằng giọng máy (Web Speech API) và báo server để đếm thiết bị đang nghe.
// Đổi ngôn ngữ khi đang nghe thì đọc lại bằng ngôn ngữ mới.
export function useNarration(placeId, text, lang) {
  const [playing, setPlaying] = useState(false);
  const [voices, setVoices] = useState(() => synth?.getVoices() ?? []);
  const spokenRef = useRef(""); // đoạn đang đọc, để không đọc lại cùng một đoạn
  const runRef = useRef(0); // mỗi lần đọc một số mới, lần đọc cũ bị hủy thì bỏ qua sự kiện của nó

  // Danh sách giọng đọc thường tải chậm sau khi mở trang
  useEffect(() => {
    if (!synth) return;
    const update = () => setVoices(synth.getVoices());
    synth.addEventListener?.("voiceschanged", update);
    return () => synth.removeEventListener?.("voiceschanged", update);
  }, []);

  const stopSpeech = useCallback(() => {
    runRef.current++;
    spokenRef.current = "";
    synth?.cancel();
  }, []);

  const speak = useCallback(
    (content, code) => {
      stopSpeech();
      const run = runRef.current;
      spokenRef.current = `${code}|${content}`;

      const parts = splitSentences(content);
      const voice = pickVoice(synth.getVoices(), code);
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        u.lang = speechLang(code);
        if (voice) u.voice = voice;
        // Đọc hết câu cuối thì coi như nghe xong
        if (i === parts.length - 1) {
          u.onend = () => {
            if (runRef.current === run) setPlaying(false);
          };
        }
        synth.speak(u);
      });
    },
    [stopSpeech],
  );

  // Bấm nút phải gọi speak() ngay trong lúc bấm: iPhone chặn đọc nếu không do người dùng bấm
  const toggle = useCallback(() => {
    if (!synth) return;
    if (playing) {
      stopSpeech();
      setPlaying(false);
      return;
    }
    if (text) speak(text, lang);
    setPlaying(true);
  }, [playing, text, lang, speak, stopSpeech]);

  // Đang nghe mà đổi ngôn ngữ (hoặc bản dịch vừa tải xong) thì đọc lại
  useEffect(() => {
    if (!playing) return;
    if (!text) {
      stopSpeech(); // chờ bản dịch, vẫn tính là đang nghe
      return;
    }
    if (spokenRef.current !== `${lang}|${text}`) speak(text, lang);
  }, [playing, text, lang, speak, stopSpeech]);

  // Đang nghe: gửi heartbeat ngay rồi lặp lại; đổi ngôn ngữ thì gửi ngay
  useEffect(() => {
    if (!playing) return;
    const deviceId = getDeviceId();
    const beat = () => sendListenerHeartbeat(deviceId, placeId, lang).catch(() => {});
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [playing, placeId, lang]);

  // Dừng nghe hoặc rời trang quán: báo server trừ ngay, không chờ hết 15s
  useEffect(() => {
    if (!playing) return;
    return () => {
      sendListenerLeave(getDeviceId());
      stopSpeech();
    };
  }, [playing, stopSpeech]);

  // Đóng tab, tải lại trang, chuyển app trên điện thoại
  useEffect(() => {
    if (!playing) return;
    const onHide = () => {
      // Gửi luôn ở đây: trang đóng ngay, không kịp chờ React vẽ lại
      sendListenerLeave(getDeviceId());
      stopSpeech();
      setPlaying(false);
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [playing, stopSpeech]);

  return {
    playing,
    supported: Boolean(synth),
    // Máy đã tải danh sách giọng mà không có giọng cho ngôn ngữ này
    missingVoice: voices.length > 0 && !pickVoice(voices, lang),
    toggle,
  };
}
