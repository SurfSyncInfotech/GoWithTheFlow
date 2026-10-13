function renderWorkspace() {
  var workspaceShell = document.querySelector(".workspace");

  if (workspaceShell) {
    workspaceShell.classList.toggle("proof-open", state.evidenceOpen);
  }

  updateTopBarAndSidebar();
  buildFlowSheet();

  if (state.evidenceOpen) {
    renderEvidencePanel();
  }

  var scroller = document.getElementById("scroll-box");

  if (scroller) {
    var savedScroll = state.round.scroll[getOpenCaseSide()];

    if (!savedScroll) {
      savedScroll = 0;
    }

    scroller.scrollTop = savedScroll;
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

  var caseSide = getOpenCaseSide();
  var view = getVisibleSpeeches(state.round, caseSide);
  var paneWidthNum = 800;

  if (scroller) {
    paneWidthNum = scroller.clientWidth;
  }

  var colWidth = calculateColumnWidth(scroller, view.visible.length);
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
    var kindName = speechInfo.short;

    if (shortNames[speechInfo.type]) {
      kindName = shortNames[speechInfo.type];
    }

    speechChip.querySelector(".speech-number").textContent = orderNumber + ". " + kindName;

    var seconds = 240;

    if (db.settings.durations && db.settings.durations[speechInfo.type]) {
      seconds = db.settings.durations[speechInfo.type];
    }

    speechChip.querySelector(".speech-time").textContent = Math.round(seconds / 60) + " min";

    headerRow.appendChild(speechChip);
  }

  sheet.appendChild(headerRow);
  sheet.style.setProperty("--speech-head", headerRow.offsetHeight + "px");

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
  var safeIndex = index;

  if (index < 0) {
    safeIndex = 0;
  }

  var colorTone = CONTENTION_COLORS[safeIndex % CONTENTION_COLORS.length];

  var header = section.querySelector(".group-top");

  header.style.backgroundColor = colorTone.head;
  header.style.color = colorTone.ink;
  header.style.borderLeft = "4px solid " + colorTone.accent;
  section.querySelector(".group-dot").style.backgroundColor = colorTone.accent;

  var foldToggle = section.querySelector("[data-action='fold-group']");

  if (contention.collapsed) {
    foldToggle.textContent = "▸";
    foldToggle.title = "Expand contention";
  } else {
    foldToggle.textContent = "▾";
    foldToggle.title = "Collapse contention";
  }

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

      slotBox.style.fontSize = getFontSize() + "px";
      slotBox.setAttribute("aria-label", "Response to " + (parentNote.text || "point"));
      slotBox.dataset.parent = slot.parentId;
      slotBox.dataset.speech = speechId;
      canvas.appendChild(slotBox);
    }

    var starterBox = colElement.querySelector(".new-box");

    starterBox.style.fontSize = getFontSize() + "px";
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
    marker.className = "point-tag tag-" + note.marker;
    showElement(marker);
  } else {
    hideElement(marker);
  }

  var area = box.querySelector(".point-input");

  area.style.fontSize = getFontSize() + "px";
  if (note.html) {
    area.innerHTML = cleanPastedHtml(note.html).html;
  } else if (note.text) {
    area.innerHTML = convertLinesToHtml(note.text);
  } else {
    area.innerHTML = "";
  }
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
  var areas = document.querySelectorAll(".point-input");

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
  var caseSide = getOpenCaseSide();
  var view = getVisibleSpeeches(state.round, caseSide);

  if (!width) {
    var scroller = document.getElementById("scroll-box");

    width = calculateColumnWidth(scroller, view.visible.length);
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
  var summaryText = selected.text;

  if (!summaryText) {
    summaryText = "Point";
  }

  summaryText = summaryText.split("\n")[0];
  if (summaryText.length > 25) {
    summaryText = summaryText.slice(0, 25) + "...";
  }

  var contentionName = "Contention";

  if (contention) {
    contentionName = contention.name;
  }

  document.getElementById("crumb-contention").textContent = contentionName;
  document.getElementById("crumb-point").textContent = summaryText;

  var allNotes = getEvidencePointsList(selected.contentionId, getOpenCaseSide());
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

  var firstLine = note.text;

  if (!firstLine) {
    firstLine = "Empty point";
  }

  firstLine = firstLine.split("\n")[0];
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
  var noticeText = "";

  if (stored && stored.notice) {
    noticeText = stored.notice;
  }

  notice.textContent = noticeText;

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

function savePointFormatting(area) {
  var note = state.round && state.round.notes[area.dataset.id];
  if (!note) return;

  var cleaned = cleanPastedHtml(area.innerHTML);

  note.text = cleaned.plain;
  note.html = cleaned.html;
}

function focusPointInput(id, caret) {
  var area = document.querySelector('.point-input[data-id="' + id + '"]');
  if (!area) return;

  area.focus();
  var selection = window.getSelection();
  var range = document.createRange();

  if (caret === 0) {
    range.setStart(area, 0);
    range.collapse(true);
  } else {
    range.selectNodeContents(area);
    range.collapse(false);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

function createReplyFromInput(slot, text) {
  saveUndoBeforeChange();
  var replyText = text;

  if (!replyText) {
    replyText = "";
  }

  var note = addReplyPoint(state.round, slot.dataset.parent, slot.dataset.speech, replyText);
  note.html = cleanPastedHtml(slot.innerHTML).html;

  saveRoundAfterAMoment(true);
  state.selectedId = note.id;
  buildFlowSheet();
  var caretPlace = 0;

  if (replyText) {
    caretPlace = replyText.length;
  }

  focusPointInput(note.id, caretPlace);
}

function createNewPointFromInput(starter) {
  var text = (starter.innerText || "").replace(/\u00a0/g, " ").trim();
  var speech = starter.dataset.speech;
  if (!text) return;

  if (state.round.isPreflow && speech !== state.round.preflowSide + "-constructive") {
    return;
  }

  saveUndoBeforeChange();
  var note = addMainPoint(state.round, starter.dataset.starter, starter.dataset.speech, text);
  note.html = cleanPastedHtml(starter.innerHTML).html;

  starter.innerHTML = "";
  saveRoundAfterAMoment(true);
  state.selectedId = note.id;
  buildFlowSheet();
  focusPointInput(note.id, text.length);
}

function splitPointOnEnter(area) {
  var note = state.round.notes[area.dataset.id];
  if (!note) return;

  var selection = window.getSelection();
  if (!selection || !selection.rangeCount || !area.contains(selection.anchorNode)) return;

  var range = selection.getRangeAt(0);

  range.deleteContents();
  var afterRange = range.cloneRange();

  afterRange.selectNodeContents(area);
  afterRange.setStart(range.endContainer, range.endOffset);

  var afterHost = document.createElement("div");

  afterHost.appendChild(afterRange.extractContents());
  var beforeClean = cleanPastedHtml(area.innerHTML);
  var afterClean = cleanPastedHtml(afterHost.innerHTML);

  if (!beforeClean.plain.trim() && !afterClean.plain.trim()) {
    var next = area.closest(".speech-column").querySelector(".new-box");

    if (next) {
      next.focus();
    }

    return;
  }

  saveUndoBeforeChange();
  note.text = beforeClean.plain;
  note.html = beforeClean.html;

  var created;

  if (note.parentId) {
    created = addReplyPoint(state.round, note.parentId, note.speechId, afterClean.plain, note.id);
  } else {
    created = addMainPoint(state.round, note.contentionId, note.speechId, afterClean.plain, note.id);
  }

  created.html = afterClean.html;
  saveRoundAfterAMoment(true);
  state.selectedId = created.id;
  buildFlowSheet();
  focusPointInput(created.id, 0);
}

function saveEvidenceText(body, pasteNotice) {
  var note = state.round.notes[body.dataset.evidence];
  if (!note) return;

  var cleaned = cleanPastedHtml(body.innerHTML);
  var previousNotice = "";

  if (note.evidenceId && state.round.evidence[note.evidenceId] && state.round.evidence[note.evidenceId].notice) {
    previousNotice = state.round.evidence[note.evidenceId].notice;
  }

  var shownNotice = pasteNotice;

  if (!shownNotice) {
    shownNotice = cleaned.notice;
  }

  if (!shownNotice) {
    shownNotice = previousNotice;
  }

  if (!shownNotice) {
    shownNotice = "";
  }

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

  addItem("Delete", function () {
    confirmDeletePoint(note);
  });

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
    saveUndoBeforeChange();
    if (state.selectedId === note.id) {
      state.selectedId = null;
    }

    deletePoint(state.round, note.id);
    saveRoundAfterAMoment(true);
    buildFlowSheet();
    renderEvidencePanel();
  };

  if (!note.text && !note.evidenceId && children.length === 0) {
    executeDelete();
    return;
  }

  var confirmMessage = "This removes the point and its evidence.";

  if (children.length) {
    confirmMessage = "This removes the point and its evidence. Responses stay, with their text and evidence unchanged.";
  }

  askConfirm("Delete this point?", confirmMessage, "Delete", executeDelete);
}

function switchDebateSide(side) {
  if (!state.round || state.round.isPreflow) return;

  if (state.caseSide === side) return;

  finishTypingUndo();
  var scroller = document.getElementById("scroll-box");

  if (scroller) {
    state.round.scroll[state.caseSide] = scroller.scrollTop;
  }

  state.caseSide = side;
  state.selectedId = null;
  state.evidenceOpen = false;
  saveRoundAfterAMoment(true);
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
    var notes = getListFromObject(state.round.notes);
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

function openEditRoundDetails() {
  var round = state.round;

  document.getElementById("edit-title").value = round.title;
  var topicValue = round.topic;

  if (!topicValue) {
    topicValue = "";
  }

  var tournamentValue = round.tournament;

  if (!tournamentValue) {
    tournamentValue = "";
  }

  var roundLabelValue = round.roundLabel;

  if (!roundLabelValue) {
    roundLabelValue = "";
  }

  var opponentValue = round.opponent;

  if (!opponentValue) {
    opponentValue = "";
  }

  document.getElementById("edit-topic").value = topicValue;
  document.getElementById("edit-tournament").value = tournamentValue;
  document.getElementById("edit-round-label").value = roundLabelValue;
  document.getElementById("edit-opponent").value = opponentValue;
  document.getElementById("edit-side").value = round.yourSide;

  var locked = checkIfRoundHasContent(round);
  var lockNote = "Who speaks first sets the speech order.";

  if (locked) {
    lockNote = "Who speaks first is locked because notes already follow this order. Start a new round for a different order.";
  }

  document.getElementById("edit-lock-note").textContent = lockNote;

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

  var nextTitle = document.getElementById("edit-title").value.trim();

  if (!nextTitle) {
    nextTitle = "Untitled round";
  }

  round.title = nextTitle;
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

    if (first !== "con") {
      first = "pro";
    }

    round.firstSide = first;
    round.timers = createNewTimer(round.firstSide, db.settings.durations);
  }

  closePopups();
  saveRoundAfterAMoment(true);
  render();
}

function preparePrintLayout(includeEvidence) {
  var round = state.round;
  var printTitle = round.title;

  if (!printTitle) {
    printTitle = "Debate Round";
  }

  document.getElementById("print-title").textContent = printTitle;
  var topicLine = "";

  if (round.topic) {
    topicLine = "Topic / Resolution: " + round.topic;
  }

  setElementText(document.getElementById("print-topic"), topicLine);

  var tournamentLine = "";

  if (round.tournament) {
    tournamentLine = "Tournament: " + round.tournament;
  }

  var roundNumberLine = "";

  if (round.roundLabel) {
    roundNumberLine = "Round Number: " + round.roundLabel;
  }

  var opponentLine = "";

  if (round.opponent) {
    opponentLine = "vs " + round.opponent;
  }

  var firstSideLine = "";

  if (round.firstSide) {
    firstSideLine = formatSideName(round.firstSide) + " speaks first";
  }

  var metaLine = joinFilledText([
    tournamentLine,
    roundNumberLine,
    opponentLine,
    "Your Side: " + formatSideName(round.yourSide),
    firstSideLine
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

    var caseTitle = "CON CASE";

    if (caseSide === "pro") {
      caseTitle = "PRO CASE";
    }

    section.querySelector(".print-case-name").textContent = caseTitle + " FLOW";

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
          var noteList = getListFromObject(round.notes);

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

            var pointWords = item.text;

            if (!pointWords) {
              pointWords = "";
            }

            card.querySelector(".print-words").textContent = pointWords;

            var evBox = card.querySelector(".print-proof");

            if (includeEvidence && item.evidenceId && round.evidence[item.evidenceId]) {
              var proofText = round.evidence[item.evidenceId].plain;

              if (!proofText) {
                proofText = "";
              }

              evBox.textContent = "Proof: " + proofText;
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
      var editor = event.target.closest(".point-input, .reply-box, .new-box");

      if (editor && document.activeElement !== editor) {
        editor.focus();
      }
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
    saveUndoBeforeChange();
    var created = addContention(state.round, getOpenCaseSide());

    saveRoundAfterAMoment(true);
    render();
    var added = document.querySelector('.group[data-id="' + created.id + '"]');

    if (added) {
      added.scrollIntoView({ block: "start" });
    }

  } else if (action === "undo") {
    undo();

  } else if (action === "redo") {
    redo();

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
    var preflow = convertCaseToPreflow(state.round, getOpenCaseSide(), state.round.title + " preflow");

    db.preflows[preflow.id] = preflow;
    saveToLocalStorage(db);
    state.saveState = "Saved in this browser";
    updateSaveLabel();

  } else if (action === "save-details") {
    saveEditRoundDetails();

  } else if (action === "fold-group") {
    state.round.contentions[id].collapsed = !state.round.contentions[id].collapsed;
    saveRoundAfterAMoment(true);
    buildFlowSheet();
    renderContentionJumpLinks();

  } else if (action === "group-up") {
    saveUndoBeforeChange();
    moveContention(state.round, id, -1);
    saveRoundAfterAMoment(true);
    buildFlowSheet();
    renderContentionJumpLinks();

  } else if (action === "group-down") {
    saveUndoBeforeChange();
    moveContention(state.round, id, 1);
    saveRoundAfterAMoment(true);
    buildFlowSheet();
    renderContentionJumpLinks();

  } else if (action === "delete-group") {
    var cSide = getContentionSide(state.round, id);
    var nonempty = checkIfContentionHasContent(state.round, id);
    var removeCont = function () {
      saveUndoBeforeChange();
      if (!deleteContention(state.round, id)) return;

      saveRoundAfterAMoment(true);
      render();
    };
    if (cSide && state.round.cases[cSide].contentionIds.length < 2) {
      askConfirm(
        "Keep this contention",
        "A case needs a contention to hold the constructive. Add another one first if you want this name gone.",
        "OK",
        null
      );

    } else if (!nonempty) {
      removeCont();
    } else {
      askConfirm(
        "Delete this contention?",
        "All of its notes and evidence will be deleted. Undo can bring them back during this visit.",
        "Delete",
        removeCont
      );
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

      if (body) {
        body.focus();
      }
    }, 30);

  } else if (action === "close-btn") {
    state.evidenceOpen = false;
    var openShell = document.querySelector(".workspace");

    if (openShell) {
      openShell.classList.remove("proof-open");
    }

  } else if (action === "tour-next") {
    state.tourStep += 1;
    if (state.tourStep === 3) {
      state.caseSide = "pro";
    }

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

      if (point) {
        point.focus();
      }

    } else if (event.key === "Tab") {
      event.preventDefault();
      var foundBoxes = document.querySelectorAll(".point, .reply-box, .new-box");
      var boxes = [];

      for (var b = 0; b < foundBoxes.length; b++) {
        boxes.push(foundBoxes[b]);
      }

      var index = boxes.indexOf(target.closest(".point"));
      var step = 1;

      if (event.shiftKey) {
        step = -1;
      }

      var next = boxes[index + step];

      if (next) {
        next.focus();
      }
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
      var area = target.querySelector(".point-input");

      if (area) {
        area.focus();
      }

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
    saveRoundAfterAMoment(false);
    return;
  }

  if (target.dataset.field === "group-name") {
    startTypingUndo();
    var contentionName = target.value;

    if (!contentionName) {
      contentionName = "Contention";
    }

    state.round.contentions[target.dataset.id].name = contentionName;
    var jump = document.querySelector('.jump-link[data-id="' + target.dataset.id + '"] .link-name');

    if (jump) {
      jump.textContent = contentionName;
    }

    saveRoundAfterAMoment(false);
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
    startTypingUndo();
    savePointFormatting(target);
    var slots = document.querySelectorAll('.reply-box[data-parent="' + target.dataset.id + '"]');
    var plain = state.round.notes[target.dataset.id].text;

    for (var s = 0; s < slots.length; s++) {
      slots[s].setAttribute("aria-label", "Response to " + (plain || "point"));
    }

    measurePointHeights();
    applyPointPositions();
    saveRoundAfterAMoment(false);
    return;
  }

  if (target.dataset.slot && (target.innerText || "").replace(/\u00a0/g, " ").trim()) {
    createReplyFromInput(target, (target.innerText || "").replace(/\u00a0/g, " ").trim());
    return;
  }

  if (target.dataset.starter && (target.innerText || "").replace(/\u00a0/g, " ").trim()) {
    createNewPointFromInput(target);
    return;
  }

  if (target.dataset.evidence || (target.classList && target.classList.contains("proof-text"))) {
    startTypingUndo();
    saveEvidenceText(target);
    saveRoundAfterAMoment(false);
  }
});

document.addEventListener("paste", function (event) {
  var body = null;

  if (event.target.closest) {
    body = event.target.closest(".proof-text");
  }

  if (!body) return;

  event.preventDefault();
  var html = event.clipboardData.getData("text/html");
  var text = event.clipboardData.getData("text/plain");
  var cleaned = { html: convertLinesToHtml(text), plain: text, notice: "" };

  if (html) {
    cleaned = cleanPastedHtml(html);
  }

  if ((cleaned.plain || "").length > 60000) {
    var cut = cleaned.plain.slice(0, 60000);

    cleaned = {
      html: convertLinesToHtml(cut),
      plain: cut,
      notice: "Kept the first part of the paste. A full open-ev file won't fit in this browser — one card at a time."
    };
  }

  insertHtmlAtCursor(cleaned.html);
  startTypingUndo();
  saveEvidenceText(body, cleaned.notice);
  saveRoundAfterAMoment(false);
});

document.addEventListener("focusout", function (event) {
  if (event.target.classList && event.target.classList.contains("proof-text")) {
    saveEvidenceText(event.target);
    saveRoundAfterAMoment(false);
    state.history.typing = false;
  }
});

document.addEventListener("scroll", function (event) {
  if (event.target.id === "scroll-box" && state.round) {
    state.round.scroll[getOpenCaseSide()] = event.target.scrollTop;
  }
}, true);

document.addEventListener("change", function (event) {
  var target = event.target;
  if (!target || !target.dataset || !state.round) return;

  if (target.dataset.field === "font-size") {
    db.settings.fontSize = Number(target.value);
    saveToLocalStorage(db);
  }
});

var layoutWidth = window.innerWidth;

window.addEventListener("resize", function () {
  clearTimeout(state.resizeTimer);
  state.resizeTimer = setTimeout(function () {
    var width = window.innerWidth;
    var focused = document.activeElement;
    var typing = focused && focused.closest && focused.closest("input, textarea, select, [contenteditable='true']");

    if (width > 899 && state.navOpen && !typing) {
      state.navOpen = false;
      updateSideMenu();
    }

    if (typing || Math.abs(width - layoutWidth) < 48) return;

    layoutWidth = width;
    buildFlowSheet();
  }, 120);
});
