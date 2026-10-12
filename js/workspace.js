function updateColumnControls() {
  if (!state.round || state.round.isPreflow) return;

  var caseSide = activeCase();
  var allSpeeches = getSpeechesForSide(state.round, caseSide);
  var focus = state.round.columnFocus[caseSide] || { count: null, start: 0 };

  var countSelect = document.querySelector("[data-field='columns-count']");
  if (countSelect) {
    countSelect.value = focus.count ? String(focus.count) : "all";
  }

  var startSelect = document.querySelector("[data-field='columns-start']");
  if (startSelect) {
    clearElement(startSelect);
    for (var i = 0; i < allSpeeches.length; i++) {
      var option = cloneTemplate("opt-sample");
      option.value = String(i);
      option.textContent = "Start at: " + getSpeechName(allSpeeches[i], false);
      if ((focus.start || 0) === i) {
        option.selected = true;
      }
      startSelect.appendChild(option);
    }
  }

  var view = getVisibleSpeeches(state.round, caseSide);
  var statusBanner = document.getElementById("column-bar");
  if (view.count < view.all.length) {
    showElement(statusBanner);
    var startNum = view.start + 1;
    var endNum = view.start + view.visible.length;
    document.getElementById("column-status-text").textContent = "Showing columns " + startNum + "–" + endNum + " of " + view.all.length;
    document.getElementById("status-left").disabled = (view.start === 0);
    document.getElementById("status-right").disabled = (view.start + view.visible.length >= view.all.length);
  } else {
    hideElement(statusBanner);
  }

  var leftBtn = document.querySelector("#column-tools [data-action='columns-left']");
  var rightBtn = document.querySelector("#column-tools [data-action='columns-right']");
  if (leftBtn) {
    leftBtn.disabled = ((focus.start || 0) === 0);
  }
  if (rightBtn) {
    rightBtn.disabled = ((focus.start || 0) + (focus.count || allSpeeches.length) >= allSpeeches.length);
  }
}

function renderWorkspace() {
  var workspaceShell = document.querySelector(".workspace");
  if (workspaceShell) {
    workspaceShell.classList.toggle("proof-open", state.evidenceOpen);
  }

  updateTopBarAndSidebar();
  updateColumnControls();
  buildFlowSheet();

  if (state.evidenceOpen) {
    renderEvidencePanel();
  }

  var scroller = document.getElementById("scroll-box");
  if (scroller) {
    scroller.scrollTop = state.round.scroll[activeCase()] || 0;
  }

  var jumpToId = sessionStorage.getItem("jumpTo");
  if (jumpToId) {
    sessionStorage.removeItem("jumpTo");
    var targetGroup = document.querySelector('.group[data-id="' + jumpToId + '"]');
    if (targetGroup) {
      targetGroup.scrollIntoView({ block: "start" });
    }
  }

  var focusNoteId = sessionStorage.getItem("focusNote");
  if (focusNoteId) {
    sessionStorage.removeItem("focusNote");
    state.selectedId = focusNoteId;
    var openEv = (sessionStorage.getItem("openEvidence") === "1");
    selectPointCard(focusNoteId, openEv);
    sessionStorage.removeItem("openEvidence");
    setTimeout(function () {
      focusPointInput(focusNoteId);
    }, 30);
  }
}

function buildFlowSheet() {
  var sheet = document.querySelector(".flow-paper");
  var scroller = document.getElementById("scroll-box");
  if (!sheet || !state.round) return;

  var caseSide = activeCase();
  var view = getVisibleSpeeches(state.round, caseSide);
  var paneWidthNum = scroller ? scroller.clientWidth : 800;
  var colWidth = calculateColumnWidth(paneWidthNum, view.visible.length);
  var paneWidthStr = paneWidthNum + "px";

  clearElement(sheet);

  var headerRow = cloneTemplate("head-row");
  var shortNames = { constructive: "Constr.", rebuttal: "Reb.", summary: "Sum.", final: "FF" };

  for (var i = 0; i < view.visible.length; i++) {
    var speechId = view.visible[i];
    var speechInfo = SPEECHES[speechId];
    var speechChip = cloneTemplate("speech-chip");

    speechChip.classList.add(speechInfo.team);
    speechChip.style.width = colWidth + "px";
    speechChip.querySelector(".speech-name").textContent = speechInfo.full;

    var orderNumber = view.all.indexOf(speechId) + 1;
    var kindName = shortNames[speechInfo.type] || speechInfo.short;
    speechChip.querySelector(".speech-number").textContent = orderNumber + ". " + kindName;

    var seconds = (db.settings.durations && db.settings.durations[speechInfo.type]) || 240;
    speechChip.querySelector(".speech-time").textContent = Math.round(seconds / 60) + " min";

    headerRow.appendChild(speechChip);
  }
  sheet.appendChild(headerRow);

  var contentionIds = state.round.cases[caseSide].contentionIds;
  for (var j = 0; j < contentionIds.length; j++) {
    var contentionObj = state.round.contentions[contentionIds[j]];
    if (contentionObj) {
      sheet.appendChild(renderContentionSection(contentionObj, caseSide, view, colWidth));
    }
  }

  var groupHeaders = sheet.querySelectorAll(".group-top");
  for (var h = 0; h < groupHeaders.length; h++) {
    groupHeaders[h].style.maxWidth = paneWidthStr;
  }

  measurePointHeights();
  applyPointPositions(colWidth);

  if (state.selectedId) {
    var selectedElement = document.querySelector('.point[data-id="' + state.selectedId + '"]');
    if (selectedElement) {
      selectedElement.classList.add("picked");
    }
  }
}

function renderContentionSection(contention, caseSide, view, width) {
  var section = cloneTemplate("cont-block");
  section.dataset.id = contention.id;

  var index = state.round.cases[caseSide].contentionIds.indexOf(contention.id);
  var safeIndex = (index >= 0) ? index : 0;
  var colorTone = CONTENTION_COLORS[safeIndex % CONTENTION_COLORS.length];

  var header = section.querySelector(".group-top");
  header.style.backgroundColor = colorTone.head;
  header.style.color = colorTone.ink;
  header.style.borderLeft = "4px solid " + colorTone.accent;
  section.querySelector(".group-dot").style.backgroundColor = colorTone.accent;

  var foldToggle = section.querySelector("[data-action='fold-group']");
  foldToggle.textContent = contention.collapsed ? "▸" : "▾";
  foldToggle.title = contention.collapsed ? "Expand contention" : "Collapse contention";

  var titleInput = section.querySelector(".group-name");
  titleInput.value = contention.name;
  titleInput.style.color = colorTone.ink;
  titleInput.dataset.id = contention.id;

  var buttons = section.querySelectorAll("[data-action]");
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].dataset.id = contention.id;
  }

  var rowGrid = section.querySelector(".group-row");
  if (contention.collapsed) {
    hideElement(rowGrid);
    return section;
  }

  var layout = calculateContentionLayout(state.round, contention, caseSide, state.heights);

  for (var s = 0; s < view.visible.length; s++) {
    var speechId = view.visible[s];
    var colElement = cloneTemplate("col-sample");
    colElement.style.width = width + "px";
    colElement.dataset.speech = speechId;

    var canvas = colElement.querySelector(".column-area");
    canvas.style.height = layout.height + "px";
    canvas.dataset.group = contention.id;
    canvas.dataset.speech = speechId;

    var noteIds = Object.keys(state.round.notes);
    for (var n = 0; n < noteIds.length; n++) {
      var note = state.round.notes[noteIds[n]];
      if (note.contentionId === contention.id && note.speechId === speechId && layout.positions[noteIds[n]]) {
        canvas.appendChild(renderPointCard(note));
      }
    }

    for (var sl = 0; sl < layout.slots.length; sl++) {
      var slot = layout.slots[sl];
      if (slot.speechId !== speechId) continue;
      var parentNote = state.round.notes[slot.parentId];
      if (!parentNote || parentNote.contentionId !== contention.id) continue;

      var slotBox = cloneTemplate("ans-slot");
      slotBox.style.fontSize = textSize() + "px";
      slotBox.setAttribute("aria-label", "Response to " + (parentNote.text || "point"));
      slotBox.dataset.parent = slot.parentId;
      slotBox.dataset.speech = speechId;
      canvas.appendChild(slotBox);
    }

    var starterBox = colElement.querySelector(".new-box");
    starterBox.style.fontSize = textSize() + "px";
    starterBox.dataset.starter = contention.id;
    starterBox.dataset.speech = speechId;
    starterBox.setAttribute("aria-label", "New point in " + getSpeechName(speechId, true));

    rowGrid.appendChild(colElement);
  }

  return section;
}

function renderPointCard(note) {
  var box = cloneTemplate("card-sample");
  box.dataset.id = note.id;

  if (note.id === state.selectedId) {
    box.classList.add("picked");
  }

  var marker = box.querySelector(".point-tag");
  if (note.marker) {
    marker.textContent = getMarkerLabel(note.marker);
    marker.className = "point-tag" + (note.marker ? " tag-" + note.marker : "");
    showElement(marker);
  } else {
    hideElement(marker);
  }

  var area = box.querySelector(".point-input");
  area.style.fontSize = textSize() + "px";
  area.value = note.text;
  area.dataset.id = note.id;
  area.setAttribute("aria-label", getSpeechName(note.speechId, true) + " point");

  if (!document.querySelector("[data-tour='point']")) {
    area.dataset.tour = "point";
  }

  var clipBtn = box.querySelector(".clip-btn");
  clipBtn.dataset.id = note.id;

  if (note.evidenceId) {
    clipBtn.classList.add("has-proof");
    clipBtn.setAttribute("aria-label", "Open evidence");
    showElement(clipBtn.querySelector(".clip-number"));
  } else {
    clipBtn.setAttribute("aria-label", "Add evidence");
    hideElement(clipBtn.querySelector(".clip-number"));
  }

  if (!document.querySelector("[data-tour='clip-btn']")) {
    clipBtn.dataset.tour = "clip-btn";
  }

  box.querySelector(".point-menu").dataset.id = note.id;
  return box;
}

function measurePointHeights() {
  var areas = document.querySelectorAll("textarea.point-input");
  for (var i = 0; i < areas.length; i++) {
    var area = areas[i];
    area.style.height = "auto";
    var textHeight = Math.max(24, area.scrollHeight);
    area.style.height = textHeight + "px";

    var parentBox = area.parentElement;
    parentBox.style.height = "auto";
    var boxHeight = Math.max(44, parentBox.scrollHeight);
    state.heights[area.dataset.id] = boxHeight;
    parentBox.style.height = boxHeight + "px";
  }
}

function applyPointPositions(width) {
  var caseSide = activeCase();
  var view = getVisibleSpeeches(state.round, caseSide);

  if (!width) {
    var scroller = document.getElementById("scroll-box");
    width = calculateColumnWidth(scroller ? scroller.clientWidth : 800, view.visible.length);
  }

  var contentionIds = state.round.cases[caseSide].contentionIds;
  for (var i = 0; i < contentionIds.length; i++) {
    var contention = state.round.contentions[contentionIds[i]];
    if (!contention || contention.collapsed) continue;

    var layout = calculateContentionLayout(state.round, contention, caseSide, state.heights);
    var canvases = document.querySelectorAll('.column-area[data-group="' + contentionIds[i] + '"]');
    for (var c = 0; c < canvases.length; c++) {
      canvases[c].style.height = layout.height + "px";
    }

    var posKeys = Object.keys(layout.positions);
    for (var p = 0; p < posKeys.length; p++) {
      if (posKeys[p] === "_threads") continue;
      var pointElement = document.querySelector('.point[data-id="' + posKeys[p] + '"]');
      if (pointElement) {
        pointElement.style.top = layout.positions[posKeys[p]].top + "px";
        pointElement.style.height = layout.positions[posKeys[p]].height + "px";
      }
    }

    for (var s = 0; s < layout.slots.length; s++) {
      var slot = layout.slots[s];
      var slotElement = document.querySelector('.reply-box[data-parent="' + slot.parentId + '"][data-speech="' + slot.speechId + '"]');
      if (slotElement) {
        slotElement.style.top = slot.top + "px";
      }
    }
  }
}

function renderEvidencePanel() {
  var list = document.querySelector(".proof-list");
  var crumb = document.querySelector(".proof-path");
  if (!list || !state.round) return;

  var selected = state.round.notes[state.selectedId];
  clearElement(list);

  if (!selected) {
    hideElement(crumb);
    var emptyTemplate = document.getElementById("ev-empty");
    if (emptyTemplate) {
      list.appendChild(cloneTemplate("ev-empty"));
    }
    return;
  }

  showElement(crumb);
  var contention = state.round.contentions[selected.contentionId];
  var summaryText = (selected.text || "Point").split("\n")[0];
  if (summaryText.length > 25) {
    summaryText = summaryText.slice(0, 25) + "...";
  }

  document.getElementById("crumb-contention").textContent = contention ? contention.name : "Contention";
  document.getElementById("crumb-point").textContent = summaryText;

  var allNotes = getEvidencePointsList(selected.contentionId, activeCase());
  var found = false;

  for (var i = 0; i < allNotes.length; i++) {
    var hasProof = allNotes[i].evidenceId && state.round.evidence[allNotes[i].evidenceId] && state.round.evidence[allNotes[i].evidenceId].plain;
    if (!hasProof && allNotes[i].id !== selected.id) {
      continue;
    }
    found = true;
    list.appendChild(renderEvidenceCard(allNotes[i], allNotes[i].id === selected.id));
  }

  if (!found) {
    list.appendChild(renderEvidenceCard(selected, true));
  }

  var currentCard = list.querySelector(".current");
  if (currentCard) {
    list.scrollTop = Math.max(0, currentCard.offsetTop - 12);
  }
}

function getEvidencePointsList(contentionId, caseSide) {
  var contention = state.round.contentions[contentionId];
  var ordered = [];

  function walk(note) {
    ordered.push(note);
    var later = getSpeechesAfter(state.round, caseSide, note.speechId);
    for (var i = 0; i < later.length; i++) {
      var replies = getRepliesInColumn(state.round, note.id, later[i]);
      for (var r = 0; r < replies.length; r++) {
        walk(replies[r]);
      }
    }
  }

  for (var j = 0; j < contention.startingPointIds.length; j++) {
    var startNote = state.round.notes[contention.startingPointIds[j]];
    if (startNote) {
      walk(startNote);
    }
  }
  return ordered;
}

function renderEvidenceCard(note, current) {
  var card = cloneTemplate("ev-card");
  if (current) {
    card.classList.add("current");
  }

  var firstLine = (note.text || "Empty point").split("\n")[0];
  card.querySelector(".proof-place").textContent = firstLine + " · " + getSpeechName(note.speechId, true);

  var body = card.querySelector(".proof-text");
  body.dataset.evidence = note.id;

  var stored = note.evidenceId && state.round.evidence[note.evidenceId];
  if (stored) {
    body.innerHTML = cleanPastedHtml(stored.html).html;
  }

  if (!document.querySelector("[data-tour='proof-panel']")) {
    body.dataset.tour = "proof-panel";
  }

  var notice = card.querySelector(".proof-note");
  notice.dataset.notice = note.id;
  notice.textContent = (stored && stored.notice) ? stored.notice : "";

  return card;
}

function selectPointCard(id, openEvidence) {
  var points = document.querySelectorAll(".point");
  state.selectedId = id;

  for (var i = 0; i < points.length; i++) {
    points[i].classList.toggle("picked", points[i].dataset.id === id);
  }

  if (openEvidence) {
    state.evidenceOpen = true;
  }

  if (state.evidenceOpen) {
    var shell = document.querySelector(".workspace");
    if (shell) {
      shell.classList.add("proof-open");
    }
    renderEvidencePanel();
  }
}

function focusPointInput(id, caret) {
  var area = document.querySelector('textarea.point-input[data-id="' + id + '"]');
  if (!area) return;
  area.focus();
  var spot = (typeof caret === "number") ? caret : area.value.length;
  area.setSelectionRange(spot, spot);
}

function createReplyFromInput(slot, text) {
  rememberBeforeChange();
  var note = addReplyPoint(state.round, slot.dataset.parent, slot.dataset.speech, text || "");
  saveSoon(true);
  state.selectedId = note.id;
  buildFlowSheet();
  focusPointInput(note.id, text ? text.length : 0);
}

function createNewPointFromInput(starter) {
  var text = starter.value;
  var speech = starter.dataset.speech;
  if (!text) return;

  if (state.round.isPreflow && speech !== state.round.preflowSide + "-constructive") {
    return;
  }

  rememberBeforeChange();
  var note = addMainPoint(state.round, starter.dataset.starter, starter.dataset.speech, text);
  starter.value = "";
  saveSoon(true);
  state.selectedId = note.id;
  buildFlowSheet();
  focusPointInput(note.id, text.length);
}

function splitPointOnEnter(area) {
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

  var created;
  if (note.parentId) {
    created = addReplyPoint(state.round, note.parentId, note.speechId, after, note.id);
  } else {
    created = addMainPoint(state.round, note.contentionId, note.speechId, after, note.id);
  }

  saveSoon(true);
  state.selectedId = created.id;
  buildFlowSheet();
  focusPointInput(created.id, 0);
}

function saveEvidenceText(body, pasteNotice) {
  var note = state.round.notes[body.dataset.evidence];
  if (!note) return;

  var cleaned = cleanPastedHtml(body.innerHTML);
  var previousNotice = (note.evidenceId && state.round.evidence[note.evidenceId]) ? state.round.evidence[note.evidenceId].notice : "";
  var shownNotice = pasteNotice || cleaned.notice || previousNotice || "";

  var noticeElement = document.querySelector('[data-notice="' + note.id + '"]');
  if (noticeElement) {
    noticeElement.textContent = shownNotice;
  }

  if (!cleaned.plain.trim()) {
    if (note.evidenceId) {
      delete state.round.evidence[note.evidenceId];
    }
    note.evidenceId = null;
    return;
  }

  if (!note.evidenceId || !state.round.evidence[note.evidenceId]) {
    note.evidenceId = createUniqueId("ev");
    state.round.evidence[note.evidenceId] = {
      id: note.evidenceId,
      noteId: note.id,
      html: "",
      plain: "",
      notice: ""
    };
  }

  var record = state.round.evidence[note.evidenceId];
  record.html = cleaned.html;
  record.plain = cleaned.plain;
  record.notice = shownNotice;
  record.noteId = note.id;
}

function searchWordsInRound() {
  var query = state.findText.trim().toLowerCase();
  var hits = [];
  if (!query || !state.round) return hits;

  var noteIds = Object.keys(state.round.notes);
  for (var i = 0; i < noteIds.length; i++) {
    var note = state.round.notes[noteIds[i]];
    if ((note.text || "").toLowerCase().indexOf(query) !== -1) {
      hits.push({ noteId: noteIds[i], evidence: false });
    }
    if (note.evidenceId && state.round.evidence[note.evidenceId] && (state.round.evidence[note.evidenceId].plain || "").toLowerCase().indexOf(query) !== -1) {
      hits.push({ noteId: noteIds[i], evidence: true });
    }
  }

  var crossKeys = Object.keys(state.round.crossNotes || {});
  for (var j = 0; j < crossKeys.length; j++) {
    if ((state.round.crossNotes[crossKeys[j]] || "").toLowerCase().indexOf(query) !== -1) {
      hits.push({ cross: crossKeys[j] });
    }
  }
  return hits;
}

function goToSearchResult(hit) {
  if (!hit) return;
  closeDropdownMenu();

  if (hit.cross) {
    sessionStorage.setItem("focusCross", hit.cross);
    go("notes.html");
    return;
  }

  var note = state.round.notes[hit.noteId];
  state.caseSide = getContentionSide(state.round, note.contentionId) || state.caseSide;
  state.round.columnFocus[state.caseSide] = { count: null, start: 0 };
  state.round.contentions[note.contentionId].collapsed = false;
  state.selectedId = note.id;

  if (hit.evidence) {
    state.evidenceOpen = true;
  }

  render();
  setTimeout(function () {
    focusPointInput(note.id);
  }, 30);
}

function renderSearchResults() {
  var results = document.getElementById("find-hits");
  if (!results) return;

  state.findHits = searchWordsInRound();
  state.findAt = -1;
  clearElement(results);

  for (var i = 0; i < state.findHits.length; i++) {
    var button = cloneTemplate("menu-btn-sample");
    var label;
    if (state.findHits[i].cross) {
      label = "Notes";
    } else {
      var noteObj = state.round.notes[state.findHits[i].noteId];
      label = (noteObj.text || "Evidence").split("\n")[0];
    }
    button.textContent = label;
    button.dataset.hit = String(i);
    results.appendChild(button);
  }

  results.onclick = function (event) {
    var picked = event.target.closest("button");
    if (!picked || picked.dataset.hit === undefined) return;
    state.findAt = Number(picked.dataset.hit);
    goToSearchResult(state.findHits[state.findAt]);
  };
}

function openSearchModal(anchor) {
  var box = document.getElementById("find-popover");
  var input = document.getElementById("find-input");
  input.value = state.findText;
  showDropdownMenu(anchor, box);
  renderSearchResults();
  input.focus();
}

function openTimerModal(anchor) {
  if (!state.round || state.round.isPreflow) return;
  var timers = state.round.timers;
  var activity = getCurrentTimerStep();

  document.getElementById("timer-activity").textContent = activity.item.label;

  var clockTime = (timers.running && timers.mode === "speech") ? formatSecondsToClock(timers.deadline - Date.now()) : formatSecondsToClock(timers.remainingMs);
  document.getElementById("popover-clock").textContent = clockTime;
  document.getElementById("timer-start-btn").textContent = (timers.running && timers.mode === "speech") ? "Pause" : "Start";

  document.getElementById("prep-pro-label").textContent = "Pro " + formatSecondsToClock(timers.prepLeft.pro);
  document.getElementById("prep-con-label").textContent = "Con " + formatSecondsToClock(timers.prepLeft.con);
  document.getElementById("prep-pro-btn").textContent = (timers.running && timers.mode === "prep" && timers.prepSide === "pro") ? "Pause" : "Start";
  document.getElementById("prep-con-btn").textContent = (timers.running && timers.mode === "prep" && timers.prepSide === "con") ? "Pause" : "Start";

  showDropdownMenu(anchor, document.getElementById("timer-popover"));
}

function handleMarkerClick(note, markerId) {
  return function () {
    var warn = getMarkerWarning(state.round, note, markerId);
    var apply = function () {
      rememberBeforeChange();
      note.marker = markerId;
      saveSoon(true);
      buildFlowSheet();
    };
    if (!warn) {
      apply();
      return;
    }
    askConfirm("Label this card?", warn, "Add label", apply);
  };
}

function openPointActionsMenu(anchor, noteId) {
  var note = state.round.notes[noteId];
  var menu = document.getElementById("note-menu");
  clearElement(menu);

  function addItem(label, run) {
    var button = cloneTemplate("menu-btn-sample");
    button.textContent = label;
    button.addEventListener("click", function () {
      closeDropdownMenu();
      run();
    });
    menu.appendChild(button);
  }

  addItem("Insert point below", function () {
    var area = document.querySelector('textarea.point-input[data-id="' + noteId + '"]');
    if (!area) return;
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
    splitPointOnEnter(area);
  });

  addItem("Link response", function () {
    openLinkReplyMenu(anchor, note);
  });

  addItem("Move up", function () {
    rememberBeforeChange();
    movePointOrder(state.round, noteId, -1);
    saveSoon(true);
    buildFlowSheet();
  });

  addItem("Move down", function () {
    rememberBeforeChange();
    movePointOrder(state.round, noteId, 1);
    saveSoon(true);
    buildFlowSheet();
  });

  addItem("Duplicate", function () {
    rememberBeforeChange();
    var copy = duplicatePoint(state.round, noteId);
    state.selectedId = copy.id;
    saveSoon(true);
    buildFlowSheet();
    focusPointInput(copy.id);
  });

  addItem("Delete", function () {
    confirmDeletePoint(note);
  });

  for (var m = 0; m < MARKERS.length; m++) {
    addItem("Marker: " + MARKERS[m].label, handleMarkerClick(note, MARKERS[m].id));
  }

  showDropdownMenu(anchor, menu);
}

function openLinkReplyMenu(anchor, note) {
  var caseSide = getContentionSide(state.round, note.contentionId);
  var speeches = getSpeechesForSide(state.round, caseSide);
  var limit = speeches.indexOf(note.speechId);
  var blocked = getAllChildPoints(state.round, note.id, []);

  var menu = document.getElementById("link-menu");
  var choicesBox = document.getElementById("link-choices");
  var intro = menu.querySelector(".gray-text");
  var allNotes = objectValuesToList(state.round.notes);
  var choices = [];

  clearElement(choicesBox);

  for (var i = 0; i < allNotes.length; i++) {
    var candidate = allNotes[i];
    if (candidate.contentionId === note.contentionId &&
        speeches.indexOf(candidate.speechId) > -1 &&
        speeches.indexOf(candidate.speechId) < limit &&
        blocked.indexOf(candidate.id) === -1) {
      choices.push(candidate);
    }
  }

  intro.textContent = choices.length ? "Link this point to an earlier note" : "No earlier point in this contention.";

  for (var j = 0; j < choices.length; j++) {
    var button = cloneTemplate("menu-btn-sample");
    var speechShort = getSpeechName(choices[j].speechId, false);
    var firstWords = (choices[j].text || "Empty point").split("\n")[0];
    button.textContent = speechShort + ": " + firstWords;
    button.dataset.link = choices[j].id;
    choicesBox.appendChild(button);
  }

  choicesBox.onclick = function (event) {
    var picked = event.target.closest("button");
    if (!picked || !picked.dataset.link) return;
    var reason = checkIfCanLinkPoints(state.round, note.id, picked.dataset.link);
    if (reason) {
      intro.textContent = reason;
      return;
    }
    rememberBeforeChange();
    linkPointToParent(state.round, note.id, picked.dataset.link);
    closeDropdownMenu();
    saveSoon(true);
    buildFlowSheet();
  };

  showDropdownMenu(anchor, menu);
}

function confirmDeletePoint(note) {
  var noteIds = Object.keys(state.round.notes);
  var children = [];
  for (var i = 0; i < noteIds.length; i++) {
    if (state.round.notes[noteIds[i]].parentId === note.id) {
      children.push(noteIds[i]);
    }
  }

  var executeDelete = function () {
    rememberBeforeChange();
    if (state.selectedId === note.id) {
      state.selectedId = null;
    }
    deletePoint(state.round, note.id);
    saveSoon(true);
    buildFlowSheet();
    renderEvidencePanel();
  };

  if (!note.text && !note.evidenceId && children.length === 0) {
    executeDelete();
    return;
  }

  var confirmMessage = children.length
    ? "This removes the point and its evidence. Responses stay, with their text and evidence unchanged."
    : "This removes the point and its evidence.";

  askConfirm("Delete this point?", confirmMessage, "Delete", executeDelete);
}

function switchDebateSide(side) {
  if (!state.round || state.round.isPreflow) return;
  if (state.caseSide === side) return;

  saveTypedWords();
  var scroller = document.getElementById("scroll-box");
  if (scroller) {
    state.round.scroll[state.caseSide] = scroller.scrollTop;
  }

  state.caseSide = side;
  state.selectedId = null;
  state.evidenceOpen = false;
  saveSoon(true);
  render();
}

function renderTourStep() {
  var highlightedElements = document.querySelectorAll(".highlight");
  for (var h = 0; h < highlightedElements.length; h++) {
    highlightedElements[h].classList.remove("highlight");
  }

  if (state.tourStep < 0 || state.tourStep >= TOUR.length) return;

  var step = TOUR[state.tourStep];
  var needsMenu = window.innerWidth <= 899 && (step.target.indexOf("cases") !== -1 || step.target.indexOf("notes") !== -1 || step.target.indexOf("jumps") !== -1);
  state.navOpen = needsMenu;
  updateSideMenu();

  if (state.tourStep === 5) {
    var notes = objectValuesToList(state.round.notes);
    var withEvidence = null;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].evidenceId) {
        withEvidence = notes[i];
        break;
      }
    }
    if (withEvidence) {
      state.selectedId = withEvidence.id;
      state.evidenceOpen = true;
      var shell = document.querySelector(".workspace");
      if (shell) {
        shell.classList.add("proof-open");
      }
      renderEvidencePanel();
    }
  }

  var targetElement = document.querySelector(step.target);
  if (targetElement) {
    targetElement.classList.add("highlight");
    if (targetElement.scrollIntoView) {
      targetElement.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  document.getElementById("tour-step").textContent = "Step " + (state.tourStep + 1) + " of " + TOUR.length;
  document.getElementById("tour-text").textContent = step.text;

  if (state.tourStep > 0) {
    showElement(document.getElementById("tour-back"));
  } else {
    hideElement(document.getElementById("tour-back"));
  }

  if (state.tourStep < TOUR.length - 1) {
    showElement(document.getElementById("tour-next"));
  } else {
    hideElement(document.getElementById("tour-next"));
  }

  showElement(document.getElementById("tour"));
  sessionStorage.setItem("tourStep", String(state.tourStep));
}

function startFeatureTour() {
  if (!state.demo && state.round && !state.round.isPreflow) {
    sessionStorage.setItem("tourReturn", state.round.id);
  } else {
    sessionStorage.setItem("tourReturn", "");
  }

  var demo = createDemoRound();
  sessionStorage.setItem("tourDemo", "1");
  sessionStorage.setItem("tourStep", "0");
  sessionStorage.setItem("tourRound", JSON.stringify(demo));
  sessionStorage.setItem("caseSide", "pro");

  state.demo = true;
  state.round = demo;
  state.caseSide = "pro";
  state.view = "workspace";
  state.evidenceOpen = false;
  state.selectedId = null;
  state.tourStep = 0;
  resetHistory();
  render();
}

function closeFeatureTour() {
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

function createDemoRound() {
  var round = createNewRound({
    title: "Feature tour",
    topic: "Schools should provide free lunches.",
    yourSide: "pro",
    firstSide: "pro"
  }, db.settings);

  var proId = round.cases.pro.contentionIds[0];
  round.contentions[proId].name = "Student need";

  var attendance = addMainPoint(round, proId, "pro-constructive", "Attendance improves");
  addMainPoint(round, proId, "pro-constructive", "Nutrition supports learning");

  var transport = addReplyPoint(round, attendance.id, "con-rebuttal", "Transport matters more");
  addReplyPoint(round, attendance.id, "con-rebuttal", "Study is small");
  addReplyPoint(round, transport.id, "pro-summary", "Lunch removes another barrier");

  transport.evidenceId = createUniqueId("ev");
  round.evidence[transport.evidenceId] = {
    id: transport.evidenceId,
    noteId: transport.id,
    html: "Example paste: students missed fewer days when lunch was available at school.",
    plain: "Example paste: students missed fewer days when lunch was available at school."
  };

  var conId = round.cases.con.contentionIds[0];
  round.contentions[conId].name = "Cost";
  addMainPoint(round, conId, "con-constructive", "Budgets are already tight");
  return round;
}

function openEditRoundDetails() {
  var round = state.round;
  document.getElementById("edit-title").value = round.title;
  document.getElementById("edit-topic").value = round.topic || "";
  document.getElementById("edit-tournament").value = round.tournament || "";
  document.getElementById("edit-round-label").value = round.roundLabel || "";
  document.getElementById("edit-opponent").value = round.opponent || "";
  document.getElementById("edit-side").value = round.yourSide;

  var locked = checkIfRoundHasContent(round);
  document.getElementById("edit-lock-note").textContent = locked
    ? "Who speaks first is locked because notes already follow this order. Start a new round for a different order."
    : "Who speaks first sets the speech order.";

  var firstWrap = document.getElementById("edit-first-wrap");
  if (locked) {
    hideElement(firstWrap);
  } else {
    showElement(firstWrap);
    document.getElementById("edit-first").value = round.firstSide;
  }
  showElement(document.getElementById("edit-box"));
}

function saveEditRoundDetails() {
  var round = state.round;
  var locked = checkIfRoundHasContent(round);

  round.title = document.getElementById("edit-title").value.trim() || "Untitled round";
  round.topic = document.getElementById("edit-topic").value.trim();
  round.tournament = document.getElementById("edit-tournament").value.trim();
  round.roundLabel = document.getElementById("edit-round-label").value.trim();
  round.opponent = document.getElementById("edit-opponent").value.trim();

  var side = document.getElementById("edit-side").value;
  if (side !== "pro" && side !== "con" && side !== "observer") {
    side = "pro";
  }
  round.yourSide = side;

  if (!locked) {
    var first = document.getElementById("edit-first").value;
    if (first !== "con") first = "pro";
    round.firstSide = first;
    round.timers = createNewTimer(round.firstSide, db.settings.durations);
  }

  closePopups();
  saveSoon(true);
  render();
}

function preparePrintLayout(includeEvidence) {
  var round = state.round;
  document.getElementById("print-title").textContent = round.title || "Debate Round";
  setElementText(document.getElementById("print-topic"), round.topic ? "Topic / Resolution: " + round.topic : "");

  var metaLine = joinNonEmptyText([
    round.tournament ? "Tournament: " + round.tournament : "",
    round.roundLabel ? "Round: " + round.roundLabel : "",
    round.opponent ? "vs " + round.opponent : "",
    "Your Side: " + formatSideName(round.yourSide),
    round.firstSide ? formatSideName(round.firstSide) + " speaks first" : ""
  ], "   |   ");
  setElementText(document.getElementById("print-meta"), metaLine);

  var body = document.getElementById("print-body");
  clearElement(body);

  var sides = ["pro", "con"];
  for (var sideIndex = 0; sideIndex < sides.length; sideIndex++) {
    var caseSide = sides[sideIndex];
    var section = cloneTemplate("print-case-sample");
    if (sideIndex === 1) {
      section.classList.add("new-page");
    }
    section.querySelector(".print-case-name").textContent = (caseSide === "pro" ? "PRO CASE" : "CON CASE") + " FLOW";

    var speeches = getSpeechesForSide(round, caseSide);
    var groupIds = round.cases[caseSide].contentionIds;

    for (var g = 0; g < groupIds.length; g++) {
      var contention = round.contentions[groupIds[g]];
      if (!contention) continue;

      var block = cloneTemplate("print-cont");
      block.querySelector(".print-group-name").textContent = contention.name;
      var headRow = block.querySelector("thead tr");

      for (var s = 0; s < speeches.length; s++) {
        var th = cloneTemplate("print-th");
        th.textContent = SPEECHES[speeches[s]].short;
        th.classList.add(SPEECHES[speeches[s]].team);
        headRow.appendChild(th);
      }

      var tbody = block.querySelector("tbody");
      for (var p = 0; p < contention.startingPointIds.length; p++) {
        var startId = contention.startingPointIds[p];
        var family = getAllChildPoints(round, startId, []);
        var tr = cloneTemplate("print-tr");

        for (var sp = 0; sp < speeches.length; sp++) {
          var td = cloneTemplate("print-td");
          var noteList = objectValuesToList(round.notes);

          for (var n = 0; n < noteList.length; n++) {
            var item = noteList[n];
            if (item.contentionId !== groupIds[g] || item.speechId !== speeches[sp]) continue;
            if (family.indexOf(item.id) === -1) continue;

            var card = cloneTemplate("print-card");
            var marker = card.querySelector(".print-tag");
            if (item.marker) {
              marker.textContent = getMarkerLabel(item.marker);
            } else {
              hideElement(marker);
            }
            card.querySelector(".print-words").textContent = item.text || "";

            var evBox = card.querySelector(".print-proof");
            if (includeEvidence && item.evidenceId && round.evidence[item.evidenceId]) {
              evBox.textContent = "Proof: " + (round.evidence[item.evidenceId].plain || "");
            } else {
              hideElement(evBox);
            }
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

  var extra = cloneTemplate("print-cx");
  extra.classList.add("new-page");
  var extraNotes = [
    ["First Crossfire", round.crossNotes.firstCrossfire],
    ["Second Crossfire", round.crossNotes.secondCrossfire],
    ["Grand Crossfire", round.crossNotes.grandCrossfire],
    ["Reflections & Decision", round.crossNotes.reflections]
  ];

  for (var e = 0; e < extraNotes.length; e++) {
    if (extraNotes[e][1] && extraNotes[e][1].trim()) {
      var cxCard = cloneTemplate("print-cx-card");
      cxCard.querySelector(".print-note-name").textContent = extraNotes[e][0];
      cxCard.querySelector(".print-note-words").textContent = extraNotes[e][1];
      extra.appendChild(cxCard);
    }
  }
  body.appendChild(extra);
}

function navigatePointsWithArrows(id, key) {
  var current = document.querySelector('.point[data-id="' + id + '"]');
  if (!current) return;

  var rect = current.getBoundingClientRect();
  var nodes = document.querySelectorAll(".point, .reply-box");
  var best = null;
  var bestDist = -1;

  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] === current) continue;
    var box = nodes[i].getBoundingClientRect();
    var dx = box.left - rect.left;
    var dy = box.top - rect.top;
    var ok = (key === "ArrowRight" && dx > 20) ||
             (key === "ArrowLeft" && dx < -20) ||
             (key === "ArrowDown" && dy > 8 && Math.abs(dx) < 40) ||
             (key === "ArrowUp" && dy < -8 && Math.abs(dx) < 40);

    var dist = Math.abs(dx) + Math.abs(dy);
    if (ok && (bestDist < 0 || dist < bestDist)) {
      best = nodes[i];
      bestDist = dist;
    }
  }

  if (!best) return;

  if (best.classList.contains("point")) {
    selectPointCard(best.dataset.id, state.evidenceOpen);
    best.focus();
  } else {
    best.focus();
  }
}

window.renderCurrentPage = function () {
  renderWorkspace();
  if (state.tourStep >= 0) {
    renderTourStep();
  }
};

document.addEventListener("click", function (event) {
  var trigger = event.target.closest("[data-action]");
  if (!trigger) {
    var point = event.target.closest(".point");
    if (point && state.round) {
      selectPointCard(point.dataset.id, state.evidenceOpen);
    }
    return;
  }

  var action = trigger.dataset.action;
  var id = trigger.dataset.id;

  if (action === "case-pro") {
    switchDebateSide("pro");
  } else if (action === "case-con") {
    switchDebateSide("con");
  } else if (action === "jump-link") {
    var contention = state.round.contentions[id];
    if (contention) {
      contention.collapsed = false;
    }
    buildFlowSheet();
    var section = document.querySelector('.group[data-id="' + id + '"]');
    if (section) {
      section.scrollIntoView({ block: "start" });
    }
  } else if (action === "add-group") {
    rememberBeforeChange();
    var created = addContention(state.round, activeCase());
    saveSoon(true);
    render();
    var added = document.querySelector('.group[data-id="' + created.id + '"]');
    if (added) {
      added.scrollIntoView({ block: "start" });
    }
  } else if (action === "undo") {
    undo();
  } else if (action === "redo") {
    redo();
  } else if (action === "find-toggle") {
    openSearchModal(trigger);
  } else if (action === "find-next" || action === "find-prev") {
    if (state.findHits.length) {
      if (state.findAt < 0) {
        state.findAt = 0;
      } else if (action === "find-next") {
        state.findAt = (state.findAt + 1) % state.findHits.length;
      } else {
        state.findAt = (state.findAt - 1 + state.findHits.length) % state.findHits.length;
      }
      goToSearchResult(state.findHits[state.findAt]);
    }
  } else if (action === "columns-all") {
    state.round.columnFocus[activeCase()] = { count: null, start: 0 };
    closeDropdownMenu();
    saveSoon(true);
    render();
  } else if (action === "columns-left" || action === "columns-right") {
    var focus = state.round.columnFocus[activeCase()];
    var all = getSpeechesForSide(state.round, activeCase());
    var count = focus.count || all.length;
    var shift = (action === "columns-left") ? -1 : 1;
    focus.start = Math.max(0, (focus.start || 0) + shift);
    if (focus.start + count > all.length) {
      focus.start = all.length - count;
    }
    saveSoon(true);
    render();
  } else if (action === "timer-toggle") {
    openTimerModal(trigger);
  } else if (action === "timer-start") {
    var timers = state.round.timers;
    if (timers.running && timers.mode === "speech") {
      timers.remainingMs = Math.max(0, timers.deadline - Date.now());
      timers.running = false;
      timers.deadline = null;
      timers.mode = null;
      saveSoon(true);
    } else {
      startTimer("speech");
    }
    openTimerModal(document.getElementById("timer-btn") || trigger);
  } else if (action === "timer-reset") {
    askConfirm("Reset this timer?", "This restores the full time for the current speech.", "Reset", function () {
      var activity = getCurrentTimerStep();
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
    var next = getCurrentTimerStep();
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
    closeDropdownMenu();
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
    } else {
      startTimer("prep", side);
    }
    updateTimerButton();
    closeDropdownMenu();
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
  } else if (action === "round-menu") {
    showDropdownMenu(trigger, document.getElementById("round-menu"));
  } else if (action === "opening-menu") {
    showDropdownMenu(trigger, document.getElementById("opening-menu"));
  } else if (action === "edit-details") {
    closeDropdownMenu();
    openEditRoundDetails();
  } else if (action === "export") {
    closeDropdownMenu();
    downloadRoundAsJson(state.round || db.rounds[id]);
  } else if (action === "print") {
    closeDropdownMenu();
    showElement(document.getElementById("print-box"));
  } else if (action === "do-print") {
    closePopups();
    preparePrintLayout(document.getElementById("print-evidence").checked);
    setTimeout(function () {
      window.print();
    }, 100);
  } else if (action === "save-opening") {
    closeDropdownMenu();
    var preflow = convertCaseToPreflow(state.round, activeCase(), state.round.title + " preflow");
    db.preflows[preflow.id] = preflow;
    saveToLocalStorage(db);
    state.saveState = "Saved in this browser";
    updateSaveLabel();
  } else if (action === "save-details") {
    saveEditRoundDetails();
  } else if (action === "fold-group") {
    state.round.contentions[id].collapsed = !state.round.contentions[id].collapsed;
    saveSoon(true);
    buildFlowSheet();
    renderContentionJumpLinks();
  } else if (action === "group-up") {
    rememberBeforeChange();
    moveContention(state.round, id, -1);
    saveSoon(true);
    buildFlowSheet();
    renderContentionJumpLinks();
  } else if (action === "group-down") {
    rememberBeforeChange();
    moveContention(state.round, id, 1);
    saveSoon(true);
    buildFlowSheet();
    renderContentionJumpLinks();
  } else if (action === "delete-group") {
    var cSide = getContentionSide(state.round, id);
    var nonempty = checkIfContentionHasContent(state.round, id);
    var removeCont = function () {
      rememberBeforeChange();
      if (!deleteContention(state.round, id)) return;
      saveSoon(true);
      render();
    };
    if (cSide && state.round.cases[cSide].contentionIds.length < 2) {
      askConfirm("Keep this contention", "A case needs a contention to hold the constructive. Add another one first if you want this name gone.", "OK", null);
    } else if (!nonempty) {
      removeCont();
    } else {
      askConfirm("Delete this contention?", "All of its notes and evidence will be deleted. Undo can bring them back during this visit.", "Delete", removeCont);
    }
  } else if (action === "note-menu") {
    state.selectedId = id;
    openPointActionsMenu(trigger, id);
  } else if (action === "add-evidence") {
    state.selectedId = id;
    state.evidenceOpen = true;
    var shell = document.querySelector(".workspace");
    if (shell) {
      shell.classList.add("proof-open");
    }
    selectPointCard(id, true);
    setTimeout(function () {
      var body = document.querySelector('.proof-text[data-evidence="' + id + '"]');
      if (body) body.focus();
    }, 30);
  } else if (action === "close-btn") {
    state.evidenceOpen = false;
    var openShell = document.querySelector(".workspace");
    if (openShell) {
      openShell.classList.remove("proof-open");
    }
  } else if (action === "tour") {
    startFeatureTour();
  } else if (action === "tour-next") {
    state.tourStep += 1;
    if (state.tourStep === 3) state.caseSide = "pro";
    render();
  } else if (action === "tour-back") {
    state.tourStep -= 1;
    renderTourStep();
  } else if (action === "tour-close") {
    closeFeatureTour();
  }
});

document.addEventListener("keydown", function (event) {
  if (state.tourStep >= 0 && event.key === "Escape") {
    closeFeatureTour();
    return;
  }

  var target = event.target;
  if (target.classList && target.classList.contains("point-input")) {
    if (event.key === "Enter" && !event.shiftKey && !state.composing && !event.isComposing) {
      event.preventDefault();
      splitPointOnEnter(target);
    } else if (event.key === "Escape") {
      target.blur();
      var point = target.closest(".point");
      if (point) point.focus();
    } else if (event.key === "Tab") {
      event.preventDefault();
      var foundBoxes = document.querySelectorAll(".point, .reply-box, .new-box");
      var boxes = [];
      for (var b = 0; b < foundBoxes.length; b++) {
        boxes.push(foundBoxes[b]);
      }
      var index = boxes.indexOf(target.closest(".point"));
      var next = boxes[index + (event.shiftKey ? -1 : 1)];
      if (next) next.focus();
    }
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && target.tagName !== "TEXTAREA" && !target.isContentEditable) {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
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
      navigatePointsWithArrows(pointId, event.key);
    }
  }
});

document.addEventListener("compositionstart", function () { state.composing = true; });
document.addEventListener("compositionend", function () { state.composing = false; });

document.addEventListener("input", function (event) {
  var target = event.target;
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
    if (jump) {
      jump.textContent = target.value || "Contention";
    }
    saveSoon(false);
    return;
  }

  if (target.dataset.field === "font-size") {
    db.settings.fontSize = Number(target.value);
    saveToLocalStorage(db);
    var boxes = document.querySelectorAll(".point-input, .reply-box, .new-box");
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].style.fontSize = target.value + "px";
    }
    measurePointHeights();
    applyPointPositions();
    return;
  }

  if (target.classList.contains("point-input")) {
    beginTyping();
    state.round.notes[target.dataset.id].text = target.value;
    var slots = document.querySelectorAll('.reply-box[data-parent="' + target.dataset.id + '"]');
    for (var s = 0; s < slots.length; s++) {
      slots[s].setAttribute("aria-label", "Response to " + (target.value || "point"));
    }
    measurePointHeights();
    applyPointPositions();
    saveSoon(false);
    return;
  }

  if (target.dataset.slot && target.value) {
    createReplyFromInput(target, target.value);
    return;
  }

  if (target.dataset.starter && target.value) {
    createNewPointFromInput(target);
    return;
  }

  if (target.dataset.evidence || (target.classList && target.classList.contains("proof-text"))) {
    beginTyping();
    saveEvidenceText(target);
    saveSoon(false);
  }
});

document.addEventListener("paste", function (event) {
  var body = event.target.closest ? event.target.closest(".proof-text") : null;
  if (!body) return;

  event.preventDefault();
  var html = event.clipboardData.getData("text/html");
  var text = event.clipboardData.getData("text/plain");
  var cleaned = html ? cleanPastedHtml(html) : { html: convertLinesToHtml(text), plain: text, notice: "" };

  if ((cleaned.plain || "").length > 60000) {
    var cut = cleaned.plain.slice(0, 60000);
    cleaned = {
      html: convertLinesToHtml(cut),
      plain: cut,
      notice: "Kept the first part of the paste. A full open-ev file won't fit in this browser — one card at a time."
    };
  }

  insertHtmlAtCursor(cleaned.html);
  beginTyping();
  saveEvidenceText(body, cleaned.notice);
  saveSoon(false);
});

document.addEventListener("focusout", function (event) {
  if (event.target.classList && event.target.classList.contains("proof-text")) {
    saveEvidenceText(event.target);
    saveSoon(false);
    state.history.typing = false;
  }
});

document.addEventListener("scroll", function (event) {
  if (event.target.id === "scroll-box" && state.round) {
    state.round.scroll[activeCase()] = event.target.scrollTop;
  }
}, true);

document.addEventListener("change", function (event) {
  var target = event.target;
  if (!target || !target.dataset || !state.round) return;

  if (target.dataset.field === "columns-count") {
    state.round.columnFocus[activeCase()].count = (target.value === "all") ? null : Number(target.value);
    saveSoon(true);
    render();
  } else if (target.dataset.field === "columns-start") {
    state.round.columnFocus[activeCase()].start = Number(target.value);
    saveSoon(true);
    render();
  } else if (target.dataset.field === "font-size") {
    db.settings.fontSize = Number(target.value);
    saveToLocalStorage(db);
  }
});

window.addEventListener("resize", function () {
  clearTimeout(state.resizeTimer);
  state.resizeTimer = setTimeout(function () {
    if (window.innerWidth > 899 && state.navOpen) {
      state.navOpen = false;
      updateSideMenu();
    }
    buildFlowSheet();
  }, 120);
});
