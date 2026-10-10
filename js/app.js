var db = openSave();
var state = {
  view: "home",
  round: null,
  caseSide: "pro",
  selectedId: null,
  evidenceOpen: false,
  saveState: "Saved in this browser",
  saveTimer: null,
  typingTimer: null,
  history: { past: [], future: [], typing: false },
  heights: {},
  popover: null,
  findText: "",
  findHits: [],
  findAt: -1,
  tourStep: -1,
  demo: false,
  navOpen: false,
  query: "",
  composing: false
};
var confirmRun = null;
var JUMP_COLORS = ["#8e79ef", "#4ab88a", "#f8b432"];
var CONTENTION_COLORS = [
  { head: "#efebff", ink: "#654ab9", accent: "#8e79ef" },
  { head: "#eaf8f0", ink: "#205d49", accent: "#4ab88a" },
  { head: "#fff7e1", ink: "#121326", accent: "#f8b432" }
];
var TOUR = [
  { target: "[data-tour='cases']", text: "Switch cases here. Each case starts at its own opening speech; the visible columns change." },
  { target: "[data-tour='add']", text: "Add a named section for a major reason. Type individual points inside it." },
  { target: "[data-tour='point']", text: "Enter makes the next point box. Shift+Enter adds a line inside the same box." },
  { target: ".reply-box, .point", text: "Responses align with the point they answer. Longer notes make room automatically." },
  { target: "[data-tour='clip-btn']", text: "Attach evidence to any selected note, including a response or summary point." },
  { target: "[data-tour='proof-panel']", text: "Paste formatted Docs or Word text here. Your flow stays visible. Click a note to find its evidence, or scroll to browse." },
  { target: "[data-field='columns-count']", text: "Choose how many columns to focus on and where to start. Show all restores this case’s full sequence." },
  { target: "[data-tour='notes']", text: "Record crossfire questions and answers here." },
  { target: "[data-tour='timer']", text: "Time speeches and each team’s prep. Only one countdown runs at once." },
  { target: "[data-tour='save']", text: "Notes save in this browser. Export downloads a record; version 1 does not import rounds." }
];

function sideName(side) {
  if (side === "con") return "Con";
  if (side === "pro") return "Pro";
  if (side === "observer") return "Observer";
  return "";
}

function clock(ms) {
  var total = Math.max(0, Math.ceil(ms / 1000));
  var minutes = Math.floor(total / 60);
  var seconds = total % 60;
  return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

function activeCase() {
  return state.round && state.round.isPreflow ? state.round.preflowSide : state.caseSide;
}

function textSize() {
  return (db.settings.fontSize || 14) + "px";
}

function markerLabel(id) {
  var i;
  for (i = 0; i < MARKERS.length; i++) if (MARKERS[i].id === id) return MARKERS[i].label;
  return "";
}

function resetHistory() {
  state.history = { past: [], future: [], typing: false };
  state.heights = {};
}

// Undo covers the flow: contentions, cards, and evidence. Crossfire notes and the
// speech clock stay put — undoing a rebuttal card should not rewind prep.
function copyFlow() {
  return JSON.stringify({
    cases: state.round.cases,
    contentions: state.round.contentions,
    notes: state.round.notes,
    evidence: state.round.evidence
  });
}

function putFlowBack(json) {
  var data;
  try {
    data = JSON.parse(json);
  } catch (error) {
    return false;
  }
  if (!data || !data.cases || !data.contentions || !data.notes) return false;
  state.round.cases = data.cases;
  state.round.contentions = data.contentions;
  state.round.notes = data.notes;
  state.round.evidence = data.evidence || {};
  return true;
}

function rememberStep() {
  state.history.past.push(copyFlow());
  if (state.history.past.length > 100) state.history.past.shift();
  state.history.future = [];
  showUndoButtons();
}

function showUndoButtons() {
  var undoBtn = document.querySelector("[data-action='undo']");
  var redoBtn = document.querySelector("[data-action='redo']");
  if (undoBtn) undoBtn.disabled = !state.history.past.length;
  if (redoBtn) redoBtn.disabled = !state.history.future.length;
}

function beginTyping() {
  if (!state.history.typing) {
    rememberStep();
    state.history.typing = true;
  }
  clearTimeout(state.typingTimer);
  state.typingTimer = setTimeout(function () { state.history.typing = false; }, 1000);
}

function rememberBeforeChange() {
  if (state.history.typing) {
    rememberStep();
    state.history.typing = false;
  } else rememberStep();
}

function undo() {
  var current;
  var prior;
  if (!state.history.past.length || !state.round) return;
  current = copyFlow();
  prior = state.history.past.pop();
  if (!putFlowBack(prior)) return;
  state.history.future.push(current);
  state.history.typing = false;
  state.selectedId = state.round.notes[state.selectedId] ? state.selectedId : null;
  saveSoon(true);
  render();
}

function redo() {
  var current;
  var next;
  if (!state.history.future.length || !state.round) return;
  current = copyFlow();
  next = state.history.future.pop();
  if (!putFlowBack(next)) return;
  state.history.past.push(current);
  state.selectedId = state.round.notes[state.selectedId] ? state.selectedId : null;
  saveSoon(true);
  render();
}

function updateSaveLabel() {
  var node = document.getElementById("save-text");
  if (node) node.textContent = state.demo ? "Tour only — not saved" : state.saveState;
}

function saveThisRound() {
  if (!state.round || state.demo) return;
  if (state.round.isPreflow) {
    var pre = db.preflows[state.round.id];
    if (pre) {
      pre.title = state.round.title;
      pre.topic = state.round.topic;
      pre.side = state.round.preflowSide;
      pre.contentions = state.round.contentions;
      pre.notes = state.round.notes;
      pre.evidence = state.round.evidence;
      pre.contentionIds = state.round.cases[state.round.preflowSide].contentionIds.slice();
      pre.updatedAt = new Date().toISOString();
    }
  } else if (db.rounds[state.round.id]) {
    state.round.updatedAt = new Date().toISOString();
    db.rounds[state.round.id] = state.round;
    db.lastRoundId = state.round.id;
  }
  var error = writeSave(db);
  state.saveState = error || "Saved in this browser";
  updateSaveLabel();
}

function saveSoon(now) {
  if (state.demo) {
    state.saveState = "Tour only — not saved";
    updateSaveLabel();
    sessionStorage.setItem("tourRound", JSON.stringify(state.round));
    return;
  }
  state.saveState = "Saving…";
  updateSaveLabel();
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(function () { saveThisRound(); }, now ? 0 : 400);
}

function saveNow() {
  clearTimeout(state.saveTimer);
  if (state.demo && state.round) sessionStorage.setItem("tourRound", JSON.stringify(state.round));
  else saveThisRound();
}

function saveTypedWords() {
  if (!state.round) return;
  var areas = document.querySelectorAll("textarea.point-input");
  var boxes = document.querySelectorAll("textarea.note-box");
  var i;
  var note;
  for (i = 0; i < areas.length; i++) {
    note = state.round.notes[areas[i].dataset.id];
    if (note) note.text = areas[i].value;
  }
  for (i = 0; i < boxes.length; i++) {
    if (state.round.crossNotes) state.round.crossNotes[boxes[i].dataset.cross] = boxes[i].value;
  }
}

function rememberRound() {
  if (!state.round) return;
  sessionStorage.setItem("caseSide", state.caseSide);
  if (state.demo) {
    sessionStorage.setItem("tourDemo", "1");
    sessionStorage.setItem("tourRound", JSON.stringify(state.round));
    sessionStorage.setItem("tourStep", String(state.tourStep));
    return;
  }
  sessionStorage.removeItem("tourDemo");
  if (state.round.isPreflow) {
    sessionStorage.setItem("openPreflowId", state.round.id);
    sessionStorage.removeItem("openRoundId");
  } else {
    sessionStorage.setItem("openRoundId", state.round.id);
    sessionStorage.removeItem("openPreflowId");
  }
}

function go(url) {
  dropMenu();
  saveTypedWords();
  saveNow();
  rememberRound();
  window.location.href = url;
}

function loadOpenRound() {
  if (sessionStorage.getItem("tourDemo") === "1") {
    state.demo = true;
    state.round = JSON.parse(sessionStorage.getItem("tourRound"));
    state.caseSide = sessionStorage.getItem("caseSide") || "pro";
    state.tourStep = Number(sessionStorage.getItem("tourStep") || 0);
    return true;
  }
  var preId = sessionStorage.getItem("openPreflowId");
  if (preId && db.preflows[preId]) {
    state.round = openingAsRound(db.preflows[preId]);
    state.caseSide = state.round.preflowSide;
    return true;
  }
  var id = sessionStorage.getItem("openRoundId");
  if (id && db.rounds[id]) {
    state.round = db.rounds[id];
    state.caseSide = sessionStorage.getItem("caseSide") === "con" ? "con" : "pro";
    return true;
  }
  window.location.href = "index.html";
  return false;
}

function openRound(id) {
  sessionStorage.setItem("openRoundId", id);
  sessionStorage.removeItem("openPreflowId");
  sessionStorage.setItem("caseSide", "pro");
  sessionStorage.removeItem("tourDemo");
  window.location.href = "workspace.html";
}

function openOpening(id) {
  sessionStorage.setItem("openPreflowId", id);
  sessionStorage.removeItem("openRoundId");
  sessionStorage.removeItem("tourDemo");
  window.location.href = "workspace.html";
}

function updateSideMenu() {
  var shell = document.querySelector(".workspace");
  var side = document.querySelector(".sidebar");
  if (shell) shell.classList.toggle("menu-open", state.navOpen);
  if (side) side.classList.toggle("open", state.navOpen);
}

function closePopups() {
  var boxes = document.querySelectorAll(".popup-cover");
  var i;
  for (i = 0; i < boxes.length; i++) foldAway(boxes[i]);
  confirmRun = null;
}

function askConfirm(title, text, okLabel, run) {
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-text").textContent = text;
  document.getElementById("confirm-ok").textContent = okLabel || "OK";
  confirmRun = run;
  unhide(document.getElementById("confirm-box"));
}

function timerStepNow() {
  var plan = timerSteps(state.round.firstSide, db.settings.durations);
  var index = state.round.timers.index || 0;
  if (index >= plan.length) index = plan.length - 1;
  return { plan: plan, item: plan[index], index: index };
}

function timerLabel() {
  var timers = state.round.timers;
  if (!timers) return "Timer";
  if (timers.running && timers.mode === "prep") return sideName(timers.prepSide) + " prep " + clock(timers.deadline - Date.now());
  if (timers.running && timers.mode === "speech") return timerStepNow().item.label + " " + clock(timers.deadline - Date.now());
  if (timers.timeUp && timers.remainingMs === 0 && timers.mode === null) return "Time";
  return timerStepNow().item.label + " " + clock(timers.remainingMs);
}

function updateTimerButton() {
  var chip = document.getElementById("timer-btn");
  if (chip && state.round && !state.round.isPreflow) chip.textContent = timerLabel();
  var clockNode = document.getElementById("popover-clock");
  if (clockNode && state.round && state.round.timers && !document.getElementById("timer-popover").classList.contains("hide")) {
    var timers = state.round.timers;
    clockNode.textContent = timers.running && timers.mode === "speech" ? clock(timers.deadline - Date.now()) : (timers.timeUp ? "Time" : clock(timers.remainingMs));
  }
}

function beep() {
  if (!db.settings.sound) return;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (error) {
    return;
  }
}

function kickClock(mode, side) {
  var timers = state.round && state.round.timers;
  var left;
  var amount;
  if (!timers) return;
  // Prep belongs to a team. Observer flows the round and does not have a prep pot.
  if (mode === "prep" && side !== "pro" && side !== "con") return;
  if (timers.running) {
    left = timers.deadline - Date.now();
    if (!isFinite(left) || left < 0) left = 0;
    if (timers.mode === "prep" && (timers.prepSide === "pro" || timers.prepSide === "con")) timers.prepLeft[timers.prepSide] = left;
    else if (timers.mode === "speech") timers.remainingMs = left;
    timers.running = false;
    timers.deadline = null;
    timers.mode = null;
  }
  if (mode === "prep") {
    if (!timers.prepLeft || timers.prepLeft[side] == null) return;
    amount = timers.prepLeft[side];
  } else {
    mode = "speech";
    amount = timers.remainingMs;
  }
  if (!isFinite(amount) || amount <= 0) return;
  timers.mode = mode;
  if (mode === "prep") timers.prepSide = side;
  timers.running = true;
  timers.timeUp = false;
  timers.deadline = Date.now() + amount;
  saveSoon(true);
  updateTimerButton();
}

function columnSize(pane, count) {
  var space = Math.max(1, pane || 1);
  var n = Math.max(1, count || 1);
  if (space < 900) return space;
  var minCol = 260;
  if (space / n >= minCol) return Math.floor(space / n);
  return minCol;
}

function anchorMenu(anchor, node) {
  var rect;
  var width;
  var height;
  var left;
  var top;
  dropMenu();
  if (!anchor || !node || !anchor.getBoundingClientRect) return;
  unhide(node);
  rect = anchor.getBoundingClientRect();
  width = Math.min(node.offsetWidth || 220, window.innerWidth - 16);
  height = node.offsetHeight;
  left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
  top = rect.bottom + 6;
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
  node.style.top = top + "px";
  node.style.left = left + "px";
  state.popover = node;
}

function dropMenu() {
  if (state.popover) foldAway(state.popover);
  state.popover = null;
}

function render() {
  var page = document.body.dataset.page;
  state.view = page;
  if (page === "home") listRounds();
  else if (page === "settings") clockForm();
  else if (page === "preflows") listPreflows();
  else if (page === "notes") showCx();
  else if (page === "workspace") showFlow();
  if (page === "workspace" && state.tourStep >= 0) showTour();
}

function listRounds() {
  var banner = document.getElementById("recovered-banner");
  if (banner) {
    if (db.recovered) unhide(banner);
    else foldAway(banner);
  }
  var rounds = objList(db.rounds);
  var q = state.query.trim().toLowerCase();
  var matched = [];
  var i;
  var words;
  for (i = 0; i < rounds.length; i++) {
    words = [rounds[i].title, rounds[i].topic, rounds[i].tournament, rounds[i].opponent].join(" ").toLowerCase();
    if (!q || words.indexOf(q) !== -1) matched.push(rounds[i]);
  }
  rounds = sortRecent(matched);
  var empty = document.getElementById("empty-home");
  var browser = document.getElementById("round-browser");
  if (!rounds.length && !q) {
    unhide(empty);
    foldAway(browser);
    return;
  }
  foldAway(empty);
  unhide(browser);
  var count = document.getElementById("round-count");
  count.textContent = rounds.length + (rounds.length === 1 ? " round" : " rounds") + " in this browser";
  var search = document.querySelector("[data-field='search-box']");
  if (search && document.activeElement !== search) search.value = state.query;
  var list = document.getElementById("card-list");
  clearNode(list);
  var noMatch = document.getElementById("no-match");
  if (!rounds.length) unhide(noMatch);
  else foldAway(noMatch);
  var buttons;
  var b;
  for (i = 0; i < rounds.length; i++) {
    var card = cloneTpl("sample-round");
    card.querySelector(".card-name").textContent = rounds[i].title;
    var pill = card.querySelector(".side-tag");
    pill.textContent = sideName(rounds[i].yourSide) || "Pro";
    pill.classList.remove("pro-tag", "con-tag", "obs-tag");
    if (rounds[i].yourSide === "con") pill.classList.add("con-tag");
    else if (rounds[i].yourSide === "observer") pill.classList.add("obs-tag");
    else pill.classList.add("pro-tag");
    setLine(card.querySelector(".card-line"), joinSkipEmpty([rounds[i].tournament, rounds[i].roundLabel], " · "));
    setLine(card.querySelector(".card-topic"), rounds[i].topic || "");
    card.querySelector(".card-time").textContent = "Edited " + new Date(rounds[i].updatedAt).toLocaleString();
    buttons = card.querySelectorAll("button");
    for (b = 0; b < buttons.length; b++) buttons[b].dataset.id = rounds[i].id;
    list.appendChild(card);
  }
}

function clockForm() {
  var note = document.getElementById("font-size-note");
  if (note) note.textContent = "Choose 12, 14, 16, or 18 px in the workspace toolbar. The current size is " + (db.settings.fontSize || 14) + " px.";
  var inputs = document.querySelectorAll("[data-preset]");
  var i;
  for (i = 0; i < inputs.length; i++) inputs[i].value = db.settings.durations[inputs[i].dataset.preset];
  var sound = document.querySelector("[data-field='sound']");
  if (sound) sound.checked = !!db.settings.sound;
}

function listPreflows() {
  var list = document.getElementById("preflow-list");
  var preflows = sortRecent(objList(db.preflows));
  var i;
  var b;
  var buttons;
  clearNode(list);
  for (i = 0; i < preflows.length; i++) {
    var card = cloneTpl("sample-pf");
    card.querySelector(".card-name").textContent = preflows[i].title;
    card.querySelector(".card-extra").textContent = sideName(preflows[i].side) + (preflows[i].topic ? " · " + preflows[i].topic : "");
    buttons = card.querySelectorAll("button");
    for (b = 0; b < buttons.length; b++) buttons[b].dataset.id = preflows[i].id;
    list.appendChild(card);
  }
}

function ballotLine() {
  var round = state.round;
  var you = sideName(round.yourSide);
  var first = "";
  if (!you) you = "Pro";
  // Only a speaking team can "speak first". Observer is who you are, not a slot in the order.
  if (round.firstSide === "con") first = "Con speaks first";
  else if (round.firstSide === "pro") first = "Pro speaks first";
  return joinSkipEmpty([
    round.tournament,
    round.roundLabel,
    round.opponent ? "vs " + round.opponent : "",
    "You: " + you,
    first
  ], "  ·  ");
}

function roundStamp() {
  var title = document.querySelector(".title-input");
  if (title && document.activeElement !== title && title.value !== state.round.title) title.value = state.round.title;
  var meta = document.getElementById("title-note");
  if (meta) meta.textContent = ballotLine();
  updateSaveLabel();
  updateTimerButton();
}

function contJumps() {
  var list = document.getElementById("jump-links");
  if (!list) return;
  clearNode(list);
  var caseSide = activeCase();
  var ids = state.round.cases[caseSide].contentionIds;
  var i;
  var contention;
  var jump;
  for (i = 0; i < ids.length; i++) {
    contention = state.round.contentions[ids[i]];
    if (!contention) continue;
    jump = cloneTpl("jump-sample");
    jump.dataset.id = ids[i];
    jump.querySelector(".color-dot").style.backgroundColor = JUMP_COLORS[i % JUMP_COLORS.length];
    jump.querySelector(".link-name").textContent = contention.name;
    list.appendChild(jump);
  }
}

function markOneLink(id, on) {
  var node = document.getElementById(id);
  if (node) node.classList.toggle("active", on);
}

function markCaseLinks() {
  var onNotes = document.body.dataset.page === "notes";
  markOneLink("link-pro", !onNotes && state.caseSide === "pro");
  markOneLink("switch-pro", !onNotes && state.caseSide === "pro");
  markOneLink("link-con", !onNotes && state.caseSide === "con");
  markOneLink("switch-con", !onNotes && state.caseSide === "con");
  markOneLink("link-notes", onNotes);
  markOneLink("switch-notes", onNotes);
}

function rdBar() {
  var preflow = state.round.isPreflow;
  var caseLinks = document.getElementById("case-links");
  var caseSwitch = document.getElementById("side-bar");
  var preLabel = document.getElementById("preflow-label");
  var timerChip = document.getElementById("timer-btn");
  var roundMenu = document.getElementById("dots-btn");
  var preMenu = document.getElementById("opening-menu-btn");
  var columnTools = document.getElementById("column-tools");
  var toolbarTimer = document.getElementById("toolbar-timer");
  if (preflow) {
    foldAway(caseLinks);
    foldAway(caseSwitch);
    foldAway(timerChip);
    foldAway(roundMenu);
    foldAway(columnTools);
    foldAway(toolbarTimer);
    unhide(preMenu);
    if (preLabel) {
      preLabel.textContent = sideName(state.round.preflowSide) + " preflow";
      unhide(preLabel);
    }
  } else {
    unhide(caseLinks);
    unhide(caseSwitch);
    unhide(timerChip);
    unhide(roundMenu);
    unhide(columnTools);
    unhide(toolbarTimer);
    foldAway(preMenu);
    foldAway(preLabel);
  }
  markCaseLinks();
  roundStamp();
  contJumps();
  var sizes = document.querySelector("[data-field='font-size']");
  if (sizes) sizes.value = String(db.settings.fontSize || 14);
  showUndoButtons();
  updateSideMenu();
}

function colWindow() {
  if (!state.round || state.round.isPreflow || document.body.dataset.page !== "workspace") return;
  var caseSide = activeCase();
  var all = speechesOnSide(state.round, caseSide);
  var focus = state.round.columnFocus[caseSide] || { count: null, start: 0 };
  var countSelect = document.querySelector("[data-field='columns-count']");
  if (countSelect) countSelect.value = focus.count ? String(focus.count) : "all";
  var startSelect = document.querySelector("[data-field='columns-start']");
  if (startSelect) {
    var i;
    var option;
    clearNode(startSelect);
    for (i = 0; i < all.length; i++) {
      option = cloneTpl("opt-sample");
      option.value = String(i);
      option.textContent = "Start at: " + speechName(all[i], false);
      if ((focus.start || 0) === i) option.selected = true;
      startSelect.appendChild(option);
    }
  }
  var view = shownSpeeches(state.round, caseSide);
  var status = document.getElementById("column-bar");
  if (view.count < view.all.length) {
    unhide(status);
    document.getElementById("column-status-text").textContent = "Showing columns " + (view.start + 1) + "–" + (view.start + view.visible.length) + " of " + view.all.length;
    document.getElementById("status-left").disabled = view.start === 0;
    document.getElementById("status-right").disabled = view.start + view.visible.length >= view.all.length;
  } else foldAway(status);
  var left = document.querySelector("#column-tools [data-action='columns-left']");
  var right = document.querySelector("#column-tools [data-action='columns-right']");
  if (left) left.disabled = (focus.start || 0) === 0;
  if (right) right.disabled = (focus.start || 0) + (focus.count || all.length) >= all.length;
}

function showFlow() {
  var shell = document.querySelector(".workspace");
  if (shell) shell.classList.toggle("proof-open", state.evidenceOpen);
  rdBar();
  colWindow();
  buildFlow();
  if (state.evidenceOpen) showProof();
  var scroller = document.getElementById("scroll-box");
  if (scroller) scroller.scrollTop = state.round.scroll[activeCase()] || 0;
  var jumpTo = sessionStorage.getItem("jumpTo");
  if (jumpTo) {
    sessionStorage.removeItem("jumpTo");
    var section = document.querySelector('.group[data-id="' + jumpTo + '"]');
    if (section) section.scrollIntoView({ block: "start" });
  }
  var focusNoteId = sessionStorage.getItem("focusNote");
  if (focusNoteId) {
    sessionStorage.removeItem("focusNote");
    state.selectedId = focusNoteId;
    selectNote(focusNoteId, sessionStorage.getItem("openEvidence") === "1");
    sessionStorage.removeItem("openEvidence");
    setTimeout(function () { focusNote(focusNoteId); }, 30);
  }
}

function showCx() {
  var areas = document.querySelectorAll("textarea.note-box");
  var i;
  var value;
  rdBar();
  for (i = 0; i < areas.length; i++) {
    value = (state.round.crossNotes && state.round.crossNotes[areas[i].dataset.cross]) || "";
    if (document.activeElement !== areas[i]) areas[i].value = value;
  }
  var cross = sessionStorage.getItem("focusCross");
  if (cross) {
    sessionStorage.removeItem("focusCross");
    var area = document.querySelector('[data-cross="' + cross + '"]');
    if (area) area.focus();
  }
}

function buildFlow() {
  var sheet = document.querySelector(".flow-paper");
  var scroller = document.getElementById("scroll-box");
  if (!sheet || !state.round || document.body.dataset.page !== "workspace") return;
  var caseSide = activeCase();
  var view = shownSpeeches(state.round, caseSide);
  var pane = scroller.clientWidth || 800;
  var width = columnSize(pane, view.visible.length);
  var paneWidth = pane + "px";
  clearNode(sheet);
  var heads = cloneTpl("head-row");
  var kindNames = { constructive: "Constr.", rebuttal: "Reb.", summary: "Sum.", final: "FF" };
  var i;
  var speechId;
  var info;
  var label;
  var seconds;
  var contention;
  var headsOnSheet;
  for (i = 0; i < view.visible.length; i++) {
    speechId = view.visible[i];
    info = SPEECHES[speechId];
    label = cloneTpl("speech-chip");
    label.classList.add(info.team);
    label.style.width = width + "px";
    label.querySelector(".speech-name").textContent = info.full;
    label.querySelector(".speech-number").textContent = (view.all.indexOf(speechId) + 1) + ". " + (kindNames[info.type] || info.short);
    seconds = (db.settings.durations && db.settings.durations[info.type]) || 240;
    label.querySelector(".speech-time").textContent = Math.round(seconds / 60) + " min";
    heads.appendChild(label);
  }
  sheet.appendChild(heads);
  for (i = 0; i < state.round.cases[caseSide].contentionIds.length; i++) {
    contention = state.round.contentions[state.round.cases[caseSide].contentionIds[i]];
    if (contention) sheet.appendChild(drawGroup(contention, caseSide, view, width));
  }
  headsOnSheet = sheet.querySelectorAll(".group-top");
  for (i = 0; i < headsOnSheet.length; i++) headsOnSheet[i].style.maxWidth = paneWidth;
  measurePoints();
  placePoints(width);
  var selected = document.querySelector('.point[data-id="' + state.selectedId + '"]');
  if (selected) selected.classList.add("picked");
}

function drawGroup(contention, caseSide, view, width) {
  var section = cloneTpl("cont-block");
  section.dataset.id = contention.id;
  var index = state.round.cases[caseSide].contentionIds.indexOf(contention.id);
  var tone = CONTENTION_COLORS[(index >= 0 ? index : 0) % CONTENTION_COLORS.length];
  var head = section.querySelector(".group-top");
  head.style.backgroundColor = tone.head;
  head.style.color = tone.ink;
  head.style.borderLeft = "4px solid " + tone.accent;
  section.querySelector(".group-dot").style.backgroundColor = tone.accent;
  var toggle = section.querySelector("[data-action='fold-group']");
  toggle.textContent = contention.collapsed ? "▸" : "▾";
  toggle.title = contention.collapsed ? "Expand contention" : "Collapse contention";
  var name = section.querySelector(".group-name");
  name.value = contention.name;
  name.style.color = tone.ink;
  var buttons = section.querySelectorAll("[data-action]");
  var b;
  name.dataset.id = contention.id;
  for (b = 0; b < buttons.length; b++) buttons[b].dataset.id = contention.id;
  var grid = section.querySelector(".group-row");
  if (contention.collapsed) {
    foldAway(grid);
    return section;
  }
  var layout = lineUpGroup(state.round, contention, caseSide, state.heights);
  var s;
  var speechId;
  var column;
  var canvas;
  var noteNames;
  var n;
  var note;
  var slot;
  var parent;
  var box;
  var starter;
  for (s = 0; s < view.visible.length; s++) {
    speechId = view.visible[s];
    column = cloneTpl("col-sample");
    column.style.width = width + "px";
    column.dataset.speech = speechId;
    canvas = column.querySelector(".column-area");
    canvas.style.height = layout.height + "px";
    canvas.dataset.group = contention.id;
    canvas.dataset.speech = speechId;
    noteNames = Object.keys(state.round.notes);
    for (n = 0; n < noteNames.length; n++) {
      note = state.round.notes[noteNames[n]];
      if (note.contentionId === contention.id && note.speechId === speechId && layout.positions[noteNames[n]]) {
        canvas.appendChild(drawPoint(note));
      }
    }
    for (n = 0; n < layout.slots.length; n++) {
      slot = layout.slots[n];
      if (slot.speechId !== speechId) continue;
      parent = state.round.notes[slot.parentId];
      if (!parent || parent.contentionId !== contention.id) continue;
      box = cloneTpl("ans-slot");
      box.style.fontSize = textSize();
      box.setAttribute("aria-label", "Response to " + (parent.text || "point"));
      box.dataset.parent = slot.parentId;
      box.dataset.speech = speechId;
      canvas.appendChild(box);
    }
    starter = column.querySelector(".new-box");
    starter.style.fontSize = textSize();
    starter.dataset.starter = contention.id;
    starter.dataset.speech = speechId;
    starter.setAttribute("aria-label", "New point in " + speechName(speechId, true));
    grid.appendChild(column);
  }
  return section;
}

function drawPoint(note) {
  var box = cloneTpl("card-sample");
  box.dataset.id = note.id;
  if (note.id === state.selectedId) box.classList.add("picked");
  var marker = box.querySelector(".point-tag");
  if (note.marker) {
    marker.textContent = markerLabel(note.marker);
    marker.className = "point-tag" + (note.marker ? " tag-" + note.marker : "");
    unhide(marker);
  } else foldAway(marker);
  var area = box.querySelector(".point-input");
  area.style.fontSize = textSize();
  area.value = note.text;
  area.dataset.id = note.id;
  area.setAttribute("aria-label", speechName(note.speechId, true) + " point");
  if (!document.querySelector("[data-tour='point']")) area.dataset.tour = "point";
  var clip = box.querySelector(".clip-btn");
  clip.dataset.id = note.id;
  if (note.evidenceId) {
    clip.classList.add("has-proof");
    clip.setAttribute("aria-label", "Open evidence");
    unhide(clip.querySelector(".clip-number"));
  } else {
    clip.setAttribute("aria-label", "Add evidence");
    foldAway(clip.querySelector(".clip-number"));
  }
  if (!document.querySelector("[data-tour='clip-btn']")) clip.dataset.tour = "clip-btn";
  box.querySelector(".point-menu").dataset.id = note.id;
  return box;
}

function measurePoints() {
  var areas = document.querySelectorAll("textarea.point-input");
  var i;
  var area;
  var textHeight;
  var box;
  var boxHeight;
  for (i = 0; i < areas.length; i++) {
    area = areas[i];
    area.style.height = "auto";
    textHeight = Math.max(24, area.scrollHeight);
    area.style.height = textHeight + "px";
    box = area.parentElement;
    box.style.height = "auto";
    boxHeight = Math.max(44, box.scrollHeight);
    state.heights[area.dataset.id] = boxHeight;
    box.style.height = boxHeight + "px";
  }
}

function placePoints(width) {
  var caseSide = activeCase();
  var view = shownSpeeches(state.round, caseSide);
  if (!width) {
    var scroller = document.getElementById("scroll-box");
    width = columnSize(scroller ? scroller.clientWidth : 800, view.visible.length);
  }
  var ids = state.round.cases[caseSide].contentionIds;
  var i;
  var n;
  var contention;
  var layout;
  var canvases;
  var names;
  var point;
  var box;
  for (i = 0; i < ids.length; i++) {
    contention = state.round.contentions[ids[i]];
    if (!contention || contention.collapsed) continue;
    layout = lineUpGroup(state.round, contention, caseSide, state.heights);
    canvases = document.querySelectorAll('.column-area[data-group="' + ids[i] + '"]');
    for (n = 0; n < canvases.length; n++) canvases[n].style.height = layout.height + "px";
    names = Object.keys(layout.positions);
    for (n = 0; n < names.length; n++) {
      if (names[n] === "_threads") continue;
      point = document.querySelector('.point[data-id="' + names[n] + '"]');
      if (!point) continue;
      point.style.top = layout.positions[names[n]].top + "px";
      point.style.height = layout.positions[names[n]].height + "px";
    }
    for (n = 0; n < layout.slots.length; n++) {
      box = document.querySelector('.reply-box[data-parent="' + layout.slots[n].parentId + '"][data-speech="' + layout.slots[n].speechId + '"]');
      if (box) box.style.top = layout.slots[n].top + "px";
    }
  }
}

function showProof() {
  var list = document.querySelector(".proof-list");
  var crumb = document.querySelector(".proof-path");
  if (!list || !state.round) return;
  var selected = state.round.notes[state.selectedId];
  clearNode(list);
  if (!selected) {
    foldAway(crumb);
    if (document.getElementById("ev-empty")) list.appendChild(cloneTpl("ev-empty"));
    return;
  }
  unhide(crumb);
  var contention = state.round.contentions[selected.contentionId];
  var summary = (selected.text || "Point").split("\n")[0];
  if (summary.length > 25) summary = summary.slice(0, 25) + "...";
  document.getElementById("crumb-contention").textContent = contention ? contention.name : "Contention";
  document.getElementById("crumb-point").textContent = summary;
  var notes = proofList(selected.contentionId, activeCase());
  var found = false;
  var i;
  var has;
  for (i = 0; i < notes.length; i++) {
    has = notes[i].evidenceId && state.round.evidence[notes[i].evidenceId] && state.round.evidence[notes[i].evidenceId].plain;
    if (!has && notes[i].id !== selected.id) continue;
    found = true;
    list.appendChild(drawProofCard(notes[i], notes[i].id === selected.id));
  }
  if (!found) list.appendChild(drawProofCard(selected, true));
  var current = list.querySelector(".current");
  if (current) list.scrollTop = Math.max(0, current.offsetTop - 12);
}

function proofList(contentionId, caseSide) {
  var contention = state.round.contentions[contentionId];
  var ordered = [];
  function walk(note) {
    var later = speechesAfter(state.round, caseSide, note.speechId);
    var i;
    var replies;
    var r;
    ordered.push(note);
    for (i = 0; i < later.length; i++) {
      replies = repliesInColumn(state.round, note.id, later[i]);
      for (r = 0; r < replies.length; r++) walk(replies[r]);
    }
  }
  var i;
  for (i = 0; i < contention.startingPointIds.length; i++) {
    if (state.round.notes[contention.startingPointIds[i]]) walk(state.round.notes[contention.startingPointIds[i]]);
  }
  return ordered;
}

function drawProofCard(note, current) {
  var card = cloneTpl("ev-card");
  if (current) card.classList.add("current");
  var first = (note.text || "Empty point").split("\n")[0];
  card.querySelector(".proof-place").textContent = first + " · " + speechName(note.speechId, true);
  var body = card.querySelector(".proof-text");
  body.dataset.evidence = note.id;
  var stored = note.evidenceId && state.round.evidence[note.evidenceId];
  if (stored) body.innerHTML = cleanHtml(stored.html).html;
  if (!document.querySelector("[data-tour='proof-panel']")) body.dataset.tour = "proof-panel";
  var notice = card.querySelector(".proof-note");
  notice.dataset.notice = note.id;
  notice.textContent = stored && stored.notice ? stored.notice : "";
  return card;
}

function selectNote(id, openEvidence) {
  var points = document.querySelectorAll(".point");
  var i;
  state.selectedId = id;
  for (i = 0; i < points.length; i++) points[i].classList.toggle("picked", points[i].dataset.id === id);
  if (openEvidence) state.evidenceOpen = true;
  if (state.evidenceOpen) {
    var shell = document.querySelector(".workspace");
    if (shell) shell.classList.add("proof-open");
    showProof();
  }
}

function focusNote(id, caret) {
  var area = document.querySelector('textarea.point-input[data-id="' + id + '"]');
  if (!area) return;
  area.focus();
  var spot = typeof caret === "number" ? caret : area.value.length;
  area.setSelectionRange(spot, spot);
}

function typeReply(slot, text) {
  rememberBeforeChange();
  var note = addAns(state.round, slot.dataset.parent, slot.dataset.speech, text || "");
  saveSoon(true);
  state.selectedId = note.id;
  buildFlow();
  focusNote(note.id, text ? text.length : 0);
}

function typeNewPoint(starter) {
  var text = starter.value;
  var speech = starter.dataset.speech;
  if (!text) return;
  // a preflow is only the constructive you read. don't let a rebuttal column spawn a shell there.
  if (state.round.isPreflow && speech !== state.round.preflowSide + "-constructive") return;
  rememberBeforeChange();
  var note = addShell(state.round, starter.dataset.starter, starter.dataset.speech, text);
  starter.value = "";
  saveSoon(true);
  state.selectedId = note.id;
  buildFlow();
  focusNote(note.id, text.length);
}

function splitNote(area) {
  var note = state.round.notes[area.dataset.id];
  if (!note) return;
  var before = area.value.slice(0, area.selectionStart);
  var after = area.value.slice(area.selectionEnd);
  if (!before && !after) {
    var next = area.closest(".speech-column").querySelector(".new-box");
    if (next) next.focus();
    return;
  }
  rememberBeforeChange();
  note.text = before;
  var created = note.parentId
    ? addAns(state.round, note.parentId, note.speechId, after, note.id)
    : addShell(state.round, note.contentionId, note.speechId, after, note.id);
  saveSoon(true);
  state.selectedId = created.id;
  buildFlow();
  focusNote(created.id, 0);
}

function saveProof(body, pasteNotice) {
  var note = state.round.notes[body.dataset.evidence];
  if (!note) return;
  var cleaned = cleanHtml(body.innerHTML);
  var previous = note.evidenceId && state.round.evidence[note.evidenceId] ? state.round.evidence[note.evidenceId].notice : "";
  var shown = pasteNotice || cleaned.notice || previous || "";
  var notice = document.querySelector('[data-notice="' + note.id + '"]');
  if (notice) notice.textContent = shown;
  if (!cleaned.plain.trim()) {
    if (note.evidenceId) delete state.round.evidence[note.evidenceId];
    note.evidenceId = null;
    return;
  }
  if (!note.evidenceId || !state.round.evidence[note.evidenceId]) {
    note.evidenceId = uid("ev");
    state.round.evidence[note.evidenceId] = { id: note.evidenceId, noteId: note.id, html: "", plain: "", notice: "" };
  }
  var record = state.round.evidence[note.evidenceId];
  record.html = cleaned.html;
  record.plain = cleaned.plain;
  record.notice = shown;
  record.noteId = note.id;
}

function findWords() {
  var query = state.findText.trim().toLowerCase();
  var hits = [];
  var names;
  var i;
  var note;
  var keys;
  if (!query || !state.round) return hits;
  names = Object.keys(state.round.notes);
  for (i = 0; i < names.length; i++) {
    note = state.round.notes[names[i]];
    if ((note.text || "").toLowerCase().indexOf(query) !== -1) hits.push({ noteId: names[i], evidence: false });
    if (note.evidenceId && state.round.evidence[note.evidenceId] && (state.round.evidence[note.evidenceId].plain || "").toLowerCase().indexOf(query) !== -1) {
      hits.push({ noteId: names[i], evidence: true });
    }
  }
  keys = Object.keys(state.round.crossNotes || {});
  for (i = 0; i < keys.length; i++) {
    if ((state.round.crossNotes[keys[i]] || "").toLowerCase().indexOf(query) !== -1) hits.push({ cross: keys[i] });
  }
  return hits;
}

function openHit(hit) {
  if (!hit) return;
  dropMenu();
  if (hit.cross) {
    sessionStorage.setItem("focusCross", hit.cross);
    if (document.body.dataset.page !== "notes") go("notes.html");
    else {
      var area = document.querySelector('[data-cross="' + hit.cross + '"]');
      if (area) area.focus();
    }
    return;
  }
  var note = state.round.notes[hit.noteId];
  state.caseSide = whoseCont(state.round, note.contentionId) || state.caseSide;
  state.round.columnFocus[state.caseSide] = { count: null, start: 0 };
  state.round.contentions[note.contentionId].collapsed = false;
  state.selectedId = note.id;
  if (hit.evidence) state.evidenceOpen = true;
  if (document.body.dataset.page !== "workspace") {
    sessionStorage.setItem("focusNote", note.id);
    if (hit.evidence) sessionStorage.setItem("openEvidence", "1");
    go("workspace.html");
    return;
  }
  render();
  setTimeout(function () { focusNote(note.id); }, 30);
}

function showFoundWords() {
  var results = document.getElementById("find-hits");
  if (!results) return;
  state.findHits = findWords();
  state.findAt = -1;
  var i;
  var button;
  var label;
  clearNode(results);
  for (i = 0; i < state.findHits.length; i++) {
    button = cloneTpl("menu-btn-sample");
    label = state.findHits[i].cross ? "Notes" : (state.round.notes[state.findHits[i].noteId].text || "Evidence").split("\n")[0];
    button.textContent = label;
    button.dataset.hit = String(i);
    results.appendChild(button);
  }
  results.onclick = function (event) {
    var picked = event.target.closest("button");
    if (!picked || picked.dataset.hit === undefined) return;
    state.findAt = Number(picked.dataset.hit);
    openHit(state.findHits[state.findAt]);
  };
}

function openFind(anchor) {
  var box = document.getElementById("find-popover");
  var input = document.getElementById("find-input");
  input.value = state.findText;
  anchorMenu(anchor, box);
  showFoundWords();
  input.focus();
}

function openTimer(anchor) {
  if (!state.round || state.round.isPreflow) return;
  var timers = state.round.timers;
  var activity = timerStepNow();
  document.getElementById("timer-activity").textContent = activity.item.label;
  document.getElementById("popover-clock").textContent = timers.running && timers.mode === "speech" ? clock(timers.deadline - Date.now()) : clock(timers.remainingMs);
  document.getElementById("timer-start-btn").textContent = timers.running && timers.mode === "speech" ? "Pause" : "Start";
  document.getElementById("prep-pro-label").textContent = "Pro " + clock(timers.prepLeft.pro);
  document.getElementById("prep-con-label").textContent = "Con " + clock(timers.prepLeft.con);
  document.getElementById("prep-pro-btn").textContent = timers.running && timers.mode === "prep" && timers.prepSide === "pro" ? "Pause" : "Start";
  document.getElementById("prep-con-btn").textContent = timers.running && timers.mode === "prep" && timers.prepSide === "con" ? "Pause" : "Start";
  anchorMenu(anchor, document.getElementById("timer-popover"));
}

function markerClick(note, markerId) {
  return function () {
    var warn = markerWarn(state.round, note, markerId);
    var apply = function () {
      rememberBeforeChange();
      note.marker = markerId;
      saveSoon(true);
      buildFlow();
    };
    if (!warn) {
      apply();
      return;
    }
    askConfirm("Label this card?", warn, "Add label", apply);
  };
}

function openPointMenu(anchor, noteId) {
  var note = state.round.notes[noteId];
  var menu = document.getElementById("note-menu");
  clearNode(menu);
  function item(label, run) {
    var button = cloneTpl("menu-btn-sample");
    button.textContent = label;
    button.addEventListener("click", function () {
      dropMenu();
      run();
    });
    menu.appendChild(button);
  }
  item("Insert point below", function () {
    var area = document.querySelector('textarea.point-input[data-id="' + noteId + '"]');
    if (!area) return;
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
    splitNote(area);
  });
  item("Link response", function () { openLinkMenu(anchor, note); });
  item("Move up", function () { rememberBeforeChange(); nudgeCard(state.round, noteId, -1); saveSoon(true); buildFlow(); });
  item("Move down", function () { rememberBeforeChange(); nudgeCard(state.round, noteId, 1); saveSoon(true); buildFlow(); });
  item("Duplicate", function () {
    rememberBeforeChange();
    var copy = dupeCard(state.round, noteId);
    state.selectedId = copy.id;
    saveSoon(true);
    buildFlow();
    focusNote(copy.id);
  });
  var m;
  item("Delete", function () { removeNote(note); });
  for (m = 0; m < MARKERS.length; m++) {
    item("Marker: " + MARKERS[m].label, markerClick(note, MARKERS[m].id));
  }
  anchorMenu(anchor, menu);
}

function openLinkMenu(anchor, note) {
  var caseSide = whoseCont(state.round, note.contentionId);
  var speeches = speechesOnSide(state.round, caseSide);
  var limit = speeches.indexOf(note.speechId);
  var blocked = underLine(state.round, note.id, []);
  var menu = document.getElementById("link-menu");
  var choicesBox = document.getElementById("link-choices");
  var intro = menu.querySelector(".gray-text");
  var notes = objList(state.round.notes);
  var choices = [];
  var i;
  var button;
  clearNode(choicesBox);
  for (i = 0; i < notes.length; i++) {
    if (notes[i].contentionId === note.contentionId && speeches.indexOf(notes[i].speechId) > -1 && speeches.indexOf(notes[i].speechId) < limit && blocked.indexOf(notes[i].id) === -1) {
      choices.push(notes[i]);
    }
  }
  intro.textContent = choices.length ? "Link this point to an earlier note" : "No earlier point in this contention.";
  for (i = 0; i < choices.length; i++) {
    button = cloneTpl("menu-btn-sample");
    button.textContent = speechName(choices[i].speechId, false) + ": " + (choices[i].text || "Empty point").split("\n")[0];
    button.dataset.link = choices[i].id;
    choicesBox.appendChild(button);
  }
  choicesBox.onclick = function (event) {
    var picked = event.target.closest("button");
    var why;
    if (!picked || !picked.dataset.link) return;
    why = whyNotLink(state.round, note.id, picked.dataset.link);
    if (why) {
      intro.textContent = why;
      return;
    }
    rememberBeforeChange();
    connectPoint(state.round, note.id, picked.dataset.link);
    dropMenu();
    saveSoon(true);
    buildFlow();
  };
  anchorMenu(anchor, menu);
}

function removeNote(note) {
  var names = Object.keys(state.round.notes);
  var children = [];
  var i;
  for (i = 0; i < names.length; i++) {
    if (state.round.notes[names[i]].parentId === note.id) children.push(names[i]);
  }
  var run = function () {
    rememberBeforeChange();
    if (state.selectedId === note.id) state.selectedId = null;
    cutCard(state.round, note.id);
    saveSoon(true);
    buildFlow();
    showProof();
  };
  if (!note.text && !note.evidenceId && !children.length) {
    run();
    return;
  }
  askConfirm("Delete this point?", children.length
    ? "This removes the point and its evidence. Responses stay, with their text and evidence unchanged."
    : "This removes the point and its evidence.", "Delete", run);
}

function switchCase(side) {
  if (!state.round || state.round.isPreflow) return;
  if (document.body.dataset.page === "notes") {
    state.caseSide = side;
    go("workspace.html");
    return;
  }
  if (state.caseSide === side) return;
  saveTypedWords();
  var scroller = document.getElementById("scroll-box");
  if (scroller) state.round.scroll[state.caseSide] = scroller.scrollTop;
  state.caseSide = side;
  state.selectedId = null;
  state.evidenceOpen = false;
  saveSoon(true);
  render();
}

function showTour() {
  var marked = document.querySelectorAll(".highlight");
  var i;
  var notes;
  var withEvidence;
  for (i = 0; i < marked.length; i++) marked[i].classList.remove("highlight");
  if (state.tourStep < 0 || state.tourStep >= TOUR.length) return;
  var step = TOUR[state.tourStep];
  var needsMenu = window.innerWidth <= 899 && (step.target.indexOf("cases") !== -1 || step.target.indexOf("notes") !== -1 || step.target.indexOf("jumps") !== -1);
  state.navOpen = needsMenu;
  updateSideMenu();
  if (state.tourStep === 5) {
    notes = objList(state.round.notes);
    withEvidence = null;
    for (i = 0; i < notes.length; i++) {
      if (notes[i].evidenceId) {
        withEvidence = notes[i];
        break;
      }
    }
    if (withEvidence) {
      state.selectedId = withEvidence.id;
      state.evidenceOpen = true;
      var shell = document.querySelector(".workspace");
      if (shell) shell.classList.add("proof-open");
      showProof();
    }
  }
  var target = document.querySelector(step.target);
  if (target) {
    target.classList.add("highlight");
    if (target.scrollIntoView) target.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  document.getElementById("tour-step").textContent = "Step " + (state.tourStep + 1) + " of " + TOUR.length;
  document.getElementById("tour-text").textContent = step.text;
  if (state.tourStep > 0) unhide(document.getElementById("tour-back"));
  else foldAway(document.getElementById("tour-back"));
  if (state.tourStep < TOUR.length - 1) unhide(document.getElementById("tour-next"));
  else foldAway(document.getElementById("tour-next"));
  unhide(document.getElementById("tour"));
  sessionStorage.setItem("tourStep", String(state.tourStep));
}

function startTour() {
  if (!state.demo && state.round && !state.round.isPreflow) sessionStorage.setItem("tourReturn", state.round.id);
  else sessionStorage.setItem("tourReturn", "");
  var round = demoRound();
  sessionStorage.setItem("tourDemo", "1");
  sessionStorage.setItem("tourStep", "0");
  sessionStorage.setItem("tourRound", JSON.stringify(round));
  sessionStorage.setItem("caseSide", "pro");
  if (document.body.dataset.page === "workspace") {
    state.demo = true;
    state.round = round;
    state.caseSide = "pro";
    state.view = "workspace";
    state.evidenceOpen = false;
    state.selectedId = null;
    state.tourStep = 0;
    resetHistory();
    render();
  } else window.location.href = "workspace.html";
}

function closeTour() {
  var back = sessionStorage.getItem("tourReturn");
  sessionStorage.removeItem("tourDemo");
  sessionStorage.removeItem("tourRound");
  sessionStorage.removeItem("tourStep");
  sessionStorage.removeItem("tourReturn");
  state.tourStep = -1;
  state.demo = false;
  if (back && db.rounds[back]) {
    sessionStorage.setItem("openRoundId", back);
    window.location.href = "workspace.html";
  } else {
    sessionStorage.removeItem("openRoundId");
    window.location.href = "index.html";
  }
}

function demoRound() {
  var round = newRound({
    title: "Feature tour",
    topic: "Schools should provide free lunches.",
    yourSide: "pro",
    firstSide: "pro"
  }, db.settings);
  var proId = round.cases.pro.contentionIds[0];
  round.contentions[proId].name = "Student need";
  var attendance = addShell(round, proId, "pro-constructive", "Attendance improves");
  addShell(round, proId, "pro-constructive", "Nutrition supports learning");
  var transport = addAns(round, attendance.id, "con-rebuttal", "Transport matters more");
  addAns(round, attendance.id, "con-rebuttal", "Study is small");
  addAns(round, transport.id, "pro-summary", "Lunch removes another barrier");
  transport.evidenceId = uid("ev");
  round.evidence[transport.evidenceId] = {
    id: transport.evidenceId,
    noteId: transport.id,
    html: "Example paste: students missed fewer days when lunch was available at school.",
    plain: "Example paste: students missed fewer days when lunch was available at school."
  };
  var conId = round.cases.con.contentionIds[0];
  round.contentions[conId].name = "Cost";
  addShell(round, conId, "con-constructive", "Budgets are already tight");
  return round;
}

function safeFileName(title) {
  var text = String(title || "round").toLowerCase();
  var out = "";
  var i;
  var letter;
  for (i = 0; i < text.length; i++) {
    letter = text.charAt(i);
    if ((letter >= "a" && letter <= "z") || (letter >= "0" && letter <= "9")) out += letter;
    else if (out && out.charAt(out.length - 1) !== "-") out += "-";
  }
  if (out.charAt(out.length - 1) === "-") out = out.slice(0, out.length - 1);
  return out || "round";
}

function exportRound(round) {
  var payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    note: "Version 1 does not import this file. It is a record of the round.",
    round: round
  };
  var file = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  var link = document.createElement("a");
  var name = safeFileName(round.title);
  link.href = URL.createObjectURL(file);
  link.download = name + "-" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
}

function pfMenu() {
  var select = document.getElementById("new-opening");
  if (!select) return;
  var names = Object.keys(db.preflows);
  var i;
  var option;
  while (select.options.length > 1) select.remove(1);
  for (i = 0; i < names.length; i++) {
    option = cloneTpl("opt-sample");
    option.value = names[i];
    option.textContent = db.preflows[names[i]].title;
    select.appendChild(option);
  }
}

function openNewRound() {
  document.getElementById("new-title").value = "Untitled round";
  document.getElementById("new-topic").value = "";
  document.getElementById("new-tournament").value = "";
  document.getElementById("new-round-label").value = "";
  document.getElementById("new-opponent").value = "";
  document.getElementById("new-side").value = "pro";
  document.getElementById("new-first").value = "pro";
  pfMenu();
  unhide(document.getElementById("new-round-box"));
}

function startRound() {
  var round = newRound({
    title: document.getElementById("new-title").value.trim() || "Untitled round",
    topic: document.getElementById("new-topic").value.trim(),
    tournament: document.getElementById("new-tournament").value.trim(),
    roundLabel: document.getElementById("new-round-label").value.trim(),
    opponent: document.getElementById("new-opponent").value.trim(),
    yourSide: document.getElementById("new-side").value,
    firstSide: document.getElementById("new-first").value
  }, db.settings);
  var preId = document.getElementById("new-opening").value;
  var pre = preId && db.preflows[preId];
  var errNode = document.getElementById("new-round-error");
  var err;
  // A Con preflow lands on the Con case even if you're Pro. That's the case you prepared, not your side.
  if (pre && (pre.side === "pro" || pre.side === "con")) useOpening(round, pre);
  db.rounds[round.id] = round;
  err = writeSave(db);
  if (err) {
    delete db.rounds[round.id];
    if (errNode) errNode.textContent = err;
    return;
  }
  if (errNode) errNode.textContent = "";
  openRound(round.id);
}

function openRename(id) {
  var box = document.getElementById("rename-box");
  box.dataset.id = id;
  document.getElementById("rename-title").value = db.rounds[id].title;
  unhide(box);
}

function openDetails() {
  var round = state.round;
  document.getElementById("edit-title").value = round.title;
  document.getElementById("edit-topic").value = round.topic || "";
  document.getElementById("edit-tournament").value = round.tournament || "";
  document.getElementById("edit-round-label").value = round.roundLabel || "";
  document.getElementById("edit-opponent").value = round.opponent || "";
  document.getElementById("edit-side").value = round.yourSide;
  var locked = roundHasWords(round);
  document.getElementById("edit-lock-note").textContent = locked
    ? "Who speaks first is locked because notes already follow this order. Start a new round for a different order."
    : "Who speaks first sets the speech order.";
  var firstWrap = document.getElementById("edit-first-wrap");
  if (locked) foldAway(firstWrap);
  else {
    unhide(firstWrap);
    document.getElementById("edit-first").value = round.firstSide;
  }
  unhide(document.getElementById("edit-box"));
}

function saveDetails() {
  var round = state.round;
  var locked = roundHasWords(round);
  round.title = document.getElementById("edit-title").value.trim() || "Untitled round";
  round.topic = document.getElementById("edit-topic").value.trim();
  round.tournament = document.getElementById("edit-tournament").value.trim();
  round.roundLabel = document.getElementById("edit-round-label").value.trim();
  round.opponent = document.getElementById("edit-opponent").value.trim();
  var side = document.getElementById("edit-side").value;
  var first;
  if (side !== "pro" && side !== "con" && side !== "observer") side = "pro";
  round.yourSide = side;
  if (!locked) {
    first = document.getElementById("edit-first").value;
    if (first !== "con") first = "pro";
    round.firstSide = first;
    round.timers = newTimer(round.firstSide, db.settings.durations);
  }
  closePopups();
  saveSoon(true);
  render();
}

function printSheets(includeEvidence) {
  var round = state.round;
  document.getElementById("print-title").textContent = round.title || "Debate Round";
  setLine(document.getElementById("print-topic"), round.topic ? "Topic / Resolution: " + round.topic : "");
  var sides = ["pro", "con"];
  var sideIndex;
  var caseSide;
  var section;
  var speeches;
  var groupIds;
  var g;
  var contention;
  var block;
  var headRow;
  var s;
  var th;
  var tbody;
  var p;
  var startId;
  var family;
  var tr;
  var td;
  var noteList;
  var n;
  var card;
  var marker;
  var evBox;
  var extra;
  var extraNotes;
  var e;
  setLine(document.getElementById("print-meta"), joinSkipEmpty([
    round.tournament ? "Tournament: " + round.tournament : "",
    round.roundLabel ? "Round: " + round.roundLabel : "",
    round.opponent ? "vs " + round.opponent : "",
    "Your Side: " + sideName(round.yourSide),
    round.firstSide ? sideName(round.firstSide) + " speaks first" : ""
  ], "   |   "));
  var body = document.getElementById("print-body");
  clearNode(body);
  for (sideIndex = 0; sideIndex < sides.length; sideIndex++) {
    caseSide = sides[sideIndex];
    section = cloneTpl("print-case-sample");
    if (sideIndex === 1) section.classList.add("new-page");
    section.querySelector(".print-case-name").textContent = (caseSide === "pro" ? "PRO CASE" : "CON CASE") + " FLOW";
    speeches = speechesOnSide(round, caseSide);
    groupIds = round.cases[caseSide].contentionIds;
    for (g = 0; g < groupIds.length; g++) {
      contention = round.contentions[groupIds[g]];
      if (!contention) continue;
      block = cloneTpl("print-cont");
      block.querySelector(".print-group-name").textContent = contention.name;
      headRow = block.querySelector("thead tr");
      for (s = 0; s < speeches.length; s++) {
        th = cloneTpl("print-th");
        th.textContent = SPEECHES[speeches[s]].short;
        th.classList.add(SPEECHES[speeches[s]].team);
        headRow.appendChild(th);
      }
      tbody = block.querySelector("tbody");
      for (p = 0; p < contention.startingPointIds.length; p++) {
        startId = contention.startingPointIds[p];
        family = underLine(round, startId, []);
        tr = cloneTpl("print-tr");
        for (s = 0; s < speeches.length; s++) {
          td = cloneTpl("print-td");
          noteList = objList(round.notes);
          for (n = 0; n < noteList.length; n++) {
            if (noteList[n].contentionId !== groupIds[g] || noteList[n].speechId !== speeches[s]) continue;
            if (family.indexOf(noteList[n].id) === -1) continue;
            card = cloneTpl("print-card");
            marker = card.querySelector(".print-tag");
            if (noteList[n].marker) marker.textContent = markerLabel(noteList[n].marker);
            else foldAway(marker);
            card.querySelector(".print-words").textContent = noteList[n].text || "";
            evBox = card.querySelector(".print-proof");
            if (includeEvidence && noteList[n].evidenceId && round.evidence[noteList[n].evidenceId]) {
              evBox.textContent = "Proof: " + (round.evidence[noteList[n].evidenceId].plain || "");
            } else foldAway(evBox);
            td.appendChild(card);
          }
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      section.appendChild(block);
    }
    body.appendChild(section);
  }
  extra = cloneTpl("print-cx");
  extra.classList.add("new-page");
  extraNotes = [
    ["First Crossfire", round.crossNotes.firstCrossfire],
    ["Second Crossfire", round.crossNotes.secondCrossfire],
    ["Grand Crossfire", round.crossNotes.grandCrossfire],
    ["Reflections & Decision", round.crossNotes.reflections]
  ];
  for (e = 0; e < extraNotes.length; e++) {
    if (extraNotes[e][1] && extraNotes[e][1].trim()) {
      card = cloneTpl("print-cx-card");
      card.querySelector(".print-note-name").textContent = extraNotes[e][0];
      card.querySelector(".print-note-words").textContent = extraNotes[e][1];
      extra.appendChild(card);
    }
  }
  body.appendChild(extra);
}

function moveWithArrows(id, key) {
  var current = document.querySelector('.point[data-id="' + id + '"]');
  if (!current) return;
  var rect = current.getBoundingClientRect();
  var nodes = document.querySelectorAll(".point, .reply-box");
  var best = null;
  var bestDist = -1;
  var i;
  var box;
  var dx;
  var dy;
  var ok;
  var dist;
  for (i = 0; i < nodes.length; i++) {
    if (nodes[i] === current) continue;
    box = nodes[i].getBoundingClientRect();
    dx = box.left - rect.left;
    dy = box.top - rect.top;
    ok = (key === "ArrowRight" && dx > 20) || (key === "ArrowLeft" && dx < -20) || (key === "ArrowDown" && dy > 8 && Math.abs(dx) < 40) || (key === "ArrowUp" && dy < -8 && Math.abs(dx) < 40);
    dist = Math.abs(dx) + Math.abs(dy);
    if (ok && (bestDist < 0 || dist < bestDist)) {
      best = nodes[i];
      bestDist = dist;
    }
  }
  if (!best) return;
  if (best.classList.contains("point")) {
    selectNote(best.dataset.id, state.evidenceOpen);
    best.focus();
  } else best.focus();
}

document.addEventListener("click", function (event) {
  if (state.popover && !state.popover.contains(event.target) &&
      !event.target.closest("[data-action='timer-toggle'], [data-action='find-toggle'], [data-action='round-menu'], [data-action='note-menu'], [data-action='opening-menu']")) {
    dropMenu();
  }
  var trigger = event.target.closest("[data-action]");
  if (!trigger) {
    var point = event.target.closest(".point");
    if (point && state.round) selectNote(point.dataset.id, state.evidenceOpen);
    return;
  }
  event.preventDefault();
  var action = trigger.dataset.action;
  var id = trigger.dataset.id;
  if (trigger.closest(".sidebar") && window.innerWidth <= 899 && action !== "toggle-nav") state.navOpen = false;
  if (action === "home") go("index.html");
  else if (action === "new-round") openNewRound();
  else if (action === "open-round") openRound(id);
  else if (action === "show-help") go("help.html");
  else if (action === "show-settings") go("settings.html");
  else if (action === "show-openings") go("preflows.html");
  else if (action === "show-notes") {
    if (document.body.dataset.page !== "notes") go("notes.html");
  }
  else if (action === "case-pro") switchCase("pro");
  else if (action === "case-con") switchCase("con");
  else if (action === "toggle-nav") state.navOpen = !state.navOpen;
  else if (action === "close-nav") state.navOpen = false;
  else if (action === "jump-link") {
    if (document.body.dataset.page !== "workspace") {
      sessionStorage.setItem("jumpTo", id);
      go("workspace.html");
    } else {
      var contention = state.round.contentions[id];
      if (contention) contention.collapsed = false;
      buildFlow();
      var section = document.querySelector('.group[data-id="' + id + '"]');
      if (section) section.scrollIntoView({ block: "start" });
    }
  } else if (action === "add-group") {
    rememberBeforeChange();
    var created = addCont(state.round, activeCase());
    saveSoon(true);
    render();
    var added = document.querySelector('.group[data-id="' + created.id + '"]');
    if (added) added.scrollIntoView({ block: "start" });
  } else if (action === "undo") undo();
  else if (action === "redo") redo();
  else if (action === "find-toggle") openFind(trigger);
  else if (action === "find-next" || action === "find-prev") {
    if (state.findHits.length) {
      if (state.findAt < 0) state.findAt = 0;
      else if (action === "find-next") state.findAt = (state.findAt + 1) % state.findHits.length;
      else state.findAt = (state.findAt - 1 + state.findHits.length) % state.findHits.length;
      openHit(state.findHits[state.findAt]);
    }
  } else if (action === "columns-all") {
    state.round.columnFocus[activeCase()] = { count: null, start: 0 };
    dropMenu();
    saveSoon(true);
    render();
  } else if (action === "columns-left" || action === "columns-right") {
    var focus = state.round.columnFocus[activeCase()];
    var all = speechesOnSide(state.round, activeCase());
    var count = focus.count || all.length;
    focus.start = Math.max(0, (focus.start || 0) + (action === "columns-left" ? -1 : 1));
    if (focus.start + count > all.length) focus.start = all.length - count;
    saveSoon(true);
    render();
  } else if (action === "timer-toggle") openTimer(trigger);
  else if (action === "timer-start") {
    var timers = state.round.timers;
    if (timers.running && timers.mode === "speech") {
      timers.remainingMs = Math.max(0, timers.deadline - Date.now());
      timers.running = false;
      timers.deadline = null;
      timers.mode = null;
      saveSoon(true);
    } else kickClock("speech");
    openTimer(document.getElementById("timer-btn") || trigger);
  } else if (action === "timer-reset") {
    askConfirm("Reset this timer?", "This restores the full time for the current speech.", "Reset", function () {
      var activity = timerStepNow();
      state.round.timers.running = false;
      state.round.timers.mode = null;
      state.round.timers.deadline = null;
      state.round.timers.timeUp = false;
      var secs = state.round.timers.allotted && state.round.timers.allotted[activity.item.id];
      if (!secs) secs = activity.item.seconds || 0;
      state.round.timers.remainingMs = secs * 1000;
      saveSoon(true);
      updateTimerButton();
    });
  } else if (action === "timer-next") {
    var next = timerStepNow();
    if (state.round.timers.running) {
      state.round.timers.running = false;
      state.round.timers.deadline = null;
      state.round.timers.mode = null;
    }
    state.round.timers.index = Math.min(next.plan.length - 1, next.index + 1);
    var upcoming = next.plan[state.round.timers.index];
    state.round.timers.remainingMs = state.round.timers.allotted[upcoming.id] * 1000;
    state.round.timers.timeUp = false;
    saveSoon(true);
    updateTimerButton();
    dropMenu();
  } else if (action === "prep-toggle") {
    var side = trigger.dataset.side;
    var prep = state.round.timers;
    if (side !== "pro" && side !== "con") return;
    if (!prep || !prep.prepLeft) return;
    if (prep.running && prep.mode === "prep" && prep.prepSide === side) {
      prep.prepLeft[side] = Math.max(0, prep.deadline - Date.now());
      prep.running = false;
      prep.deadline = null;
      prep.mode = null;
      saveSoon(true);
    } else kickClock("prep", side);
    updateTimerButton();
    dropMenu();
  } else if (action === "prep-reset") {
    askConfirm("Reset prep time?", "Both teams go back to the full prep allowance.", "Reset", function () {
      var ms = (db.settings.durations.prep || 180) * 1000;
      state.round.timers.prepLeft.pro = ms;
      state.round.timers.prepLeft.con = ms;
      if (state.round.timers.mode === "prep") {
        state.round.timers.running = false;
        state.round.timers.mode = null;
        state.round.timers.deadline = null;
      }
      saveSoon(true);
      updateTimerButton();
    });
  } else if (action === "round-menu") anchorMenu(trigger, document.getElementById("round-menu"));
  else if (action === "opening-menu") anchorMenu(trigger, document.getElementById("opening-menu"));
  else if (action === "edit-details") { dropMenu(); openDetails(); }
  else if (action === "export") { dropMenu(); exportRound(state.round || db.rounds[id]); }
  else if (action === "export-round") exportRound(db.rounds[id]);
  else if (action === "print") { dropMenu(); unhide(document.getElementById("print-box")); }
  else if (action === "do-print") {
    closePopups();
    printSheets(document.getElementById("print-evidence").checked);
    setTimeout(function () { window.print(); }, 100);
  } else if (action === "save-opening") {
    dropMenu();
    var preflow = caseToOpening(state.round, activeCase(), state.round.title + " preflow");
    db.preflows[preflow.id] = preflow;
    writeSave(db);
    state.saveState = "Saved in this browser";
    updateSaveLabel();
  } else if (action === "rename-round") openRename(id);
  else if (action === "save-rename") {
    var renameId = document.getElementById("rename-box").dataset.id;
    var existing = db.rounds[renameId];
    existing.title = document.getElementById("rename-title").value.trim() || "Untitled round";
    existing.updatedAt = new Date().toISOString();
    writeSave(db);
    closePopups();
    render();
  } else if (action === "duplicate-round") {
    var copy = copyRound(db.rounds[id], db.settings);
    db.rounds[copy.id] = copy;
    writeSave(db);
    render();
  } else if (action === "delete-round") {
    askConfirm("Delete this round?", "This removes the round from this browser.", "Delete", function () {
      delete db.rounds[id];
      writeSave(db);
      render();
    });
  } else if (action === "delete-opening") {
    askConfirm("Delete this preflow?", "Rounds already created from it stay as they are.", "Delete", function () {
      delete db.preflows[id];
      writeSave(db);
      render();
    });
  } else if (action === "open-opening") openOpening(id);
  else if (action === "new-opening") {
    document.getElementById("preflow-title").value = "Untitled preflow";
    document.getElementById("preflow-topic").value = "";
    document.getElementById("preflow-side").value = "pro";
    unhide(document.getElementById("new-opening-box"));
  } else if (action === "make-opening") {
    var made = newOpening({
      title: document.getElementById("preflow-title").value.trim(),
      topic: document.getElementById("preflow-topic").value.trim(),
      side: document.getElementById("preflow-side").value
    });
    db.preflows[made.id] = made;
    writeSave(db);
    openOpening(made.id);
  } else if (action === "create-round") startRound();
  else if (action === "save-details") saveDetails();
  else if (action === "close-dialog") closePopups();
  else if (action === "fold-group") {
    state.round.contentions[id].collapsed = !state.round.contentions[id].collapsed;
    saveSoon(true);
    buildFlow();
    contJumps();
  } else if (action === "group-up") {
    rememberBeforeChange();
    bumpCont(state.round, id, -1);
    saveSoon(true);
    buildFlow();
    contJumps();
  } else if (action === "group-down") {
    rememberBeforeChange();
    bumpCont(state.round, id, 1);
    saveSoon(true);
    buildFlow();
    contJumps();
  } else if (action === "delete-group") {
    var caseSide = whoseCont(state.round, id);
    var nonempty = groupHasWords(state.round, id);
    var remove = function () {
      rememberBeforeChange();
      if (!cutCont(state.round, id)) return;
      saveSoon(true);
      render();
    };
    if (caseSide && state.round.cases[caseSide].contentionIds.length < 2) {
      askConfirm("Keep this contention", "A case needs a contention to hold the constructive. Add another one first if you want this name gone.", "OK", null);
    } else if (!nonempty) remove();
    else askConfirm("Delete this contention?", "All of its notes and evidence will be deleted. Undo can bring them back during this visit.", "Delete", remove);
  } else if (action === "note-menu") {
    state.selectedId = id;
    openPointMenu(trigger, id);
  } else if (action === "add-evidence") {
    state.selectedId = id;
    state.evidenceOpen = true;
    var shell = document.querySelector(".workspace");
    if (shell) shell.classList.add("proof-open");
    selectNote(id, true);
    setTimeout(function () {
      var body = document.querySelector('.proof-text[data-evidence="' + id + '"]');
      if (body) body.focus();
    }, 30);
  } else if (action === "close-btn") {
    state.evidenceOpen = false;
    var openShell = document.querySelector(".workspace");
    if (openShell) openShell.classList.remove("proof-open");
  } else if (action === "tour") startTour();
  else if (action === "tour-next") {
    state.tourStep += 1;
    if (state.tourStep === 3) state.caseSide = "pro";
    render();
  } else if (action === "tour-back") {
    state.tourStep -= 1;
    showTour();
  } else if (action === "tour-close") closeTour();
  else if (action === "save-settings") {
    var inputs = document.querySelectorAll("[data-preset]");
    var i;
    var parsed = [];
    var notes = [];
    var blocked = false;
    var result;
    var note = document.getElementById("clock-note");
    var sound = document.querySelector("[data-field='sound']");
    var saveErr;
    for (i = 0; i < inputs.length; i++) {
      result = pfClock(inputs[i].dataset.preset, inputs[i].value);
      parsed.push(result);
      if (!result.ok) blocked = true;
      if (result.message) notes.push(result.message);
    }
    if (blocked) {
      if (note) note.textContent = notes.join(" ");
      return;
    }
    for (i = 0; i < inputs.length; i++) {
      db.settings.durations[inputs[i].dataset.preset] = parsed[i].seconds;
      inputs[i].value = String(parsed[i].seconds);
    }
    if (sound) db.settings.sound = sound.checked;
    saveErr = writeSave(db);
    if (saveErr) {
      if (note) note.textContent = saveErr;
      return;
    }
    if (notes.length) {
      if (note) note.textContent = notes.join(" ");
      return;
    }
    window.location.href = "index.html";
  }
  if (action === "toggle-nav" || action === "close-nav" || trigger.closest(".sidebar")) updateSideMenu();
});

document.addEventListener("keydown", function (event) {
  if (state.tourStep >= 0 && event.key === "Escape") {
    closeTour();
    return;
  }
  var target = event.target;
  if (target.classList && target.classList.contains("point-input")) {
    if (event.key === "Enter" && !event.shiftKey && !state.composing && !event.isComposing) {
      event.preventDefault();
      splitNote(target);
    } else if (event.key === "Escape") {
      target.blur();
      var point = target.closest(".point");
      if (point) point.focus();
    } else if (event.key === "Tab") {
      event.preventDefault();
      var foundBoxes = document.querySelectorAll(".point, .reply-box, .new-box");
      var boxes = [];
      var b;
      for (b = 0; b < foundBoxes.length; b++) boxes.push(foundBoxes[b]);
      var index = boxes.indexOf(target.closest(".point"));
      var next = boxes[index + (event.shiftKey ? -1 : 1)];
      if (next) next.focus();
    }
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && target.tagName !== "TEXTAREA" && !target.isContentEditable) {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y" && target.tagName !== "TEXTAREA") {
    event.preventDefault();
    redo();
  } else if (target.classList && target.classList.contains("point") && !event.target.classList.contains("point-input")) {
    var pointId = target.dataset.id;
    if (event.key === "Enter") {
      var area = target.querySelector("textarea");
      if (area) area.focus();
    } else if (event.key.indexOf("Arrow") === 0) {
      event.preventDefault();
      moveWithArrows(pointId, event.key);
    }
  }
});

document.addEventListener("compositionstart", function () { state.composing = true; });
document.addEventListener("compositionend", function () { state.composing = false; });

document.addEventListener("input", function (event) {
  var target = event.target;
  if (target.dataset.field === "search-box") {
    state.query = target.value;
    listRounds();
    return;
  }
  if (!state.round) return;
  if (target.dataset.field === "title-input") {
    state.round.title = target.value;
    saveSoon(false);
    return;
  }
  if (target.dataset.field === "group-name") {
    beginTyping();
    state.round.contentions[target.dataset.id].name = target.value || "Contention";
    var jump = document.querySelector('.jump-link[data-id="' + target.dataset.id + '"] .link-name');
    if (jump) jump.textContent = target.value || "Contention";
    saveSoon(false);
    return;
  }
  if (target.dataset.field === "font-size") {
    db.settings.fontSize = Number(target.value);
    writeSave(db);
    var boxes = document.querySelectorAll(".point-input, .reply-box, .new-box");
    var i;
    for (i = 0; i < boxes.length; i++) boxes[i].style.fontSize = target.value + "px";
    measurePoints();
    placePoints();
    return;
  }
  if (target.classList.contains("point-input")) {
    beginTyping();
    state.round.notes[target.dataset.id].text = target.value;
    var slots = document.querySelectorAll('.reply-box[data-parent="' + target.dataset.id + '"]');
    var i;
    for (i = 0; i < slots.length; i++) slots[i].setAttribute("aria-label", "Response to " + (target.value || "point"));
    measurePoints();
    placePoints();
    saveSoon(false);
    return;
  }
  if (target.dataset.cross) {
    beginTyping();
    state.round.crossNotes[target.dataset.cross] = target.value;
    saveSoon(false);
    return;
  }
  if (target.dataset.slot && target.value) {
    typeReply(target, target.value);
    return;
  }
  if (target.dataset.starter && target.value) {
    typeNewPoint(target);
    return;
  }
  if (target.dataset.evidence || (target.classList && target.classList.contains("proof-text"))) {
    beginTyping();
    saveProof(target);
    saveSoon(false);
  }
});

document.addEventListener("paste", function (event) {
  var body = event.target.closest ? event.target.closest(".proof-text") : null;
  if (!body) return;
  event.preventDefault();
  var html = event.clipboardData.getData("text/html");
  var text = event.clipboardData.getData("text/plain");
  var cleaned = html ? cleanHtml(html) : { html: linesToHtml(text), plain: text, notice: "" };
  // one card, not the open-ev file. a giant paste is how the round stops saving halfway through elims.
  if ((cleaned.plain || "").length > 60000) {
    var cut = cleaned.plain.slice(0, 60000);
    cleaned = {
      html: linesToHtml(cut),
      plain: cut,
      notice: "Kept the first part of the paste. A full open-ev file won't fit in this browser — one card at a time."
    };
  }
  putHtmlHere(cleaned.html);
  beginTyping();
  saveProof(body, cleaned.notice);
  saveSoon(false);
});

document.addEventListener("focusout", function (event) {
  if (event.target.classList && event.target.classList.contains("proof-text")) {
    saveProof(event.target);
    saveSoon(false);
    state.history.typing = false;
  }
});

document.addEventListener("scroll", function (event) {
  if (event.target.id === "scroll-box" && state.round) state.round.scroll[activeCase()] = event.target.scrollTop;
}, true);

document.addEventListener("change", function (event) {
  var target = event.target;
  if (!target || !target.dataset || !state.round) return;
  if (target.dataset.field === "columns-count") {
    state.round.columnFocus[activeCase()].count = target.value === "all" ? null : Number(target.value);
    saveSoon(true);
    render();
  } else if (target.dataset.field === "columns-start") {
    state.round.columnFocus[activeCase()].start = Number(target.value);
    saveSoon(true);
    render();
  } else if (target.dataset.field === "font-size") {
    db.settings.fontSize = Number(target.value);
    writeSave(db);
  }
});

window.addEventListener("resize", function () {
  clearTimeout(state.resizeTimer);
  state.resizeTimer = setTimeout(function () {
    if (window.innerWidth > 899 && state.navOpen) {
      state.navOpen = false;
      updateSideMenu();
    }
    if (document.body.dataset.page === "workspace") buildFlow();
  }, 120);
});

setInterval(function () {
  if (!state.round || state.demo || state.round.isPreflow || !state.round.timers || !state.round.timers.running) return;
  var timers = state.round.timers;
  var left = timers.deadline - Date.now();
  if (left <= 0) {
    if (timers.mode === "prep") timers.prepLeft[timers.prepSide] = 0;
    else timers.remainingMs = 0;
    timers.running = false;
    timers.mode = null;
    timers.deadline = null;
    timers.timeUp = true;
    beep();
    saveSoon(true);
  }
  updateTimerButton();
}, 200);

function startApp() {
  state.view = document.body.dataset.page || "home";
  var ok = document.getElementById("confirm-ok");
  if (ok) ok.addEventListener("click", function () {
    var run = confirmRun;
    confirmRun = null;
    foldAway(document.getElementById("confirm-box"));
    if (run) run();
  });
  var icon = document.querySelector(".edit-mark");
  if (icon) icon.addEventListener("click", function () {
    var title = document.querySelector(".title-input");
    if (title) title.focus();
  });
  if ((state.view === "workspace" || state.view === "notes") && !loadOpenRound()) return;
  render();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp);
else startApp();
