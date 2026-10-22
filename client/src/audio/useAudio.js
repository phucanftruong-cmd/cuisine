import { useContext } from "react";
import { AudioContext } from "./audioContext";

// Trình phát thuyết minh dùng chung toàn trang (chỉ 1 bài tại một thời điểm)
export function useAudio() {
  const audio = useContext(AudioContext);
  if (!audio) throw new Error("useAudio phải được dùng bên trong <AudioProvider>.");
  return audio;
}
