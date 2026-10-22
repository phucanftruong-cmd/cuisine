// Unit test cho speechEngine với speechSynthesis giả. Chạy: npm test
import assert from "node:assert/strict";
import test from "node:test";

// Giả trình duyệt: speak() chỉ ghi lại câu, test tự gọi onend để "đọc xong"
function setup() {
  const spoken = [];
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  globalThis.window = {
    speechSynthesis: {
      speak: (u) => spoken.push(u),
      cancel() {},
      getVoices: () => [],
    },
  };
  return spoken;
}

async function makeEngine() {
  const spoken = setup();
  const { createSpeechEngine } = await import("./speechEngine.js");
  const calls = { progress: [], end: 0, error: 0 };
  const engine = createSpeechEngine({
    onProgress: (i) => calls.progress.push(i),
    onEnd: () => calls.end++,
    onError: () => calls.error++,
  });
  engine.load("Câu một. Câu hai. Câu ba.", "vi");
  return { engine, spoken, calls };
}

test("đọc hết câu cuối thì gọi onEnd đúng một lần", async () => {
  const { engine, spoken, calls } = await makeEngine();
  engine.play();
  spoken.at(-1).onend();
  spoken.at(-1).onend();
  spoken.at(-1).onend();
  assert.deepEqual(calls.progress, [1, 2]);
  assert.equal(calls.end, 1);
  assert.deepEqual(
    spoken.map((u) => u.text),
    ["Câu một.", "Câu hai.", "Câu ba."],
  );
});

test("pause giữa chừng thì sự kiện của câu cũ không chuyển sang câu sau", async () => {
  const { engine, spoken } = await makeEngine();
  engine.play();
  const first = spoken.at(-1);
  engine.pause();
  first.onend();
  assert.equal(spoken.length, 1);
});

test("seek khi đang phát đọc lại đúng câu được chọn", async () => {
  const { engine, spoken } = await makeEngine();
  engine.play();
  engine.seek(2);
  assert.equal(spoken.at(-1).text, "Câu ba.");
});
