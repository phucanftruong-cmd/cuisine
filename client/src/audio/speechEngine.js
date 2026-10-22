import { pickVoice, speechLang, splitSentences } from "../utils/narration.js";

// "Engine" đọc thuyết minh bằng giọng máy của trình duyệt (Web Speech API).
// Giao diện chung của engine: load / play / pause / seek / setRate / stop.
// Sau này dùng TTS bên ngoài (file MP3) thì viết thêm engine khác cùng giao diện, không phải sửa UI.
//
// Đọc từng câu một (không xếp hàng cả bài) để tạm dừng, tua và đổi tốc độ chạy giống nhau trên mọi trình duyệt:
// speechSynthesis.pause() trên Android không ổn định nên "tạm dừng" = dừng hẳn rồi đọc lại từ đầu câu đó.
export function createSpeechEngine({ onProgress, onEnd, onError }) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  let sentences = [];
  let code = "vi";
  let index = 0;
  let rate = 1;
  let playing = false;
  let run = 0; // mỗi lần đọc một số mới; sự kiện của lần đọc cũ (đã hủy) bị bỏ qua

  function speakCurrent() {
    const myRun = ++run;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(sentences[index]);
    u.lang = speechLang(code);
    u.rate = rate;
    const voice = pickVoice(synth.getVoices(), code);
    if (voice) u.voice = voice;
    u.onend = () => {
      if (myRun !== run || !playing) return;
      if (index + 1 < sentences.length) {
        index++;
        onProgress(index);
        speakCurrent();
      } else {
        playing = false;
        onEnd();
      }
    };
    u.onerror = (e) => {
      // "interrupted"/"canceled" là do mình gọi cancel(), không phải lỗi
      if (myRun !== run || e.error === "interrupted" || e.error === "canceled") return;
      playing = false;
      onError(e.error);
    };
    synth.speak(u);
  }

  return {
    supported: Boolean(synth),

    // iPhone chỉ cho đọc nếu lần đầu được gọi ngay trong lúc bấm: đọc chuỗi rỗng để "mở khóa"
    // trước khi phải chờ tải bản dịch
    unlock() {
      if (synth && !playing) synth.speak(new SpeechSynthesisUtterance(""));
    },

    load(text, lang) {
      this.stop();
      sentences = splitSentences(text);
      code = lang;
      return sentences.length;
    },

    play() {
      if (!synth || !sentences.length) return;
      if (index >= sentences.length) index = 0;
      playing = true;
      speakCurrent();
    },

    pause() {
      playing = false;
      run++;
      synth?.cancel();
    },

    seek(i) {
      index = Math.max(0, Math.min(sentences.length - 1, i));
      onProgress(index);
      if (playing) speakCurrent();
    },

    setRate(r) {
      rate = r;
      if (playing) speakCurrent(); // đọc lại câu hiện tại với tốc độ mới
    },

    stop() {
      this.pause();
      index = 0;
    },

    hasVoice(lang) {
      const voices = synth?.getVoices() ?? [];
      // Danh sách giọng chưa tải xong thì coi như có, tránh báo nhầm
      return voices.length === 0 || Boolean(pickVoice(voices, lang));
    },
  };
}
