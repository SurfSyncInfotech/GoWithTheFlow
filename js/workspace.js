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
  var colWidth = calculateColumnWidth(scroller, view.visible.length);

  clearElement(sheet);

  var headerRow = cloneTemplate("head-row");
  var shortNames = { constructive: "Constr.", rebuttal: "Reb.", summary: "Sum.", final: "FF" };

  for (var i = 0; i < view.visible.length; i++) {
    var speechId = view.visible[i];
    var speechInfo = SPEECHES[speechId];
    var speechChip = cloneTemplate("speech-chip");

    speechChip.classList.add(speechInfo.team);
    speechChip.style.width = colWidth + "px";
    speechChip.querySelector(".speech-name").textContent = speechInfo.code || speechInfo.short || speechInfo.full;

    var small = speechChip.querySelector(".speech-small");
    if (small) {
      small.remove();
    }

    headerRow.appendChild(speechChip);
  }

  sheet.appendChild(headerRow);
  sheet.style.setProperty("--speech-head", headerRow.offsetHeight + "px");

  var flowGrid = document.createElement("div");
  flowGrid.className = "flow-grid";

  var primaryContentionId = (state.round.cases[caseSide] && state.round.cases[caseSide].contentionIds[0]) || null;
  if (!primaryContentionId) {
    var added = addContention(state.round, caseSide, "Arguments");
    primaryContentionId = added.id;
  }

  var contention = state.round.contentions[primaryContentionId];
  if (contention && contention.startingPointIds.length === 0 && view.visible.length > 0) {
    var starter = addMainPoint(state.round, primaryContentionId, view.visible[0], "");
    state.selectedId = starter.id;
    saveRoundAfterAMoment(true);
  }

  var layout = calculateCaseFlowLayout(state.round, caseSide, state.heights);

  for (var s = 0; s < view.visible.length; s++) {
    var speechId = view.visible[s];
    var speechInfo = SPEECHES[speechId];
    var colElement = cloneTemplate("col-sample");

    colElement.style.width = colWidth + "px";
    colElement.dataset.speech = speechId;
    if (speechInfo && speechInfo.team) {
      colElement.classList.add(speechInfo.team);
    }
    if (s % 2 === 1) {
      colElement.classList.add("alt-column");
    }

    var canvas = colElement.querySelector(".column-area");
    canvas.style.height = layout.height + "px";
    canvas.dataset.speech = speechId;

    var noteIds = Object.keys(state.round.notes);
    for (var n = 0; n < noteIds.length; n++) {
      var note = state.round.notes[noteIds[n]];
      if (note.speechId === speechId && layout.positions[noteIds[n]]) {
        canvas.appendChild(renderPointCard(note));
      }
    }

    for (var sl = 0; sl < layout.slots.length; sl++) {
      var slot = layout.slots[sl];
      if (slot.speechId !== speechId) continue;

      var parentNote = state.round.notes[slot.parentId];
      if (!parentNote) continue;

      var slotBox = cloneTemplate("ans-slot");
      slotBox.setAttribute("aria-label", "Response to " + (parentNote.text || "point"));
      slotBox.dataset.parent = slot.parentId;
      slotBox.dataset.speech = speechId;
      slotBox.style.top = slot.top + "px";
      canvas.appendChild(slotBox);
    }

    var addBtn = colElement.querySelector(".col-add-btn");
    if (s === 0 && addBtn) {
      addBtn.classList.remove("hide");
      addBtn.dataset.starter = primaryContentionId;
      addBtn.dataset.speech = speechId;
    }

    flowGrid.appendChild(colElement);
  }

  sheet.appendChild(flowGrid);

  measurePointHeights();
  applyPointPositions(colWidth);

  if (state.selectedId) {
    var selectedElement = document.querySelector('.point[data-id="' + state.selectedId + '"]');
    if (selectedElement) {
      selectedElement.classList.add("picked");
    }
  }
}

function renderPointCard(note) {
  var box = cloneTemplate("card-sample");
  box.dataset.id = note.id;
  box.dataset.speech = note.speechId;
  if (note.parentId) {
    box.dataset.parent = note.parentId;
  }

  if (note.id === state.selectedId) {
    box.classList.add("picked");
  }

  var marker = box.querySelector(".point-tag");
  if (note.marker) {
    marker.textContent = getMarkerLabel(note.marker);
    marker.className = "point-tag tag-" + note.marker + " " + note.marker;
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

  var clipBtn = box.querySelector(".clip-btn");
  clipBtn.dataset.id = note.id;

  var num = clipBtn.querySelector(".clip-number");
  if (note.evidenceId && state.round.evidence && state.round.evidence[note.evidenceId]) {
    clipBtn.classList.add("has-proof", "has-ev");
    box.classList.add("has-ev");
    clipBtn.setAttribute("aria-label", "Open evidence");
    if (num) {
      num.textContent = "1";
      showElement(num);
    }
  } else {
    clipBtn.classList.remove("has-proof", "has-ev");
    box.classList.remove("has-ev");
    clipBtn.setAttribute("aria-label", "Add evidence");
    if (num) {
      num.textContent = "";
      hideElement(num);
    }
  }

  box.querySelector(".point-menu").dataset.id = note.id;
  return box;
}

function measurePointHeights() {
  var areas = document.querySelectorAll(".point-input");

  for (var i = 0; i < areas.length; i++) {
    var area = areas[i];

    area.style.height = "auto";
    var textHeight = Math.max(20, area.scrollHeight);
    area.style.height = textHeight + "px";

    var parentBox = area.closest(".point");
    if (parentBox) {
      parentBox.style.height = "auto";
      var boxHeight = Math.max(30, parentBox.offsetHeight || parentBox.scrollHeight);
      state.heights[area.dataset.id] = boxHeight;
    }
  }
}

function applyPointPositions(width) {
  var caseSide = getOpenCaseSide();
  var layout = calculateCaseFlowLayout(state.round, caseSide, state.heights);

  var canvases = document.querySelectorAll(".column-area");
  for (var c = 0; c < canvases.length; c++) {
    canvases[c].style.height = layout.height + "px";
  }

  var posKeys = Object.keys(layout.positions);
  for (var p = 0; p < posKeys.length; p++) {
    if (posKeys[p] === "_threads") continue;

    var pointElement = document.querySelector('.point[data-id="' + posKeys[p] + '"]');
    if (pointElement) {
      pointElement.style.top = layout.positions[posKeys[p]].top + "px";
      pointElement.style.minHeight = layout.positions[posKeys[p]].height + "px";
      pointElement.style.height = "auto";
    }
  }

  for (var s = 0; s < layout.slots.length; s++) {
    var slot = layout.slots[s];
    var slotElement = document.querySelector('.reply-slot-btn[data-parent="' + slot.parentId + '"][data-speech="' + slot.speechId + '"]');
    if (slotElement) {
      slotElement.style.top = slot.top + "px";
    }
  }
}

function renderEvidencePanel() {
  var list = document.querySelector(".proof-list");
  if (!list || !state.round) return;

  var selected = state.round.notes[state.selectedId];
  clearElement(list);

  if (!selected) {
    var emptyTemplate = document.getElementById("ev-empty");
    if (emptyTemplate) {
      list.appendChild(cloneTemplate("ev-empty"));
    }
    return;
  }

  list.appendChild(renderEvidenceCard(selected, true));
}

function renderEvidenceCard(note, current) {
  var card = cloneTemplate("ev-card");

  if (current) {
    card.classList.add("current");
  }

  var body = card.querySelector(".proof-text");
  body.dataset.evidence = note.id;

  var stored = note.evidenceId && state.round.evidence[note.evidenceId];
  if (stored) {
    body.innerHTML = cleanPastedHtml(stored.html).html;
  }

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


function openEditRoundDetails() {
  var round = state.round;
  if (!round) return;

  var isPreflow = Boolean(round.isPreflow);
  var editBox = document.getElementById("edit-box");
  var editHeading = editBox ? editBox.querySelector("h2") : null;
  if (editHeading) {
    editHeading.textContent = isPreflow ? "Edit preflow details" : "Edit details";
  }

  document.getElementById("edit-title").value = round.title || "";
  document.getElementById("edit-topic").value = round.topic || "";

  var tournamentWrap = document.getElementById("edit-tournament") ? document.getElementById("edit-tournament").closest(".form-line") : null;
  var roundLabelWrap = document.getElementById("edit-round-label") ? document.getElementById("edit-round-label").closest(".form-line") : null;
  var opponentWrap = document.getElementById("edit-opponent") ? document.getElementById("edit-opponent").closest(".form-line") : null;
  var firstWrap = document.getElementById("edit-first-wrap");
  var lockNote = document.getElementById("edit-lock-note");
  var sideSelect = document.getElementById("edit-side");
  var obsOption = sideSelect ? sideSelect.querySelector('option[value="observer"]') : null;

  if (isPreflow) {
    if (tournamentWrap) hideElement(tournamentWrap);
    if (roundLabelWrap) hideElement(roundLabelWrap);
    if (opponentWrap) hideElement(opponentWrap);
    if (firstWrap) hideElement(firstWrap);
    if (lockNote) hideElement(lockNote);
    if (obsOption) hideElement(obsOption);
    if (sideSelect) sideSelect.value = round.preflowSide || round.yourSide || "pro";
  } else {
    if (tournamentWrap) showElement(tournamentWrap);
    if (roundLabelWrap) showElement(roundLabelWrap);
    if (opponentWrap) showElement(opponentWrap);
    if (obsOption) showElement(obsOption);
    if (lockNote) showElement(lockNote);

    document.getElementById("edit-tournament").value = round.tournament || "";
    document.getElementById("edit-round-label").value = round.roundLabel || "";
    document.getElementById("edit-opponent").value = round.opponent || "";
    if (sideSelect) sideSelect.value = round.yourSide || "pro";

    var locked = checkIfRoundHasContent(round);
    var noteMsg = "Who speaks first sets the speech order.";
    if (locked) {
      noteMsg = "Who speaks first is locked because notes already follow this order. Start a new round for a different order.";
      if (firstWrap) hideElement(firstWrap);
    } else {
      if (firstWrap) {
        showElement(firstWrap);
        document.getElementById("edit-first").value = round.firstSide || "pro";
      }
    }
    if (lockNote) lockNote.textContent = noteMsg;
  }

  showElement(editBox);
}

function saveEditRoundDetails() {
  var round = state.round;
  if (!round) return;

  var isPreflow = Boolean(round.isPreflow);
  var nextTitle = document.getElementById("edit-title").value.trim();
  var nextTopic = document.getElementById("edit-topic").value.trim();

  if (!nextTitle) {
    nextTitle = nextTopic || (isPreflow ? "Untitled preflow" : "Untitled round");
  }

  round.title = nextTitle;
  round.topic = nextTopic;

  if (isPreflow) {
    var nextSide = document.getElementById("edit-side").value;
    if (nextSide !== "con") nextSide = "pro";

    var oldSide = round.preflowSide || round.yourSide || "pro";
    if (oldSide !== nextSide) {
      round.preflowSide = nextSide;
      round.yourSide = nextSide;
      round.firstSide = nextSide;

      if (round.notes) {
        var noteKeys = Object.keys(round.notes);
        for (var nk = 0; nk < noteKeys.length; nk++) {
          var nItem = round.notes[noteKeys[nk]];
          if (nItem.speechId === oldSide + "-constructive") {
            nItem.speechId = nextSide + "-constructive";
          }
        }
      }

      if (round.cases && round.cases[oldSide] && round.cases[nextSide]) {
        round.cases[nextSide].contentionIds = round.cases[oldSide].contentionIds.slice();
        round.cases[oldSide].contentionIds = [];
      }

      round.timers = createNewTimer(nextSide, getDefaultSpeechTimes());
    }

    if (db.preflows[round.id]) {
      var pre = db.preflows[round.id];
      pre.title = round.title;
      pre.topic = round.topic;
      pre.side = round.preflowSide;
      pre.contentions = round.contentions;
      pre.contentionIds = round.cases[round.preflowSide].contentionIds;
      pre.notes = round.notes;
      pre.evidence = round.evidence;
      pre.updatedAt = new Date().toISOString();
    }
  } else {
    var locked = checkIfRoundHasContent(round);
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
  }

  closePopups();
  saveRoundAfterAMoment(true);
  render();
}

function isCaretAtBeginning(el) {
  var sel = window.getSelection();
  if (!sel || !sel.rangeCount) return true;
  var range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  var preRange = document.createRange();
  preRange.selectNodeContents(el);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length === 0;
}

function isCaretAtEnd(el) {
  var sel = window.getSelection();
  if (!sel || !sel.rangeCount) return true;
  var range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  var postRange = document.createRange();
  postRange.selectNodeContents(el);
  postRange.setStart(range.endContainer, range.endOffset);
  return postRange.toString().length === 0;
}

function navigatePointsWithArrows(from, key) {
  var current = null;
  if (typeof from === "string") {
    current = document.querySelector('.point[data-id="' + from + '"]');
  } else if (from && from.nodeType) {
    current = from.closest(".point, .reply-box, .new-box");
  }
  if (!current) return;

  var currentPoint = current.classList.contains("point") ? current : null;
  var currentPointId = currentPoint ? currentPoint.dataset.id : null;
  var currentNote = currentPointId && state.round ? state.round.notes[currentPointId] : null;

  var currentColumn = current.closest(".speech-column");
  if (!currentColumn) return;

  var best = null;

  if (key === "ArrowRight") {
    if (currentPointId) {
      var childPoint = document.querySelector('.point[data-parent="' + currentPointId + '"]');
      if (childPoint) {
        best = childPoint;
      } else {
        var directSlot = document.querySelector('.reply-slot-btn[data-parent="' + currentPointId + '"]');
        if (directSlot) {
          best = directSlot;
        }
      }
    }

    if (!best) {
      var nextCol = currentColumn.nextElementSibling;
      if (nextCol && nextCol.classList.contains("speech-column")) {
        var targets = nextCol.querySelectorAll(".point, .reply-slot-btn, .col-add-btn");
        var currentRect = current.getBoundingClientRect();
        var bestDist = -1;
        for (var i = 0; i < targets.length; i++) {
          var r = targets[i].getBoundingClientRect();
          var dist = Math.abs(r.top - currentRect.top);
          if (bestDist < 0 || dist < bestDist) {
            best = targets[i];
            bestDist = dist;
          }
        }
      }
    }

  } else if (key === "ArrowLeft") {
    if (currentNote && currentNote.parentId) {
      var parentEl = document.querySelector('.point[data-id="' + currentNote.parentId + '"]');
      if (parentEl) {
        best = parentEl;
      }
    }

    if (!best) {
      var prevCol = currentColumn.previousElementSibling;
      if (prevCol && prevCol.classList.contains("speech-column")) {
        var prevTargets = prevCol.querySelectorAll(".point, .reply-slot-btn, .col-add-btn");
        var pCurrentRect = current.getBoundingClientRect();
        var pBestDist = -1;
        for (var p = 0; p < prevTargets.length; p++) {
          var pr = prevTargets[p].getBoundingClientRect();
          var pDist = Math.abs(pr.top - pCurrentRect.top);
          if (pBestDist < 0 || pDist < pBestDist) {
            best = prevTargets[p];
            pBestDist = pDist;
          }
        }
      }
    }

  } else if (key === "ArrowDown") {
    var downBoxes = Array.prototype.slice.call(currentColumn.querySelectorAll(".point, .reply-slot-btn, .col-add-btn"));
    var downIdx = downBoxes.indexOf(current);
    if (downIdx >= 0 && downIdx < downBoxes.length - 1) {
      best = downBoxes[downIdx + 1];
    }

  } else if (key === "ArrowUp") {
    var upBoxes = Array.prototype.slice.call(currentColumn.querySelectorAll(".point, .reply-slot-btn, .col-add-btn"));
    var upIdx = upBoxes.indexOf(current);
    if (upIdx > 0) {
      best = upBoxes[upIdx - 1];
    }
  }

  if (!best) return;

  if (best.classList.contains("point")) {
    selectPointCard(best.dataset.id, state.evidenceOpen);
    var input = best.querySelector(".point-input");
    if (input) {
      input.focus();
    } else {
      best.focus();
    }
  } else {
    best.focus();
  }
}

window.renderCurrentPage = function () {
  renderWorkspace();
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

  } else if (action === "add-reply") {
    var parentId = trigger.dataset.parent;
    var speechId = trigger.dataset.speech;
    saveUndoBeforeChange();
    var newReply = addReplyPoint(state.round, parentId, speechId, "");
    saveRoundAfterAMoment(true);
    state.selectedId = newReply.id;
    buildFlowSheet();
    focusPointInput(newReply.id, 0);

  } else if (action === "add-main-point") {
    var starterId = trigger.dataset.starter;
    var spId = trigger.dataset.speech;
    saveUndoBeforeChange();
    var newPoint = addMainPoint(state.round, starterId, spId, "");
    saveRoundAfterAMoment(true);
    state.selectedId = newPoint.id;
    buildFlowSheet();
    focusPointInput(newPoint.id, 0);
  }
});

document.addEventListener("keydown", function (event) {
  var target = event.target;

  var isZ = event.key && event.key.toLowerCase() === "z";
  var isY = event.key && event.key.toLowerCase() === "y";
  var isModifier = event.ctrlKey || event.metaKey;

  if (isModifier && isZ) {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }

  if (isModifier && isY) {
    event.preventDefault();
    redo();
    return;
  }

  if (target.classList && target.classList.contains("point-input")) {
    if (event.key === "Enter" && !event.shiftKey && !state.composing && !event.isComposing) {
      event.preventDefault();
      splitPointOnEnter(target);
      return;
    }

    if (event.key === "Enter" && event.shiftKey && !state.composing && !event.isComposing) {
      event.preventDefault();
      var pointId = target.dataset.id;
      var replySlot = document.querySelector('.reply-slot-btn[data-parent="' + pointId + '"]');
      if (replySlot) {
        var pId = replySlot.dataset.parent;
        var spId = replySlot.dataset.speech;
        saveUndoBeforeChange();
        var note = addReplyPoint(state.round, pId, spId, "");
        saveRoundAfterAMoment(true);
        state.selectedId = note.id;
        buildFlowSheet();
        focusPointInput(note.id, 0);
      } else {
        var currentCol = target.closest(".speech-column");
        var nextCol = currentCol ? currentCol.nextElementSibling : null;
        if (nextCol && nextCol.dataset.speech) {
          saveUndoBeforeChange();
          var note = addReplyPoint(state.round, pointId, nextCol.dataset.speech, "");
          saveRoundAfterAMoment(true);
          buildFlowSheet();
          focusPointInput(note.id, 0);
        }
      }
      return;
    }

    if (event.key === "Escape") {
      target.blur();
      var point = target.closest(".point");
      if (point) {
        point.focus();
      }
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      var foundBoxes = Array.prototype.slice.call(document.querySelectorAll(".point, .reply-slot-btn, .col-add-btn"));
      var currentCard = target.closest(".point");
      var index = foundBoxes.indexOf(currentCard);
      var step = event.shiftKey ? -1 : 1;
      var next = foundBoxes[index + step];
      if (next) {
        if (next.classList.contains("point")) {
          selectPointCard(next.dataset.id, state.evidenceOpen);
          var nextInput = next.querySelector(".point-input");
          if (nextInput) {
            nextInput.focus();
          } else {
            next.focus();
          }
        } else {
          next.focus();
        }
      }
      return;
    }

    if (event.key.indexOf("Arrow") === 0) {
      var shouldNavigate = event.altKey;
      if (!shouldNavigate) {
        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          shouldNavigate = isCaretAtBeginning(target);
        } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          shouldNavigate = isCaretAtEnd(target);
        }
      }
      if (shouldNavigate) {
        event.preventDefault();
        navigatePointsWithArrows(target, event.key);
      }
      return;
    }

    return;
  }

  if (target.classList && (target.classList.contains("reply-slot-btn") || target.classList.contains("col-add-btn"))) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      target.click();
      return;
    }
    if (event.key.indexOf("Arrow") === 0) {
      event.preventDefault();
      navigatePointsWithArrows(target, event.key);
      return;
    }
  }

  if (target.classList && target.classList.contains("point") && !target.classList.contains("point-input")) {
    var pId = target.dataset.id;
    if (event.key === "Enter") {
      var area = target.querySelector(".point-input");
      if (area) {
        area.focus();
      }
    } else if (event.key.indexOf("Arrow") === 0) {
      event.preventDefault();
      navigatePointsWithArrows(pId, event.key);
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
