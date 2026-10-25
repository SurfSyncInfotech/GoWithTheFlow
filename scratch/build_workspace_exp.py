import os

# Read js/workspace.js
with open('js/workspace.js', 'r', encoding='utf-8') as f:
    js_lines = [l.rstrip('\r\n') for l in f.readlines()]

# Read existing explanations/workspace.txt into mapping
with open('explanations/workspace.txt', 'r', encoding='utf-8') as f:
    exp_lines = [l.rstrip('\r\n') for l in f.readlines()]

mapping = {}
i = 0
while i < len(exp_lines):
    line = exp_lines[i]
    if line.strip() and not line.startswith('//'):
        if i + 1 < len(exp_lines):
            exp = exp_lines[i+1]
            if exp.strip() and not exp.startswith('  ') and not exp.endswith(';') and not exp.endswith('{') and not exp.endswith('}'):
                mapping[line.strip()] = exp
    i += 1

# Custom explanations dictionary for all the new lines
custom = {
    'var kindName = shortNames[speechInfo.type] || speechInfo.short;': 'Look up the short name for this speech type, or fall back to speechInfo.short.',
    'var flowGrid = document.createElement("div");': 'Create a new container element for the flowsheet grid.',
    'flowGrid.className = "flow-grid";': 'Assign the CSS class "flow-grid" to the grid container.',
    'var primaryContentionId = (state.round.cases[caseSide] && state.round.cases[caseSide].contentionIds[0]) || null;': 'Get the first contention ID for this side, or null if none exists.',
    'if (!primaryContentionId) {': 'If no contention exists yet for this debate side, do the next lines.',
    'var added = addContention(state.round, caseSide, "Arguments");': 'Add a default contention named "Arguments" to the open case side.',
    'primaryContentionId = added.id;': 'Save the newly created contention ID as primaryContentionId.',
    'var contention = state.round.contentions[primaryContentionId];': 'Retrieve the contention object from the round data.',
    'if (contention && contention.startingPointIds.length === 0 && view.visible.length > 0) {': 'If the contention has no points yet and columns are visible, do the next lines.',
    'var starter = addMainPoint(state.round, primaryContentionId, view.visible[0], "");': 'Create a blank starter point in the first speech column.',
    'state.selectedId = starter.id;': 'Select the starter point so the user can begin typing immediately.',
    'saveRoundAfterAMoment(true);': 'Save the round data immediately to browser storage.',
    'var layout = calculateCaseFlowLayout(state.round, caseSide, state.heights);': 'Calculate the vertical layout, card positions, and reply slots for this case.',
    'colElement.style.width = colWidth + "px";': 'Set the width of this speech column in pixels.',
    'colElement.dataset.speech = speechId;': 'Store the speech ID on the column element dataset.',
    'if (s % 2 === 1) {': 'If this is an odd-numbered column (alternating column), do the next lines.',
    'colElement.classList.add("alt-column");': 'Add the "alt-column" CSS class for alternating background tint.',
    'canvas.style.height = layout.height + "px";': 'Set the vertical drawing area height based on calculated flow layout.',
    'canvas.dataset.speech = speechId;': 'Store the speech ID on the column drawing area dataset.',
    'var noteIds = Object.keys(state.round.notes);': 'Get the list of all note IDs in the round.',
    'for (var n = 0; n < noteIds.length; n++) {': 'Loop through all note IDs in the round.',
    'var note = state.round.notes[noteIds[n]];': 'Get the individual note object.',
    'if (note.speechId === speechId && layout.positions[noteIds[n]]) {': 'If this note belongs in this column and has a calculated position, do the next lines.',
    'canvas.appendChild(renderPointCard(note));': 'Render the note card and place it into the column canvas.',
    'for (var sl = 0; sl < layout.slots.length; sl++) {': 'Loop through all calculated reply slots.',
    'var slot = layout.slots[sl];': 'Get the individual reply slot configuration.',
    'if (slot.speechId !== speechId) continue;': 'If this reply slot belongs to a different speech column, skip to the next one.',
    'var parentNote = state.round.notes[slot.parentId];': 'Look up the parent argument note this slot replies to.',
    'if (!parentNote) continue;': 'If the parent argument note does not exist, skip this slot.',
    'var slotBox = cloneTemplate("ans-slot");': 'Clone the reply slot button template from the page.',
    'slotBox.setAttribute("aria-label", "Response to " + (parentNote.text || "point"));': 'Set the accessibility label describing which argument this slot responds to.',
    'slotBox.dataset.parent = slot.parentId;': 'Attach the parent note ID to the reply slot dataset.',
    'slotBox.dataset.speech = speechId;': 'Attach the speech ID to the reply slot dataset.',
    'slotBox.style.top = slot.top + "px";': 'Set the vertical top position of the reply slot in pixels.',
    'canvas.appendChild(slotBox);': 'Place the reply slot button onto the column canvas.',
    'var addBtn = colElement.querySelector(".col-add-btn");': 'Find the "+ Add point" button in this column header.',
    'if (s === 0 && addBtn) {': 'If this is the first speech column and the add button exists, do the next lines.',
    'addBtn.classList.remove("hide");': 'Show the "+ Add point" button in the constructive column.',
    'addBtn.dataset.starter = primaryContentionId;': 'Attach the contention ID to the add button.',
    'addBtn.dataset.speech = speechId;': 'Attach the constructive speech ID to the add button.',
    'flowGrid.appendChild(colElement);': 'Append this speech column into the flowsheet grid.',
    'sheet.appendChild(flowGrid);': 'Append the full flowsheet grid into the flowsheet container.',
    'box.dataset.speech = note.speechId;': 'Attach the speech ID to the card box dataset.',
    'box.dataset.parent = note.parentId;': 'Attach the parent note ID to the card box dataset if replying.',
    'marker.className = "point-tag tag-" + note.marker + " " + note.marker;': 'Apply the badge CSS classes matching the marker type.',
    'var num = clipBtn.querySelector(".clip-number");': 'Find the clip number badge on the evidence button.',
    'if (note.evidenceId && state.round.evidence && state.round.evidence[note.evidenceId]) {': 'If this note has linked evidence research text, do the next lines.',
    'clipBtn.classList.add("has-proof", "has-ev");': 'Highlight the evidence button to show evidence is attached.',
    'if (num) {': 'If the number badge element exists, do the next lines.',
    'num.textContent = "1";': 'Display "1" to indicate attached evidence.',
    'showElement(num);': 'Show the number badge.',
    'clipBtn.classList.remove("has-proof", "has-ev");': 'Remove evidence highlight styling when no evidence is attached.',
    'num.textContent = "";': 'Clear the number badge text.',
    'hideElement(num);': 'Hide the number badge.',
    'var textHeight = Math.max(20, area.scrollHeight);': 'Measure the text scroll height, with a minimum of 20 pixels.',
    'var parentBox = area.closest(".point");': 'Find the parent note card element.',
    'if (parentBox) {': 'If the parent card element exists, do the next lines.',
    'var boxHeight = Math.max(58, parentBox.offsetHeight || parentBox.scrollHeight);': 'Measure the total card box height, with a minimum of 58 pixels.',
    'var canvases = document.querySelectorAll(".column-area");': 'Find all speech column drawing canvas elements.',
    'pointElement.style.minHeight = layout.positions[posKeys[p]].height + "px";': 'Set the minimum height of the card to match its flow layout row height.',
    'pointElement.style.height = "auto";': 'Allow the card height to adjust automatically based on content.',
    'var slotElement = document.querySelector(\'.reply-slot-btn[data-parent="\' + slot.parentId + \'"][data-speech="\' + slot.speechId + \'"]\');': 'Find the matching reply slot button element by parent and speech ID.',
    'if (!round) return;': 'If no round or preflow is currently open, stop here.',
    'var isPreflow = Boolean(round.isPreflow);': 'Check whether this open document is a preflow rather than a round.',
    'var editBox = document.getElementById("edit-box");': 'Find the Edit details popup modal element.',
    'var editHeading = editBox ? editBox.querySelector("h2") : null;': 'Find the heading element of the edit details dialog.',
    'if (editHeading) {': 'If the heading element exists, do the next lines.',
    'editHeading.textContent = isPreflow ? "Edit preflow details" : "Edit details";': 'Set heading to "Edit preflow details" or "Edit details".',
    'document.getElementById("edit-title").value = round.title || "";': 'Set the title input box to the round or preflow title.',
    'document.getElementById("edit-topic").value = round.topic || "";': 'Set the topic input box to the round or preflow topic.',
    'var tournamentWrap = document.getElementById("edit-tournament") ? document.getElementById("edit-tournament").closest(".form-line") : null;': 'Find the form row for the Tournament field.',
    'var roundLabelWrap = document.getElementById("edit-round-label") ? document.getElementById("edit-round-label").closest(".form-line") : null;': 'Find the form row for the Round Number field.',
    'var opponentWrap = document.getElementById("edit-opponent") ? document.getElementById("edit-opponent").closest(".form-line") : null;': 'Find the form row for the Opponent field.',
    'var lockNote = document.getElementById("edit-lock-note");': 'Find the explanation note for locked speaking order.',
    'var sideSelect = document.getElementById("edit-side");': 'Find the debate side dropdown select element.',
    'var obsOption = sideSelect ? sideSelect.querySelector(\'option[value="observer"]\') : null;': 'Find the Observer option in the side dropdown.',
    'if (isPreflow) {': 'If editing a preflow, do the next lines.',
    'if (tournamentWrap) hideElement(tournamentWrap);': 'Hide the tournament field since preflows do not have tournaments.',
    'if (roundLabelWrap) hideElement(roundLabelWrap);': 'Hide the round number field since preflows do not have round numbers.',
    'if (opponentWrap) hideElement(opponentWrap);': 'Hide the opponent field since preflows do not have opponents.',
    'if (firstWrap) hideElement(firstWrap);': 'Hide the first speaking side row for preflows.',
    'if (lockNote) hideElement(lockNote);': 'Hide the locked order note for preflows.',
    'if (obsOption) hideElement(obsOption);': 'Hide the Observer choice because preflows must be Aff or Neg.',
    'if (sideSelect) sideSelect.value = round.preflowSide || round.yourSide || "pro";': 'Set the side dropdown to Aff or Neg for this preflow.',
    'if (tournamentWrap) showElement(tournamentWrap);': 'Show the tournament field for debate rounds.',
    'if (roundLabelWrap) showElement(roundLabelWrap);': 'Show the round number field for debate rounds.',
    'if (opponentWrap) showElement(opponentWrap);': 'Show the opponent team field for debate rounds.',
    'if (obsOption) showElement(obsOption);': 'Show the Observer option for debate rounds.',
    'if (lockNote) showElement(lockNote);': 'Show the speaking order note for debate rounds.',
    'document.getElementById("edit-tournament").value = round.tournament || "";': 'Fill the tournament field with saved tournament text.',
    'document.getElementById("edit-round-label").value = round.roundLabel || "";': 'Fill the round number field with saved label text.',
    'document.getElementById("edit-opponent").value = round.opponent || "";': 'Fill the opponent field with saved opponent name.',
    'if (sideSelect) sideSelect.value = round.yourSide || "pro";': 'Set the debate side dropdown to the saved side.',
    'var noteMsg = "Who speaks first sets the speech order.";': 'Set default explanation note about speech order.',
    'noteMsg = "Who speaks first is locked because notes already follow this order. Start a new round for a different order.";': 'Explain that speaking order is locked because notes have already been entered.',
    'if (firstWrap) {': 'If the first speaking side container exists, do the next lines.',
    'document.getElementById("edit-first").value = round.firstSide || "pro";': 'Set first speaking side dropdown to the saved first side.',
    'if (lockNote) lockNote.textContent = noteMsg;': 'Update the speaking order explanation text.',
    'showElement(editBox);': 'Display the edit details popup modal.',
    'var nextTopic = document.getElementById("edit-topic").value.trim();': 'Read and trim the topic text from the topic input box.',
    'nextTitle = nextTopic || (isPreflow ? "Untitled preflow" : "Untitled round");': 'Default title to topic, or Untitled preflow / Untitled round.',
    'round.topic = nextTopic;': 'Save the updated topic on the round or preflow object.',
    'var nextSide = document.getElementById("edit-side").value;': 'Read the chosen debate side from the dropdown.',
    'if (nextSide !== "con") nextSide = "pro";': 'Ensure the preflow side is either pro (Aff) or con (Neg).',
    'var oldSide = round.preflowSide || round.yourSide || "pro";': 'Remember the previous side of the preflow.',
    'if (oldSide !== nextSide) {': 'If the debate side changed between Aff and Neg, do the next lines.',
    'round.preflowSide = nextSide;': 'Update the preflow side to the newly chosen side.',
    'round.yourSide = nextSide;': 'Update yourSide to the new debate side.',
    'round.firstSide = nextSide;': 'Update firstSide to match the new debate side.',
    'if (round.notes) {': 'If notes exist on this preflow, do the next lines.',
    'var noteKeys = Object.keys(round.notes);': 'Get the list of all note IDs.',
    'for (var nk = 0; nk < noteKeys.length; nk++) {': 'Loop through all note IDs.',
    'var nItem = round.notes[noteKeys[nk]];': 'Get the individual note object.',
    'if (nItem.speechId === oldSide + "-constructive") {': 'If this note belongs to the old constructive speech, do the next lines.',
    'nItem.speechId = nextSide + "-constructive";': 'Update the speech association to the new constructive speech.',
    'if (round.cases && round.cases[oldSide] && round.cases[nextSide]) {': 'If contention case mappings exist, do the next lines.',
    'round.cases[nextSide].contentionIds = round.cases[oldSide].contentionIds.slice();': 'Transfer contention IDs to the new case side.',
    'round.cases[oldSide].contentionIds = [];': 'Clear contention IDs from the old case side.',
    'round.timers = createNewTimer(nextSide, getDefaultSpeechTimes());': 'Reset the timer sequence for the new speaking side.',
    'if (db.preflows[round.id]) {': 'If this preflow exists in the database, do the next lines.',
    'var pre = db.preflows[round.id];': 'Retrieve the preflow record from the database.',
    'pre.title = round.title;': 'Save updated title to the preflow record.',
    'pre.topic = round.topic;': 'Save updated topic to the preflow record.',
    'pre.side = round.preflowSide;': 'Save updated side to the preflow record.',
    'pre.contentions = round.contentions;': 'Save contention tree to the preflow record.',
    'pre.contentionIds = round.cases[round.preflowSide].contentionIds;': 'Save contention IDs to the preflow record.',
    'pre.notes = round.notes;': 'Save argument notes to the preflow record.',
    'pre.evidence = round.evidence;': 'Save evidence research cards to the preflow record.',
    'pre.updatedAt = new Date().toISOString();': 'Record current timestamp on the preflow record.',
    'function isCaretAtBeginning(el) {': 'This is the isCaretAtBeginning helper. It checks if the text cursor is at the very start of a box.',
    'var sel = window.getSelection();': 'Get the current user selection or cursor position from the window.',
    'if (!sel || !sel.rangeCount) return true;': 'If there is no selection or range available, consider it at the beginning.',
    'var range = sel.getRangeAt(0);': 'Get the active selection range.',
    'if (!range.collapsed) return false;': 'If text is highlighted (not a collapsed blinking cursor), return false.',
    'var preRange = document.createRange();': 'Create a new range spanning from the beginning of the element to the cursor.',
    'preRange.selectNodeContents(el);': 'Select the entire contents of the text element.',
    'preRange.setEnd(range.startContainer, range.startOffset);': 'Set the end of the range to the current cursor position.',
    'return preRange.toString().length === 0;': 'Return true if the preceding text length is 0 (cursor is at the start).',
    'function isCaretAtEnd(el) {': 'This is the isCaretAtEnd helper. It checks if the text cursor is at the very end of a box.',
    'var postRange = document.createRange();': 'Create a new range spanning from the cursor to the end of the element.',
    'postRange.selectNodeContents(el);': 'Select the entire contents of the text element.',
    'postRange.setStart(range.endContainer, range.endOffset);': 'Set the start of the range to the current cursor position.',
    'return postRange.toString().length === 0;': 'Return true if the following text length is 0 (cursor is at the end).',
    'function navigatePointsWithArrows(from, key) {': 'This is the navigatePointsWithArrows function. It handles moving focus between cards and columns using keyboard arrow keys.',
    'var current = null;': 'Initialize the current focused element reference.',
    'if (typeof from === "string") {': 'If from is an argument note ID string, do the next lines.',
    'current = document.querySelector(\'.point[data-id="\' + from + \'"]\');': 'Find the note card DOM element by ID.',
    '} else if (from && from.nodeType) {': 'Otherwise if from is a DOM node element, do the next lines.',
    'current = from.closest(".point, .reply-box, .new-box");': 'Find the closest card or slot container.',
    'if (!current) return;': 'If no card or slot was found, stop here.',
    'var currentPoint = current.classList.contains("point") ? current : null;': 'Reference the card if the current element is a note point card.',
    'var currentPointId = currentPoint ? currentPoint.dataset.id : null;': 'Get the note ID of the active card.',
    'var currentNote = currentPointId && state.round ? state.round.notes[currentPointId] : null;': 'Get the active note data from the round.',
    'var currentColumn = current.closest(".speech-column");': 'Find the speech column container for the active element.',
    'if (!currentColumn) return;': 'If the element is not inside a speech column, stop here.',
    'var best = null;': 'Initialize variable to hold the best candidate element to receive focus next.',
    'if (key === "ArrowRight") {': 'When navigating right with the right arrow key, do the next lines.',
    'if (currentPointId) {': 'If the current element is an argument card, do the next lines.',
    'var childPoint = document.querySelector(\'.point[data-parent="\' + currentPointId + \'"]\');': 'Look for an existing direct reply card in the next column.',
    'if (childPoint) {': 'If a direct reply card exists, do the next lines.',
    'best = childPoint;': 'Choose that reply card as the target.',
    'var directSlot = document.querySelector(\'.reply-slot-btn[data-parent="\' + currentPointId + \'"]\');': 'Look for an open reply slot button for this argument card.',
    'if (directSlot) {': 'If an open reply slot exists, do the next lines.',
    'best = directSlot;': 'Choose that reply slot as the target.',
    'if (!best) {': 'If no direct reply or slot exists, do the next lines.',
    'var nextCol = currentColumn.nextElementSibling;': 'Look up the next speech column to the right.',
    'if (nextCol && nextCol.classList.contains("speech-column")) {': 'If a valid speech column exists to the right, do the next lines.',
    'var targets = nextCol.querySelectorAll(".point, .reply-slot-btn, .col-add-btn");': 'Collect all selectable cards, slots, and add buttons in that column.',
    'var currentRect = current.getBoundingClientRect();': 'Get the screen coordinates of the current element.',
    'var bestDist = -1;': 'Initialize shortest vertical distance tracker.',
    'for (var i = 0; i < targets.length; i++) {': 'Loop through candidate elements in the adjacent column.',
    'var r = targets[i].getBoundingClientRect();': 'Get the screen coordinates of the candidate target.',
    'var dist = Math.abs(r.top - currentRect.top);': 'Calculate vertical distance from the current element.',
    'if (bestDist < 0 || dist < bestDist) {': 'If this element is vertically closer than previous candidates, do the next lines.',
    'best = targets[i];': 'Select this candidate as the best target so far.',
    'bestDist = dist;': 'Update shortest vertical distance.',
    '} else if (key === "ArrowLeft") {': 'When navigating left with the left arrow key, do the next lines.',
    'if (currentNote && currentNote.parentId) {': 'If this note has a parent argument it is replying to, do the next lines.',
    'var parentEl = document.querySelector(\'.point[data-id="\' + currentNote.parentId + \'"]\');': 'Find the parent argument card in the previous column.',
    'if (parentEl) {': 'If the parent argument card element exists, do the next lines.',
    'best = parentEl;': 'Choose the parent argument card as the target.',
    'var prevCol = currentColumn.previousElementSibling;': 'Look up the previous speech column to the left.',
    'if (prevCol && prevCol.classList.contains("speech-column")) {': 'If a valid speech column exists to the left, do the next lines.',
    'var prevTargets = prevCol.querySelectorAll(".point, .reply-slot-btn, .col-add-btn");': 'Collect all selectable elements in that column.',
    'var pCurrentRect = current.getBoundingClientRect();': 'Get the screen coordinates of the current element.',
    'var pBestDist = -1;': 'Initialize shortest distance tracker.',
    'for (var p = 0; p < prevTargets.length; p++) {': 'Loop through candidate elements in the previous column.',
    'var pr = prevTargets[p].getBoundingClientRect();': 'Get the screen coordinates of the candidate target.',
    'var pDist = Math.abs(pr.top - pCurrentRect.top);': 'Calculate vertical distance.',
    'if (pBestDist < 0 || pDist < pBestDist) {': 'If closer than previous candidates, do the next lines.',
    'best = prevTargets[p];': 'Select this candidate as the best target.',
    'pBestDist = pDist;': 'Update shortest distance.',
    '} else if (key === "ArrowDown") {': 'When navigating down within the same column, do the next lines.',
    'var downBoxes = Array.prototype.slice.call(currentColumn.querySelectorAll(".point, .reply-slot-btn, .col-add-btn"));': 'Collect all cards and buttons in this column from top to bottom.',
    'var downIdx = downBoxes.indexOf(current);': 'Find the index of the currently focused box.',
    'if (downIdx >= 0 && downIdx < downBoxes.length - 1) {': 'If there is another box below this one, do the next lines.',
    'best = downBoxes[downIdx + 1];': 'Select the next box below.',
    '} else if (key === "ArrowUp") {': 'When navigating up within the same column, do the next lines.',
    'var upBoxes = Array.prototype.slice.call(currentColumn.querySelectorAll(".point, .reply-slot-btn, .col-add-btn"));': 'Collect all cards and buttons in this column from top to bottom.',
    'var upIdx = upBoxes.indexOf(current);': 'Find the index of the currently focused box.',
    'if (upIdx > 0) {': 'If there is a box above this one, do the next lines.',
    'best = upBoxes[upIdx - 1];': 'Select the box above.',
    'if (!best) return;': 'If no valid target was found in that direction, stop here.',
    'if (best.classList.contains("point")) {': 'If the target is an argument point card, do the next lines.',
    'selectPointCard(best.dataset.id, state.evidenceOpen);': 'Select this card and update research evidence drawer.',
    'var input = best.querySelector(".point-input");': 'Find the editable text area of the target card.',
    'if (input) {': 'If the text input area exists, do the next lines.',
    'input.focus();': 'Focus the text input cursor inside the card.',
    'best.focus();': 'Focus the target element.',
    '} else if (action === "add-reply") {': 'Otherwise, if the clicked action is "add-reply", do the next lines.',
    'var parentId = trigger.dataset.parent;': 'Read the parent argument ID from the clicked button dataset.',
    'var speechId = trigger.dataset.speech;': 'Read the speech ID from the clicked button dataset.',
    'var newReply = addReplyPoint(state.round, parentId, speechId, "");': 'Create a new blank reply card linked to the parent point.',
    'state.selectedId = newReply.id;': 'Select the newly created reply card.',
    'focusPointInput(newReply.id, 0);': 'Move the typing focus into the new reply card.',
    '} else if (action === "add-main-point") {': 'Otherwise, if the clicked action is "add-main-point", do the next lines.',
    'var starterId = trigger.dataset.starter;': 'Read the contention ID from the clicked button dataset.',
    'var spId = trigger.dataset.speech;': 'Read the speech ID from the clicked button dataset.',
    'var newPoint = addMainPoint(state.round, starterId, spId, "");': 'Create a new constructive main argument point.',
    'state.selectedId = newPoint.id;': 'Select the newly created main point.',
    'focusPointInput(newPoint.id, 0);': 'Move the typing focus into the new main point.',
    'var isZ = event.key && event.key.toLowerCase() === "z";': 'Check if the pressed key is "z" or "Z".',
    'var isY = event.key && event.key.toLowerCase() === "y";': 'Check if the pressed key is "y" or "Y".',
    'var isModifier = event.ctrlKey || event.metaKey;': 'Check if Control or Command (Cmd) modifier key is held.',
    'if (isModifier && isZ) {': 'If Ctrl+Z or Cmd+Z is pressed, do the next lines.',
    'if (isModifier && isY) {': 'If Ctrl+Y or Cmd+Y is pressed, do the next lines.',
    'if (event.key === "Enter" && event.shiftKey && !state.composing && !event.isComposing) {': 'If Shift+Enter is pressed while typing in a point, do the next lines.',
    'var replySlot = document.querySelector(\'.reply-slot-btn[data-parent="\' + pointId + \'"]\');': 'Look for an open reply slot in the next column.',
    'if (replySlot) {': 'If a reply slot exists, do the next lines.',
    'var pId = replySlot.dataset.parent;': 'Read the parent ID from the slot dataset.',
    'var spId = replySlot.dataset.speech;': 'Read the speech ID from the slot dataset.',
    'var note = addReplyPoint(state.round, pId, spId, "");': 'Create a new reply point in that column.',
    'focusPointInput(note.id, 0);': 'Move typing focus into the newly created reply point.',
    'var currentCol = target.closest(".speech-column");': 'Find the current speech column.',
    'var nextCol = currentCol ? currentCol.nextElementSibling : null;': 'Find the next speech column to the right.',
    'if (nextCol && nextCol.dataset.speech) {': 'If there is a valid next speech column, do the next lines.',
    'var note = addReplyPoint(state.round, pointId, nextCol.dataset.speech, "");': 'Add a reply point into that speech column.',
    'if (event.key === "Escape") {': 'If the Escape key is pressed, do the next lines.',
    'if (event.key === "Tab") {': 'If the Tab key is pressed to navigate between cards, do the next lines.',
    'var foundBoxes = Array.prototype.slice.call(document.querySelectorAll(".point, .reply-slot-btn, .col-add-btn"));': 'Collect all selectable elements across the flowsheet.',
    'var currentCard = target.closest(".point");': 'Find the active note card.',
    'var index = foundBoxes.indexOf(currentCard);': 'Find its position index in the list.',
    'var step = event.shiftKey ? -1 : 1;': 'Move backwards if Shift is held, otherwise move forward.',
    'var next = foundBoxes[index + step];': 'Get the next element in tab sequence.',
    'if (next.classList.contains("point")) {': 'If the next element is a note card, do the next lines.',
    'selectPointCard(next.dataset.id, state.evidenceOpen);': 'Select the next note card.',
    'var nextInput = next.querySelector(".point-input");': 'Find the text input area of the next card.',
    'if (nextInput) {': 'If the input area exists, do the next lines.',
    'nextInput.focus();': 'Focus the text cursor in the next card.',
    'if (event.key.indexOf("Arrow") === 0) {': 'If any arrow key was pressed, do the next lines.',
    'var shouldNavigate = event.altKey;': 'Check if the Alt key is held for immediate navigation.',
    'if (!shouldNavigate) {': 'If Alt is not held, check if caret is at the boundary.',
    'if (event.key === "ArrowUp" || event.key === "ArrowLeft") {': 'If moving up or left, do the next lines.',
    'shouldNavigate = isCaretAtBeginning(target);': 'Navigate only if the cursor has reached the start of the text.',
    '} else if (event.key === "ArrowDown" || event.key === "ArrowRight") {': 'If moving down or right, do the next lines.',
    'shouldNavigate = isCaretAtEnd(target);': 'Navigate only if the cursor has reached the end of the text.',
    'if (shouldNavigate) {': 'If cursor boundary or Alt modifier indicates navigation, do the next lines.',
    'navigatePointsWithArrows(target, event.key);': 'Navigate focus in the direction of the pressed arrow key.',
    'if (target.classList && (target.classList.contains("reply-slot-btn") || target.classList.contains("col-add-btn"))) {': 'If a reply slot or add button currently has keyboard focus, do the next lines.',
    'if (event.key === "Enter" || event.key === " ") {': 'If Enter or Spacebar is pressed on the button, do the next lines.',
    'target.click();': 'Trigger the button click to create the point.',
    'if (target.classList && target.classList.contains("point") && !target.classList.contains("point-input")) {': 'If keyboard focus is on the card container rather than inside its text editor, do the next lines.',
    'var pId = target.dataset.id;': 'Read the note card ID from the dataset.',
    'navigatePointsWithArrows(pId, event.key);': 'Navigate between cards using arrow keys.'
}

# Combine mapping and custom
full_map = dict(mapping)
full_map.update(custom)

# Generate output
output_lines = [
    "workspace.js",
    "Debate page. This file draws the flow, the points, the evidence, and the flowsheet navigation.",
    "",
    "Read it from top to bottom. Each code line is followed by what that line does.",
    ""
]

for line in js_lines:
    s = line.strip()
    if not s:
        output_lines.append("")
        continue
    
    output_lines.append(line)
    
    if s in full_map:
        output_lines.append(full_map[s])
    elif s.startswith('//'):
        output_lines.append('This is a comment describing the code below.')
    elif s == '}' or s == '};' or s == '});' or s == ');':
        output_lines.append('This closes the block above.')
    elif s == '{':
        output_lines.append('This begins the block above.')
    elif s.startswith('function ') or ' = function' in s:
        func_name = s.split('function')[1].split('(')[0].strip() if 'function' in s else s
        output_lines.append(f'This is the {func_name} function.')
    elif s.startswith('var ') or s.startswith('let ') or s.startswith('const '):
        output_lines.append(f'Set up the {s.split()[1]} variable.')
    elif s.startswith('if (') or s.startswith('} else if (') or s.startswith('else if ('):
        output_lines.append('Check the condition above and run the block if true.')
    elif s == '} else {':
        output_lines.append('Otherwise, run the alternative block below.')
    elif s.startswith('for (') or s.startswith('while ('):
        output_lines.append('Loop through the sequence described above.')
    elif s.startswith('return ') or s == 'return;':
        output_lines.append('Return the result and exit the current function.')
    else:
        output_lines.append('Execute the statement above.')
    output_lines.append("")

with open('explanations/workspace.txt', 'w', encoding='utf-8') as out:
    out.write('\n'.join(output_lines).rstrip() + '\n')

print("Generated explanations/workspace.txt successfully!")
