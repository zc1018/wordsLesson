const state = {
  screen: "home",
  selectedLeft: null,
  choiceDone: false,
  matchedPairs: new Set(),
  assessment: {
    quickIndex: 0,
    calibrationIndex: 0,
    quickResponses: [],
    calibrationResponses: [],
    itemStartedAt: 0,
  },
};

const correctPairs = {
  "Greek ēkhō": "回声；回响",
  "Latin echo": "回声",
  "English echo": "回声；回应；附和",
};

const quickItems = [
  { word: "claim", band: "1K 高频", type: "真实词", isPseudo: false },
  { word: "echo", band: "2K 核心", type: "真实词", isPseudo: false },
  { word: "subtle", band: "3K 进阶", type: "真实词", isPseudo: false },
  { word: "migrate", band: "4K 拓展", type: "真实词", isPseudo: false },
  { word: "resonance", band: "5K 学术", type: "真实词", isPseudo: false },
  { word: "glinter", band: "校准项", type: "校准题", isPseudo: true },
];

const calibrationItems = [
  {
    word: "claim",
    band: "1K 高频",
    context: "She made a claim about the result.",
    correct: "主张；声称",
    options: ["主张；声称", "清理；擦除", "拖延；推迟", "聚集；集合"],
    quickWord: "claim",
  },
  {
    word: "echo",
    band: "2K 核心",
    context: "His words echoed through the hall.",
    correct: "回响；回声",
    options: ["回响；回声", "借口；托辞", "削弱；减少", "点燃；燃烧"],
    quickWord: "echo",
  },
  {
    word: "subtle",
    band: "3K 进阶",
    context: "There is a subtle difference between the two ideas.",
    correct: "微妙的；不易察觉的",
    options: ["突然的；猛烈的", "微妙的；不易察觉的", "正式的；官方的", "空白的；无内容的"],
    quickWord: "subtle",
  },
  {
    word: "resonance",
    band: "5K 学术",
    context: "The speech had strong emotional resonance.",
    correct: "共鸣；回响",
    options: ["共鸣；回响", "抵抗；反对", "证据；证明", "分裂；破裂"],
    quickWord: "resonance",
  },
];

const screens = [...document.querySelectorAll(".screen")];
const toast = document.querySelector("[data-toast]");
const wordScreen = document.querySelector('[data-screen="word"]');
const storyAutoplayStart = 9;
let swipeStartX = 0;
let swipeStartY = 0;

function showScreen(name, options = {}) {
  const previous = document.querySelector(".screen-active");
  const next = screens.find((screen) => screen.dataset.screen === name);
  if (!next || previous === next) return;

  state.screen = name;

  if (options.transition === "flip" && previous) {
    next.classList.add("screen-active", "screen-flip-layer", "screen-flip-in");
    next.scrollTop = 0;
    previous.classList.add("screen-flip-layer", "screen-flip-out");

    window.setTimeout(() => {
      previous.classList.remove("screen-active", "screen-flip-layer", "screen-flip-out");
      next.classList.remove("screen-flip-layer", "screen-flip-in");
    }, 500);
  } else {
    screens.forEach((screen) => {
      screen.classList.toggle("screen-active", screen.dataset.screen === name);
      if (screen.dataset.screen === name) {
        screen.scrollTop = 0;
      }
    });
  }

  if (name === "etymology") {
    window.setTimeout(() => playStoryVideo(options.transition === "flip"), 120);
  } else {
    pauseStoryVideo();
  }
}

function playStoryVideo(fromFlip = false) {
  const video = document.querySelector("[data-story-video]");
  if (!video) return;
  if (fromFlip) {
    video.currentTime = storyAutoplayStart;
  }
  setAutoplayBadge("自动播放中", false);
  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt
      .then(() => {
        setAutoplayBadge("自动播放中", false);
      })
      .catch(() => {
        video.muted = true;
        video
          .play()
          .then(() => setAutoplayBadge("自动播放中", false))
          .catch(() => setAutoplayBadge("点击播放", true));
      });
  }
}

function pauseStoryVideo() {
  const video = document.querySelector("[data-story-video]");
  if (video && !video.paused) video.pause();
}

function setAutoplayBadge(text, isPaused) {
  const badge = document.querySelector("[data-autoplay-badge]");
  if (!badge) return;
  badge.classList.toggle("is-paused", isPaused);
  badge.innerHTML = `<span>${isPaused ? "▶" : "♬"}</span>${text}`;
}

function flipToEtymology() {
  showScreen("etymology", { transition: "flip" });
}

function resetAssessment() {
  state.assessment.quickIndex = 0;
  state.assessment.calibrationIndex = 0;
  state.assessment.quickResponses = [];
  state.assessment.calibrationResponses = [];
  state.assessment.itemStartedAt = 0;
}

function beginAssessment() {
  resetAssessment();
  showScreen("assessment-quick");
  renderQuickItem();
}

function renderQuickItem() {
  const item = quickItems[state.assessment.quickIndex];
  if (!item) {
    state.assessment.calibrationIndex = 0;
    showScreen("assessment-calibration");
    renderCalibrationItem();
    return;
  }

  const progress = ((state.assessment.quickIndex + 1) / quickItems.length) * 100;
  document.querySelector("[data-quick-progress]").textContent =
    `第 ${state.assessment.quickIndex + 1} / ${quickItems.length} 题`;
  document.querySelector("[data-quick-fill]").style.width = `${progress}%`;
  document.querySelector("[data-quick-word]").textContent = item.word;
  document.querySelector("[data-quick-band]").textContent = item.band;
  document.querySelector("[data-quick-type]").textContent = item.type;
  document.querySelector("[data-quick-prompt]").textContent = item.isPseudo
    ? "这一题用于校准过度自信，请按真实第一反应选择。"
    : "4 秒内选择你的第一反应。";
  state.assessment.itemStartedAt = performance.now();
}

function handleRecognition(value) {
  const item = quickItems[state.assessment.quickIndex];
  if (!item) return;

  state.assessment.quickResponses.push({
    ...item,
    response: value,
    responseTimeMs: Math.round(performance.now() - state.assessment.itemStartedAt),
  });
  state.assessment.quickIndex += 1;
  renderQuickItem();
}

function renderCalibrationItem() {
  const item = calibrationItems[state.assessment.calibrationIndex];
  if (!item) {
    buildAssessmentReport();
    showScreen("assessment-report");
    return;
  }

  const progress = ((state.assessment.calibrationIndex + 1) / calibrationItems.length) * 100;
  document.querySelector("[data-calibration-progress]").textContent =
    `第 ${state.assessment.calibrationIndex + 1} / ${calibrationItems.length} 题`;
  document.querySelector("[data-calibration-fill]").style.width = `${progress}%`;
  document.querySelector("[data-calibration-word]").textContent = item.word;
  document.querySelector("[data-calibration-band]").textContent = item.band;
  document.querySelector("[data-calibration-context]").textContent = item.context;

  const options = document.querySelector("[data-calibration-options]");
  options.innerHTML = item.options
    .map((option, index) => {
      const label = String.fromCharCode(65 + index);
      return `<button class="choice calibration-choice" data-calibration-choice="${option}">${label}. ${option}</button>`;
    })
    .join("");
  state.assessment.itemStartedAt = performance.now();
}

function handleCalibrationChoice(button) {
  const item = calibrationItems[state.assessment.calibrationIndex];
  if (!item || button.disabled) return;

  const response = button.dataset.calibrationChoice;
  const isCorrect = response === item.correct;
  button.classList.add(isCorrect ? "correct" : "wrong");
  document.querySelectorAll("[data-calibration-choice]").forEach((choice) => {
    choice.disabled = true;
    if (choice.dataset.calibrationChoice === item.correct) {
      choice.classList.add("correct");
    }
  });

  state.assessment.calibrationResponses.push({
    ...item,
    response,
    isCorrect,
    responseTimeMs: Math.round(performance.now() - state.assessment.itemStartedAt),
  });

  window.setTimeout(() => {
    state.assessment.calibrationIndex += 1;
    renderCalibrationItem();
  }, 520);
}

function getQuickResponse(word) {
  return state.assessment.quickResponses.find((item) => item.word === word);
}

function buildAssessmentReport() {
  const quick = state.assessment.quickResponses;
  const calibrated = state.assessment.calibrationResponses;
  const falseAlarms = quick.filter((item) => item.isPseudo && item.response === "yes").length;
  const pseudoCount = quick.filter((item) => item.isPseudo).length || 1;
  const falseAlarmRate = falseAlarms / pseudoCount;
  const correctRate = calibrated.filter((item) => item.isCorrect).length / calibrated.length;
  const virtualFamiliar = calibrated.filter((item) => {
    const quickResponse = getQuickResponse(item.quickWord);
    return quickResponse?.response === "yes" && !item.isCorrect;
  }).length;
  const unsureCorrect = calibrated.filter((item) => {
    const quickResponse = getQuickResponse(item.quickWord);
    return quickResponse?.response === "unsure" && item.isCorrect;
  }).length;

  const bandRates = [
    { band: "1K", rate: clampRate(0.86 + correctRate * 0.08 - falseAlarmRate * 0.08) },
    { band: "2K", rate: clampRate(0.74 + correctRate * 0.12 - falseAlarmRate * 0.08) },
    { band: "3K", rate: clampRate(0.56 + correctRate * 0.16 - virtualFamiliar * 0.04) },
    { band: "4K", rate: clampRate(0.43 + correctRate * 0.14 - falseAlarmRate * 0.06) },
    { band: "5K", rate: clampRate(0.31 + correctRate * 0.16 - virtualFamiliar * 0.05) },
  ];
  const knownCount = Math.round(bandRates.reduce((sum, item) => sum + item.rate * 1000, 0) / 50) * 50;
  const familiar = Math.round(knownCount * 0.42);
  const halfKnown = Math.round(knownCount * 0.36);
  const weak = Math.max(0, 5000 - familiar - halfKnown - virtualFamiliar * 120);
  const unknown = Math.max(260, Math.round(weak * 0.42));
  const unfamiliar = Math.max(500, weak - unknown);
  const falseKnownCount = Math.max(80, virtualFamiliar * 150 + Math.round(falseAlarmRate * 220));

  document.querySelector("[data-known-count]").textContent = `约 ${knownCount}`;
  document.querySelector("[data-false-alarm]").textContent =
    `校准偏差 ${Math.round(falseAlarmRate * 100)}%`;
  document.querySelector("[data-report-summary]").textContent =
    virtualFamiliar > 0
      ? "你有自认为认识但含义不稳的词，Day 1 会先做纠偏，再进入完整讲解和早期复习。"
      : unsureCorrect > 0
        ? "你有一批眼熟但不敢确认的词，Day 1 会用轻练习把半熟词转成稳定掌握。"
        : "你的高频词底盘较稳，Day 1 会减少熟悉词讲解，把时间留给 3K 以后断裂层。";

  document.querySelector("[data-band-chart]").innerHTML = bandRates
    .map(
      (item) => `
        <div class="band-row">
          <strong>${item.band}</strong>
          <div class="band-bar"><span style="width: ${Math.round(item.rate * 100)}%"></span></div>
          <span>${Math.round(item.rate * 100)}%</span>
        </div>
      `,
    )
    .join("");

  const distribution = [
    { label: "熟悉", count: familiar, note: "轻触达" },
    { label: "半熟", count: halfKnown, note: "正常学习" },
    { label: "生疏", count: unfamiliar, note: "完整学习" },
    { label: "未知", count: unknown, note: "重点复习" },
    { label: "虚熟", count: falseKnownCount, note: "优先纠偏" },
  ];
  document.querySelector("[data-familiarity-grid]").innerHTML = distribution
    .map(
      (item) => `
        <div class="familiarity-item">
          <strong>${item.count}</strong>
          <span>${item.label} · ${item.note}</span>
        </div>
      `,
    )
    .join("");

  const rows = buildFamiliarityRows();
  document.querySelector("[data-tag-table]").innerHTML = rows
    .map(
      (row) => `
        <div class="tag-row">
          <strong>${row.word}</strong>
          <span>${row.label}</span>
          <em>${row.evidence} · ${row.confidence} · ${row.action}</em>
        </div>
      `,
    )
    .join("");

  const echoRow = rows.find((row) => row.word === "echo");
  const learningPathNote = document.querySelector("[data-learning-path-note]");
  if (echoRow && learningPathNote) {
    learningPathNote.textContent = `echo 标记为${echoRow.label}词：${echoRow.action}。`;
  }
}

function buildFamiliarityRows() {
  return calibrationItems.slice(0, 4).map((item) => {
    const quickResponse = getQuickResponse(item.quickWord);
    const calibration = state.assessment.calibrationResponses.find((response) => response.word === item.word);
    if (quickResponse?.response === "yes" && calibration && !calibration.isCorrect) {
      return {
        word: item.word,
        label: "虚熟",
        evidence: "direct_calibrated",
        confidence: "high",
        action: "重点纠偏",
      };
    }
    if (calibration?.isCorrect && quickResponse?.response === "yes") {
      return {
        word: item.word,
        label: calibration.responseTimeMs < 2200 ? "熟悉" : "半熟",
        evidence: "direct_calibrated",
        confidence: "high",
        action: calibration.responseTimeMs < 2200 ? "轻触达" : "正常学习",
      };
    }
    if (calibration?.isCorrect) {
      return {
        word: item.word,
        label: "半熟",
        evidence: "direct_calibrated",
        confidence: "high",
        action: "正常学习",
      };
    }
    return {
      word: item.word,
      label: "生疏",
      evidence: quickResponse ? "direct_yesno" : "inferred",
      confidence: quickResponse ? "medium" : "low",
      action: "完整学习",
    };
  });
}

function clampRate(value) {
  return Math.min(0.96, Math.max(0.18, value));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1700);
}

function resetPractice() {
  state.selectedLeft = null;
  state.choiceDone = false;
  state.matchedPairs.clear();
  document.querySelectorAll(".choice").forEach((choice) => {
    choice.classList.remove("correct", "wrong");
    choice.disabled = false;
  });
  document.querySelectorAll(".match-card").forEach((card) => {
    card.classList.remove("selected", "matched");
    card.disabled = false;
  });
  renderMatchingLines();
  document.querySelector("[data-feedback]").hidden = true;
}

function renderMatchingLines() {
  const board = document.querySelector(".match-board");
  const svg = document.querySelector("[data-match-lines]");
  if (!board || !svg) return;

  const boardRect = board.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
  svg.innerHTML = "";

  state.matchedPairs.forEach((leftValue) => {
    const rightValue = correctPairs[leftValue];
    const leftCard = document.querySelector(`[data-left="${CSS.escape(leftValue)}"]`);
    const rightCard = document.querySelector(`[data-right="${CSS.escape(rightValue)}"]`);
    if (!leftCard || !rightCard) return;

    const leftRect = leftCard.getBoundingClientRect();
    const rightRect = rightCard.getBoundingClientRect();
    const x1 = leftRect.right - boardRect.left - 2;
    const y1 = leftRect.top - boardRect.top + leftRect.height / 2;
    const x2 = rightRect.left - boardRect.left + 2;
    const y2 = rightRect.top - boardRect.top + rightRect.height / 2;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "#16a34a");
    line.setAttribute("stroke-width", "4");
    line.setAttribute("stroke-linecap", "round");
    svg.appendChild(line);

    [x1, x2].forEach((x, index) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", index === 0 ? y1 : y2);
      circle.setAttribute("r", "5");
      circle.setAttribute("fill", "#16a34a");
      circle.setAttribute("stroke", "#ffffff");
      circle.setAttribute("stroke-width", "2");
      svg.appendChild(circle);
    });
  });
}

function maybeCompletePractice() {
  const allMatched = state.matchedPairs.size === Object.keys(correctPairs).length;
  if (state.choiceDone && allMatched) {
    document.querySelector("[data-feedback]").hidden = false;
  }
}

function handleChoice(button) {
  if (state.choiceDone) return;

  const isCorrect = button.dataset.choice === "0";
  if (isCorrect) {
    button.classList.add("correct");
    state.choiceDone = true;
    document.querySelectorAll(".choice").forEach((choice) => {
      choice.disabled = true;
    });
    showToast("答对了：echo 表示回声、回响");
    maybeCompletePractice();
  } else {
    button.classList.add("wrong");
    showToast("再想想，它来自“回声”的词源");
  }
}

function handleMatch(button) {
  if (button.classList.contains("matched")) return;

  const left = button.dataset.left;
  const right = button.dataset.right;

  if (left) {
    state.selectedLeft = left;
    document.querySelectorAll("[data-left]").forEach((card) => {
      card.classList.toggle("selected", card.dataset.left === left);
    });
    return;
  }

  if (!state.selectedLeft || !right) {
    showToast("先选择左侧词源");
    return;
  }

  const expected = correctPairs[state.selectedLeft];
  if (expected === right) {
    state.matchedPairs.add(state.selectedLeft);
    const leftCard = document.querySelector(`[data-left="${CSS.escape(state.selectedLeft)}"]`);
    leftCard.classList.remove("selected");
    leftCard.classList.add("matched");
    leftCard.disabled = true;
    button.classList.add("matched");
    button.disabled = true;
    state.selectedLeft = null;
    renderMatchingLines();
    showToast("匹配正确");
    maybeCompletePractice();
  } else {
    showToast("这组含义还没有连上");
  }
}

window.addEventListener("resize", renderMatchingLines);

if (wordScreen) {
  wordScreen.addEventListener("pointerdown", (event) => {
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
  });

  wordScreen.addEventListener("pointerup", (event) => {
    const deltaX = event.clientX - swipeStartX;
    const deltaY = event.clientY - swipeStartY;
    const isHorizontalSwipe = Math.abs(deltaX) > 52 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35;

    swipeStartX = 0;
    swipeStartY = 0;

    if (state.screen === "word" && isHorizontalSwipe && deltaX < 0) {
      flipToEtymology();
    }
  });
}

document.addEventListener("click", (event) => {
  const flip = event.target.closest("[data-flip]");
  if (flip) {
    flipToEtymology();
    return;
  }

  const nav = event.target.closest("[data-nav]");
  if (nav) {
    const target = nav.dataset.nav;
    if (target === "practice") {
      resetPractice();
    }
    showScreen(target);
    return;
  }

  const action = event.target.closest("[data-action]");
  if (action) {
    const type = action.dataset.action;
    if (type === "start-assessment") {
      resetAssessment();
      showScreen("assessment-intro");
    }
    if (type === "begin-assessment") beginAssessment();
    if (type === "pronounce") showToast("echo /'ekəu/");
    if (type === "bookmark") showToast("已收藏 echo");
    if (type === "empty-teacher") showToast("老师讲解视频待接入");
    if (type === "empty-story") showToast("词源故事视频待接入");
    if (type === "restart") {
      resetPractice();
      showScreen("home");
    }
    return;
  }

  const recognition = event.target.closest("[data-recognition]");
  if (recognition) {
    handleRecognition(recognition.dataset.recognition);
    return;
  }

  const calibrationChoice = event.target.closest("[data-calibration-choice]");
  if (calibrationChoice) {
    handleCalibrationChoice(calibrationChoice);
    return;
  }

  const choice = event.target.closest(".choice");
  if (choice) {
    handleChoice(choice);
    return;
  }

  const match = event.target.closest(".match-card");
  if (match) {
    handleMatch(match);
  }
});

showScreen("home");
