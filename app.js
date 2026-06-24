const STORAGE_KEY = "question-bank-smooth-web-v2";

const typeMeta = {
  single: { label: "单选题", point: 1 },
  multi: { label: "多选题", point: 1 },
  judge: { label: "判断题", point: 1 },
  essay: { label: "简答题", point: 0 }
};

const dom = {
  homeView: document.querySelector("#homeView"),
  examView: document.querySelector("#examView"),
  homeStats: document.querySelector("#homeStats"),
  modeGrid: document.querySelector("#modeGrid"),
  amountGrid: document.querySelector("#amountGrid"),
  typeGrid: document.querySelector("#typeGrid"),
  orderSelect: document.querySelector("#orderSelect"),
  startHint: document.querySelector("#startHint"),
  start: document.querySelector("#startBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput"),
  clearData: document.querySelector("#clearDataBtn"),
  list: document.querySelector("#questionList"),
  card: document.querySelector("#answerCard"),
  empty: document.querySelector("#emptyState"),
  search: document.querySelector("#searchInput"),
  showWrong: document.querySelector("#showWrongBtn"),
  showAll: document.querySelector("#showAllBtn"),
  save: document.querySelector("#saveBtn"),
  submit: document.querySelector("#submitBtn"),
  home: document.querySelector("#homeBtn"),
  timer: document.querySelector("#timerText"),
  totalScore: document.querySelector("#totalScore"),
  floatTop: document.querySelector("#floatTopBtn"),
  report: document.querySelector("#reportDialog"),
  closeReport: document.querySelector("#closeReportBtn"),
  reportStats: document.querySelector("#reportStats"),
  reportBody: document.querySelector("#reportBody"),
  reviewWrong: document.querySelector("#reviewWrongBtn"),
  reportHome: document.querySelector("#reportHomeBtn"),
  toast: document.querySelector("#toast")
};

let questions = [];
let records = createRecords();
let setup = {
  mode: "all",
  amount: "10",
  types: ["single", "multi", "judge", "essay"],
  order: "fixed"
};
let session = createSession();
let toastTimer;
let timerId;

init();

async function init() {
  try {
    const response = await fetch("./question-bank.json", { cache: "no-store" });
    if (!response.ok) throw new Error("题库加载失败");
    const data = await response.json();
    questions = flattenQuestions(data);
    const saved = readState();
    records = { ...createRecords(), ...(saved.records || {}) };
    setup = { ...setup, ...(saved.setup || {}) };
    bindEvents();
    hydrateSetup();
    renderHome();
    showToast(`题库已加载：${questions.length} 题`);
  } catch (error) {
    dom.homeStats.innerHTML = `<div class="stat-tile"><strong>失败</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}

function createRecords() {
  return {
    answers: {},
    revealed: {},
    results: {},
    wrongBook: {},
    attempts: {},
    correctOnce: {},
    essayDrafts: {},
    submittedAt: ""
  };
}

function createSession() {
  return {
    ids: [],
    answers: {},
    revealed: {},
    results: {},
    currentId: "",
    filter: "session",
    search: "",
    quick: false,
    quickIndex: 0,
    submitted: false,
    startedAt: 0,
    elapsed: 0
  };
}

function flattenQuestions(data) {
  const orderedTypes = ["single", "multi", "judge", "essay"];
  let number = 0;
  return orderedTypes.flatMap((type) => (data[type] || []).map((item) => ({
    ...item,
    number: ++number,
    type,
    typeLabel: typeMeta[type].label,
    point: typeMeta[type].point
  })));
}

function bindEvents() {
  dom.modeGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".mode-card");
    if (!button) return;
    setup.mode = button.dataset.mode;
    hydrateSetup();
    renderHome();
    saveState();
  });

  dom.amountGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".quick-chip");
    if (!button) return;
    setup.amount = button.dataset.amount;
    hydrateSetup();
    saveState();
  });

  dom.typeGrid.addEventListener("change", () => {
    setup.types = [...dom.typeGrid.querySelectorAll("input:checked")].map((input) => input.value);
    hydrateSetup();
    saveState();
  });

  dom.orderSelect.addEventListener("change", () => {
    setup.order = dom.orderSelect.value;
    saveState();
  });

  dom.start.addEventListener("click", startPractice);
  dom.exportBtn.addEventListener("click", exportProgress);
  dom.importInput.addEventListener("change", importProgress);
  dom.clearData.addEventListener("click", clearAllData);
  dom.home.addEventListener("click", goHome);
  dom.floatTop.addEventListener("click", scrollTop);
  dom.search.addEventListener("input", () => {
    session.search = dom.search.value.trim();
    renderQuestions();
  });
  dom.showWrong.addEventListener("click", () => setFilter("wrong"));
  dom.showAll.addEventListener("click", () => setFilter("session"));
  dom.save.addEventListener("click", () => {
    persistSessionToRecords();
    saveState();
    showToast("已保存到当前浏览器");
  });
  dom.submit.addEventListener("click", submitExam);
  dom.closeReport.addEventListener("click", () => dom.report.close());
  dom.reportHome.addEventListener("click", () => {
    dom.report.close();
    goHome();
  });
  dom.reviewWrong.addEventListener("click", () => {
    dom.report.close();
    setup.mode = "wrong";
    setup.amount = "all";
    hydrateSetup();
    startPractice();
  });

  dom.list.addEventListener("change", (event) => {
    const input = event.target;
    if (!input.matches("input[data-question-id], textarea[data-question-id]")) return;
    updateAnswer(input);
    gradeOne(input.dataset.questionId, false);
    saveState();
    renderAnswerCard();
    if (session.quick) renderQuestions();
    else updateQuestionState(input.dataset.questionId);
    handleQuickAutoAdvance(input.dataset.questionId);
  });

  dom.list.addEventListener("click", (event) => {
    const answerButton = event.target.closest("[data-action='toggle-answer']");
    const clearButton = event.target.closest("[data-action='clear-answer']");
    const wrongButton = event.target.closest("[data-action='toggle-wrong']");
    const quickPrev = event.target.closest("[data-action='quick-prev']");
    const quickNext = event.target.closest("[data-action='quick-next']");
    if (answerButton) {
      const id = answerButton.dataset.questionId;
      session.revealed[id] = !session.revealed[id];
      if (session.quick) renderQuestions();
      else updateQuestionState(id);
      saveState();
    }
    if (clearButton) clearAnswer(clearButton.dataset.questionId);
    if (wrongButton) toggleWrong(wrongButton.dataset.questionId);
    if (quickPrev) moveQuick(-1);
    if (quickNext) moveQuick(1);
  });

  dom.card.addEventListener("click", (event) => {
    const button = event.target.closest(".answer-number");
    if (!button) return;
    jumpToQuestion(button.dataset.questionId);
  });

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    session.currentId = visible.target.dataset.questionId;
    renderAnswerCard();
  }, { rootMargin: "-35% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] });
  window.questionObserver = observer;
}

function hydrateSetup() {
  dom.modeGrid.querySelectorAll(".mode-card").forEach((button) => button.classList.toggle("is-active", button.dataset.mode === setup.mode));
  dom.amountGrid.querySelectorAll(".quick-chip").forEach((button) => button.classList.toggle("is-active", button.dataset.amount === setup.amount));
  dom.typeGrid.querySelectorAll("input").forEach((input) => { input.checked = setup.types.includes(input.value); });
  dom.orderSelect.value = setup.order;
  const count = previewPool().length;
  const amountText = setup.amount === "all" ? "全部" : `${setup.amount} 题`;
  dom.startHint.textContent = `当前范围可用 ${count} 题，计划练习 ${amountText}，进入后自动正计时。`;
}

function renderHome() {
  const total = questions.length;
  const wrong = Object.keys(records.wrongBook).length;
  const attempted = Object.keys(records.attempts).length;
  const correct = Object.values(records.results).filter(Boolean).length;
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
  dom.homeStats.innerHTML = [
    [total, "题库总数"],
    [wrong, "错题本"],
    [attempted, "已练题目"],
    [`${accuracy}%`, "历史正确率"]
  ].map(([value, label]) => `<div class="stat-tile"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function startPractice() {
  const pool = buildPracticePool();
  if (!pool.length) {
    showToast(setup.mode === "wrong" ? "错题本还是空的" : "当前设置下没有可练题目");
    return;
  }
  session = createSession();
  session.ids = pool.map((item) => item.id);
  session.quick = setup.mode === "quick";
  session.quickIndex = 0;
  session.currentId = session.ids[0] || "";
  session.startedAt = Date.now();
  for (const id of session.ids) {
    if (records.answers[id]) session.answers[id] = records.answers[id];
    if (records.essayDrafts[id]) session.answers[id] = records.essayDrafts[id];
    if (records.revealed[id]) session.revealed[id] = records.revealed[id];
    if (records.results[id] !== undefined) session.results[id] = records.results[id];
  }
  dom.homeView.classList.add("is-hidden");
  dom.examView.classList.remove("is-hidden");
  dom.examView.classList.toggle("is-quick", session.quick);
  dom.floatTop.classList.toggle("is-hidden", session.quick);
  dom.search.value = "";
  startTimer();
  renderQuestions();
  renderAnswerCard();
  scrollTop();
  showToast(session.quick ? `快速模式：共 ${session.ids.length} 题` : `本次练习 ${session.ids.length} 题`);
}

function previewPool() {
  return questions.filter((item) => setup.types.includes(item.type) && modeMatch(item));
}

function buildPracticePool() {
  let pool = previewPool();
  pool = orderQuestions(pool);
  if (setup.amount !== "all") pool = pool.slice(0, Number(setup.amount));
  return pool;
}

function modeMatch(item) {
  if (setup.mode === "wrong") return Boolean(records.wrongBook[item.id]);
  if (setup.mode === "unseen") return !records.attempts[item.id];
  return true;
}

function orderQuestions(pool) {
  const list = pool.slice();
  if (setup.order === "random") return shuffle(list);
  if (setup.order === "wrongFirst") return list.sort((a, b) => Number(Boolean(records.wrongBook[b.id])) - Number(Boolean(records.wrongBook[a.id])) || a.number - b.number);
  if (setup.order === "unseenFirst") return list.sort((a, b) => Number(!records.attempts[b.id]) - Number(!records.attempts[a.id]) || a.number - b.number);
  return list.sort((a, b) => a.number - b.number);
}

function renderQuestions() {
  const items = filteredQuestions();
  dom.empty.classList.toggle("is-hidden", items.length > 0);
  dom.list.innerHTML = items.map(renderQuestion).join("");
  window.questionObserver?.disconnect();
  document.querySelectorAll(".question-card").forEach((card) => window.questionObserver?.observe(card));
  items.forEach((item) => updateQuestionState(item.id));
}

function renderQuestion(item) {
  const answer = session.answers[item.id];
  const isEssay = item.type === "essay";
  const wrongLabel = records.wrongBook[item.id] ? "移出错题" : "加入错题";
  return `
    <article class="question-card" id="question-${item.id}" data-question-id="${item.id}">
      <h2 class="question-title">${item.number}. <span>【${item.typeLabel}】</span> <span>(${item.point}分)</span></h2>
      <p class="question-text">${escapeHtml(item.question)}</p>
      ${isEssay ? renderEssay(item, answer) : `<div class="options">${renderOptions(item, answer)}</div>`}
      <div class="card-actions">
        <button class="answer-toggle" type="button" data-action="toggle-answer" data-question-id="${item.id}">${session.revealed[item.id] ? "收起答案" : "查看答案"}</button>
        <button class="clear-one" type="button" data-action="clear-answer" data-question-id="${item.id}">清空本题</button>
        <button class="clear-one ${records.wrongBook[item.id] ? "is-danger" : ""}" type="button" data-action="toggle-wrong" data-question-id="${item.id}">${wrongLabel}</button>
        ${session.quick ? renderQuickNav(item) : ""}
      </div>
      <div class="answer-box ${session.revealed[item.id] ? "is-open" : ""}" data-answer-box="${item.id}">${formatAnswer(item)}</div>
    </article>
  `;
}

function renderQuickQuestion(item) {
  const answer = session.answers[item.id];
  const index = session.ids.indexOf(item.id);
  const result = session.results[item.id];
  const resultText = result === true ? "答对了，准备进入下一题" : result === false ? "答错了" : "选出答案后会立即判断";
  const answerOpen = session.revealed[item.id] || result === false;
  return `
    <article class="quick-card" id="question-${item.id}" data-question-id="${item.id}">
      <div class="quick-meta-row">
        <span class="quick-type-pill">${item.typeLabel} · 第 ${index + 1} 题</span>
        <span class="quick-progress">${index + 1} / ${session.ids.length}</span>
      </div>
      <section class="quick-prompt">
        <p>${escapeHtml(item.question)}</p>
      </section>
      ${item.type === "essay" ? renderEssay(item, answer) : `<div class="quick-options">${renderQuickOptions(item, answer)}</div>`}
      <section class="quick-feedback ${result === true ? "is-right" : result === false ? "is-wrong" : ""}">
        <strong>${resultText}</strong>
        <div class="quick-answer ${answerOpen ? "" : "is-hidden"}">${formatAnswer(item)}</div>
      </section>
      <div class="quick-action-row">
        <button class="answer-toggle" type="button" data-action="toggle-answer" data-question-id="${item.id}">${answerOpen ? "收起答案" : "查看答案"}</button>
        <button class="clear-one" type="button" data-action="clear-answer" data-question-id="${item.id}">清空本题</button>
        <button class="quick-prev" type="button" data-action="quick-prev" data-question-id="${item.id}" ${index <= 0 ? "disabled" : ""}>上一题</button>
        <button class="quick-next" type="button" data-action="quick-next" data-question-id="${item.id}" ${index >= session.ids.length - 1 ? "disabled" : ""}>下一题</button>
      </div>
    </article>
  `;
}

function renderQuickOptions(item, answer) {
  const options = item.type === "judge" ? { Y: "正确", N: "错误" } : item.options;
  const inputType = item.type === "multi" ? "checkbox" : "radio";
  const selected = Array.isArray(answer) ? answer : answer ? [answer] : [];
  return Object.entries(options).map(([key, value]) => `
    <label class="quick-option">
      <input type="${inputType}" name="q-${item.id}" value="${key}" data-question-id="${item.id}" ${selected.includes(key) ? "checked" : ""} />
      <span class="quick-letter">${key}</span>
      <span class="quick-option-text">${escapeHtml(value)}</span>
    </label>
  `).join("");
}
function renderQuickNav(item) {
  const index = session.ids.indexOf(item.id);
  return `
    <div class="quick-nav">
      <span class="quick-status">${index + 1} / ${session.ids.length}</span>
      <button class="quick-prev" type="button" data-action="quick-prev" data-question-id="${item.id}" ${index <= 0 ? "disabled" : ""}>上一题</button>
      <button class="quick-next" type="button" data-action="quick-next" data-question-id="${item.id}" ${index >= session.ids.length - 1 ? "disabled" : ""}>下一题</button>
    </div>
  `;
}
function renderOptions(item, answer) {
  const options = item.type === "judge" ? { Y: "正确", N: "错误" } : item.options;
  const inputType = item.type === "multi" ? "checkbox" : "radio";
  const selected = Array.isArray(answer) ? answer : answer ? [answer] : [];
  return Object.entries(options).map(([key, value]) => `
    <label class="option-row">
      <input type="${inputType}" name="q-${item.id}" value="${key}" data-question-id="${item.id}" ${selected.includes(key) ? "checked" : ""} />
      <span class="choice-dot" aria-hidden="true"></span>
      <span class="choice-text">${key}.${escapeHtml(value)}</span>
    </label>
  `).join("");
}

function renderEssay(item, answer) {
  return `<textarea class="essay-input" data-question-id="${item.id}" placeholder="这里可以先写自己的答案，提交后再对照参考答案。">${escapeHtml(answer || "")}</textarea>`;
}

function renderAnswerCard() {
  const active = activeQuestions();
  const groups = ["single", "multi", "judge", "essay"].map((type) => ({
    type,
    label: typeMeta[type].label,
    items: active.filter((item) => item.type === type)
  })).filter((group) => group.items.length);

  dom.totalScore.textContent = active.filter((item) => item.type !== "essay").length;
  dom.card.innerHTML = groups.map((group) => `
    <section class="answer-group">
      <h3>${group.label}</h3>
      <div class="answer-grid">
        ${group.items.map((item) => `<button class="answer-number ${answerNumberClass(item)}" type="button" data-question-id="${item.id}" aria-label="跳到第 ${item.number} 题">${item.number}</button>`).join("")}
      </div>
    </section>
  `).join("");
}

function answerNumberClass(item) {
  const classes = [];
  if (isAnswered(item.id)) classes.push("done");
  if (session.currentId === item.id) classes.push("current");
  if (session.submitted && session.results[item.id] === true) classes.push("correct");
  if (session.submitted && session.results[item.id] === false) classes.push("wrong");
  return classes.join(" ");
}

function activeQuestions() {
  return session.ids.map((id) => questions.find((item) => item.id === id)).filter(Boolean);
}

function filteredQuestions() {
  const query = session.search.toLowerCase();
  const base = activeQuestions().filter((item) => {
    if (session.filter === "wrong" && !records.wrongBook[item.id]) return false;
    if (!query) return true;
    const optionsText = item.options ? Object.values(item.options).join(" ") : "正确 错误";
    return `${item.question} ${optionsText} ${item.answer}`.toLowerCase().includes(query);
  });
  if (!session.quick) return base;
  const current = activeQuestions()[session.quickIndex];
  if (!current) return [];
  if (query && !base.some((item) => item.id === current.id)) return base.slice(0, 1);
  return [current];
}

function updateAnswer(input) {
  const id = input.dataset.questionId;
  const item = questions.find((question) => question.id === id);
  if (!item) return;
  if (input.tagName === "TEXTAREA") {
    session.answers[id] = input.value.trim();
    records.essayDrafts[id] = session.answers[id];
    return;
  }
  if (item.type === "multi") {
    session.answers[id] = [...document.querySelectorAll(`input[data-question-id="${id}"]:checked`)].map((node) => node.value).sort();
  } else {
    session.answers[id] = input.value;
  }
}

function handleQuickAutoAdvance(id) {
  if (!session.quick) return;
  const item = questions.find((question) => question.id === id);
  if (!item || item.type === "essay") return;
  if (session.results[id] !== true) return;
  if (session.quickIndex >= session.ids.length - 1) {
    showToast("本次快速练习已到最后一题");
    return;
  }
  showToast("答对了，自动进入下一题");
  setTimeout(() => moveQuick(1), 420);
}

function moveQuick(offset) {
  if (!session.quick) return;
  const nextIndex = Math.min(Math.max(session.quickIndex + offset, 0), session.ids.length - 1);
  if (nextIndex === session.quickIndex) return;
  session.quickIndex = nextIndex;
  session.currentId = session.ids[nextIndex];
  renderQuestions();
  renderAnswerCard();
  scrollTop();
}
function gradeOne(id, submitted) {
  const item = questions.find((question) => question.id === id);
  if (!item || item.type === "essay") return;
  const user = normalizedAnswer(session.answers[id]);
  const right = normalizedAnswer(item.answer);
  if (!user) {
    delete session.results[id];
    return;
  }
  const correct = user === right;
  session.results[id] = correct;
  if (submitted) applyWrongBookRule(id, correct);
}

function applyWrongBookRule(id, correct) {
  records.attempts[id] = (records.attempts[id] || 0) + 1;
  if (correct) {
    records.correctOnce[id] = (records.correctOnce[id] || 0) + 1;
    delete records.wrongBook[id];
  } else {
    records.wrongBook[id] = { addedAt: new Date().toISOString(), reason: "答错自动收录" };
    records.correctOnce[id] = 0;
  }
}

function submitExam() {
  activeQuestions().forEach((item) => {
    gradeOne(item.id, true);
    session.revealed[item.id] = true;
  });
  session.submitted = true;
  session.elapsed = elapsedSeconds();
  records.submittedAt = new Date().toISOString();
  persistSessionToRecords();
  saveState();
  renderQuestions();
  renderAnswerCard();
  renderHome();
  showReport();
}

function persistSessionToRecords() {
  for (const id of session.ids) {
    if (session.answers[id] !== undefined) records.answers[id] = session.answers[id];
    if (session.revealed[id] !== undefined) records.revealed[id] = session.revealed[id];
    if (session.results[id] !== undefined) records.results[id] = session.results[id];
  }
}

function showReport() {
  const objective = activeQuestions().filter((item) => item.type !== "essay");
  const correct = objective.filter((item) => session.results[item.id] === true).length;
  const wrong = objective.filter((item) => session.results[item.id] === false).length;
  const undone = objective.length - correct - wrong;
  const score = objective.length ? Math.round((correct / objective.length) * 100) : 0;
  const wrongItems = objective.filter((item) => session.results[item.id] === false);

  dom.reportStats.innerHTML = [
    [`${score}`, "估算分数"],
    [`${correct}/${objective.length}`, "客观题正确"],
    [wrong, "本次错题"],
    [formatTime(session.elapsed), "本次用时"]
  ].map(([value, label]) => `<div class="report-stat"><strong>${value}</strong><span>${label}</span></div>`).join("");

  dom.reportBody.innerHTML = `
    <div class="report-list">
      <div class="report-item">未做客观题：<strong>${undone}</strong> 题；简答题请自行对照参考答案。</div>
      ${wrongItems.length ? wrongItems.map((item) => `<div class="report-item"><strong>第 ${item.number} 题</strong> ${escapeHtml(item.question)}<br>正确答案：${formatPlainAnswer(item)}</div>`).join("") : `<div class="report-item"><strong>客观题没有错题</strong>，错题本已按规则移除本次答对题。</div>`}
    </div>
  `;

  if (typeof dom.report.showModal === "function") dom.report.showModal();
  else showToast(`已提交：${correct}/${objective.length}，约 ${score} 分`);
}

function updateQuestionState(id) {
  const card = document.querySelector(`#question-${CSS.escape(id)}`);
  if (!card) return;
  card.classList.toggle("is-current", session.currentId === id);
  card.classList.toggle("is-correct", session.submitted && session.results[id] === true);
  card.classList.toggle("is-wrong", session.submitted && session.results[id] === false);
  const box = card.querySelector(`[data-answer-box="${CSS.escape(id)}"]`);
  const toggle = card.querySelector(`[data-action='toggle-answer']`);
  if (box) box.classList.toggle("is-open", Boolean(session.revealed[id]));
  if (toggle) toggle.textContent = session.revealed[id] ? "收起答案" : "查看答案";
}

function clearAnswer(id) {
  delete session.answers[id];
  delete session.results[id];
  delete records.answers[id];
  delete records.results[id];
  saveState();
  renderQuestions();
  renderAnswerCard();
  showToast("本题已清空");
}

function toggleWrong(id) {
  if (records.wrongBook[id]) {
    delete records.wrongBook[id];
    showToast("已移出错题本");
  } else {
    records.wrongBook[id] = { addedAt: new Date().toISOString(), reason: "手动加入" };
    showToast("已加入错题本");
  }
  saveState();
  renderQuestions();
  renderAnswerCard();
  renderHome();
}

function jumpToQuestion(id) {
  if (session.quick) {
    const index = session.ids.indexOf(id);
    if (index < 0) return;
    session.quickIndex = index;
    session.currentId = id;
    renderQuestions();
    renderAnswerCard();
    scrollTop();
    return;
  }

  const existing = document.querySelector(`#question-${CSS.escape(id)}`);
  if (!existing && session.filter === "wrong") setFilter("session");
  requestAnimationFrame(() => {
    const card = document.querySelector(`#question-${CSS.escape(id)}`);
    if (!card) return;
    session.currentId = id;
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    renderAnswerCard();
  });
}

function setFilter(filter, rerender = true) {
  session.filter = filter;
  dom.showWrong.classList.toggle("is-active", filter === "wrong");
  dom.showAll.classList.toggle("is-active", filter === "session");
  if (rerender) renderQuestions();
}

function exportProgress() {
  saveState();
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), records, setup }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `复习01-题库进度-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("进度已导出");
}

function importProgress(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || "{}"));
      records = { ...createRecords(), ...(data.records || data) };
      if (data.setup) setup = { ...setup, ...data.setup };
      hydrateSetup();
      renderHome();
      saveState();
      showToast("进度已导入");
    } catch {
      showToast("导入失败：JSON 格式不对");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function clearAllData() {
  const ok = confirm("确定清空所有答题记录、错题本和草稿吗？");
  if (!ok) return;
  records = createRecords();
  session = createSession();
  localStorage.removeItem(STORAGE_KEY);
  hydrateSetup();
  renderHome();
  showToast("记录已清空");
}

function goHome() {
  persistSessionToRecords();
  saveState();
  stopTimer();
  dom.examView.classList.add("is-hidden");
  dom.examView.classList.remove("is-quick");
  dom.homeView.classList.remove("is-hidden");
  dom.floatTop.classList.add("is-hidden");
  renderHome();
  scrollTop();
}

function startTimer() {
  stopTimer();
  updateTimer();
  timerId = setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function updateTimer() {
  dom.timer.textContent = `用时 ${formatTime(elapsedSeconds())}`;
}

function elapsedSeconds() {
  return session.startedAt ? Math.floor((Date.now() - session.startedAt) / 1000) : session.elapsed;
}

function isAnswered(id) {
  const answer = session.answers[id];
  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
}

function normalizedAnswer(answer) {
  if (Array.isArray(answer)) return answer.slice().sort().join("");
  return String(answer || "").split("").sort().join("");
}

function formatAnswer(item) {
  if (item.type === "essay") return `<strong>参考答案：</strong><br>${escapeHtml(item.answer).replace(/\n/g, "<br>")}`;
  return `<strong>正确答案：</strong>${escapeHtml(formatPlainAnswer(item))}`;
}

function formatPlainAnswer(item) {
  const options = item.type === "judge" ? { Y: "正确", N: "错误" } : item.options;
  return normalizedAnswer(item.answer).split("").map((key) => `${key}.${options[key] || ""}`).join("；");
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ records, setup }));
}

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("is-open");
  toastTimer = setTimeout(() => dom.toast.classList.remove("is-open"), 2200);
}

function shuffle(list) {
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}








