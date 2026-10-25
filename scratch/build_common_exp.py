import os

# Read js/common.js
with open('js/common.js', 'r', encoding='utf-8') as f:
    js_lines = [l.rstrip('\r\n') for l in f.readlines()]

# Read existing explanations/common.txt into mapping
with open('explanations/common.txt', 'r', encoding='utf-8') as f:
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

custom = {
    '"pro-constructive": { team: "pro", type: "constructive", short: "Aff Constr.", full: "Aff Constructive" },': 'Configure Affirmative Constructive speech details.',
    '"con-constructive": { team: "con", type: "constructive", short: "Neg Constr.", full: "Neg Constructive" },': 'Configure Negative Constructive speech details.',
    '"pro-rebuttal": { team: "pro", type: "rebuttal", short: "Aff Reb.", full: "Aff Rebuttal" },': 'Configure Affirmative Rebuttal speech details.',
    '"con-rebuttal": { team: "con", type: "rebuttal", short: "Neg Reb.", full: "Neg Rebuttal" },': 'Configure Negative Rebuttal speech details.',
    '"pro-summary": { team: "pro", type: "summary", short: "Aff Sum.", full: "Aff Summary" },': 'Configure Affirmative Summary speech details.',
    '"con-summary": { team: "con", type: "summary", short: "Neg Sum.", full: "Neg Summary" },': 'Configure Negative Summary speech details.',
    '"pro-final": { team: "pro", type: "final", short: "Aff FF", full: "Aff Final Focus" },': 'Configure Affirmative Final Focus speech details.',
    '"con-final": { team: "con", type: "final", short: "Neg FF", full: "Neg Final Focus" }': 'Configure Negative Final Focus speech details.',
    'if (side === "pro" || side === "aff") {': 'If the side identifier is pro or aff, do the next lines.',
    'return "Aff";': 'Return "Aff" as the display team name.',
    'return "Neg";': 'Return "Neg" as the display team name.',
    'if (value && value >= 56) return value;': 'If height value exists and is at least 56px, return it directly.',
    'visual += Math.max(1, Math.ceil((lines[i].length || 1) / 28));': 'Calculate estimated line wraps based on character length.',
    'return Math.max(58, visual * 20 + 38);': 'Calculate card height with minimum 58px plus padding.',
    'function calculateCaseFlowLayout(round, caseSide, heights) {': 'This is the calculateCaseFlowLayout function. It calculates card positions and reply slot coordinates.',
    'var contentionIds = (round.cases[caseSide] && round.cases[caseSide].contentionIds) || [];': 'Retrieve the contention ID array for this case side.',
    'for (var c = 0; c < contentionIds.length; c++) {': 'Loop through all contentions for this side.',
    'var contention = round.contentions[contentionIds[c]];': 'Retrieve the contention object from round data.',
    'y += threadSpace + 12;': 'Advance the vertical spacing position for the next argument chain.',
    'height: bottom > 0 ? Math.max(bottom, 60) : 0': 'Set the total canvas height based on the lowest card or slot.',
    'if (contention) {': 'If the contention object exists, do the next lines.',
    'return calculateCaseFlowLayout(round, caseSide, heights);': 'Calculate and return the case flow layout.',
    'if (side === "con" || side === "neg") return "Neg";': 'Format con or neg sides as "Neg".',
    'if (side === "pro" || side === "aff") return "Aff";': 'Format pro or aff sides as "Aff".',
    'sessionStorage.removeItem("tourDemo");': 'Clear stored tour demo state.',
    'sessionStorage.removeItem("tourRound");': 'Clear stored tour round ID.',
    'sessionStorage.removeItem("tourStep");': 'Clear stored tour step index.',
    'sessionStorage.removeItem("tourReturn");': 'Clear stored tour return page.',
    'state.demo = false;': 'Disable demo state flag.',
    'if (!pop) return;': 'If timer popover element was not found, stop here.',
    'if (state.popover === pop) {': 'If the timer popover is already open, do the next lines.',
    'ms = Math.max(0, timers.deadline - Date.now());': 'Calculate remaining countdown time in milliseconds.',
    'startBtn.textContent = timers.running ? "Pause" : "Start";': 'Set timer toggle button text to Pause or Start.',
    'pop.style.top = "14px";': 'Position popover 14px from top.',
    'pop.style.right = "18px";': 'Position popover 18px from right corner so it never obscures debate cards.',
    'pop.style.left = "auto";': 'Set left position to auto.',
    'showElement(pop);': 'Display the timer popover.',
    'state.popover = pop;': 'Record active popover in application state.',
    'if (amount <= 0) amount = 240000;': 'Default speech duration to 4 minutes (240,000 ms) if empty or zero.',
    'fillTimerInputs(amount);': 'Fill the minutes and seconds inputs with the selected time.',
    'var first = "Aff speaks first";': 'Default speaking order text to Aff speaks first.',
    'if (state.round.firstSide === "con" || state.round.firstSide === "neg") {': 'If Neg speaks first, do the next lines.',
    'first = "Neg speaks first";': 'Set speaking order text to Neg speaks first.',
    'var side = "You are Aff";': 'Default side indicator to You are Aff.',
    '} else if (your === "con" || your === "neg") {': 'If your side is con or neg, do the next lines.',
    'side = "You are Neg";': 'Set side indicator to You are Neg.',
    'if (!state.round || state.round.isPreflow || !state.round.timers || !state.round.timers.running) {': 'If no round is open or timers are not running, skip timer tick.',
    'function preparePrintLayout(includeEvidence) {': 'This is the preparePrintLayout function. It builds clean monochrome flowsheet tables for PDF export.',
    'var round = state.round;': 'Get the current round from application state.',
    'var printTitle = round.title || "Debate Round";': 'Get the debate round title or default to Debate Round.',
    'var titleEl = document.getElementById("print-title");': 'Find the print report title element.',
    'if (titleEl) {': 'If the title element exists, do the next lines.',
    'titleEl.textContent = printTitle;': 'Set the print header title text.',
    'var topicLine = round.topic ? "Topic / Resolution: " + round.topic : "";': 'Format the topic line text.',
    'setElementText(document.getElementById("print-topic"), topicLine);': 'Display the topic line in the print header.',
    'var tournamentLine = round.tournament ? "Tournament: " + round.tournament : "";': 'Format the tournament name text.',
    'var roundNumberLine = round.roundLabel ? "Round Number: " + round.roundLabel : "";': 'Format the round number text.',
    'var opponentLine = round.opponent ? "vs " + round.opponent : "";': 'Format the opponent team text.',
    'var firstSideLine = round.firstSide ? formatSideName(round.firstSide) + " speaks first" : "";': 'Format the first speaking side line.',
    'var metaLine = joinFilledText([': 'Combine metadata fields with divider lines.',
    'tournamentLine,': 'Include tournament name.',
    'roundNumberLine,': 'Include round number.',
    'opponentLine,': 'Include opponent name.',
    '"Your Side: " + formatSideName(round.yourSide),': 'Include your debate side.',
    'firstSideLine': 'Include first speaker side.',
    '], "   |   ");': 'Separate metadata fields with vertical pipes.',
    'setElementText(document.getElementById("print-meta"), metaLine);': 'Display the metadata line in the print report header.',
    'var body = document.getElementById("print-body");': 'Find the print report body container.',
    'if (!body) return;': 'If print body container does not exist, stop here.',
    'clearElement(body);': 'Clear any existing content from print body container.',
    'for (var sideIndex = 0; sideIndex < sides.length; sideIndex++) {': 'Loop through debate sides (Aff and Neg).',
    'var caseSide = sides[sideIndex];': 'Get the case side (pro or con).',
    'var section = cloneTemplate("print-case-sample");': 'Clone the case section template.',
    'if (sideIndex === 1) {': 'If this is the second case side (Neg), do the next lines.',
    'section.classList.add("new-page");': 'Add page break so Neg case starts on a fresh page.',
    'var caseTitle = caseSide === "pro" ? "AFF CASE" : "NEG CASE";': 'Label section as AFF CASE or NEG CASE.',
    'section.querySelector(".print-case-name").textContent = caseTitle + " FLOW";': 'Set case section title text.',
    'var speeches = getSpeechesForSide(round, caseSide);': 'Get speech sequence list for this debate side.',
    'for (var g = 0; g < groupIds.length; g++) {': 'Loop through contention groups.',
    'var contention = round.contentions[groupIds[g]];': 'Retrieve contention object from round data.',
    'var block = cloneTemplate("print-cont");': 'Clone contention table template block.',
    'if (!block) {': 'If template is missing, do the next lines.',
    'block = document.createElement("div");': 'Create fallback container element for contention table.',
    'block.className = "print-group";': 'Assign "print-group" class name.',
    'block.innerHTML = \'<h3 class="print-group-name"></h3><table class="print-table"><thead><tr></tr></thead><tbody></tbody></table>\';': 'Create table structure with header and body.',
    'var groupHeader = block.querySelector(".print-group-name");': 'Find contention group header element.',
    'if (groupHeader) {': 'If group header element exists, do the next lines.',
    'if (contention.name && contention.name !== "Contention 1" && contention.name !== "Opening Case") {': 'If custom contention name is defined, do the next lines.',
    'groupHeader.textContent = contention.name;': 'Set contention heading text.',
    'hideElement(groupHeader);': 'Hide group header when default name is used.',
    'var headRow = block.querySelector("thead tr");': 'Find table header row element.',
    'if (!headRow) {': 'If header row is missing, do the next lines.',
    'var thead = block.querySelector("thead") || block.querySelector("table").appendChild(document.createElement("thead"));': 'Create thead element.',
    'headRow = thead.appendChild(document.createElement("tr"));': 'Append header tr element.',
    'for (var s = 0; s < speeches.length; s++) {': 'Loop through speeches to build table column headers.',
    'var th = document.createElement("th");': 'Create header cell element.',
    'th.className = "print-head " + (SPEECHES[speeches[s]].team || "");': 'Set header cell CSS class with team badge.',
    'th.textContent = SPEECHES[speeches[s]].short;': 'Set header cell text to speech short title.',
    'headRow.appendChild(th);': 'Append header cell into table header row.',
    'var tbody = block.querySelector("tbody");': 'Find table body element.',
    'if (!tbody) {': 'If table body element is missing, do the next lines.',
    'tbody = block.querySelector("table").appendChild(document.createElement("tbody"));': 'Create and append tbody element.',
    'var startingPointIds = (contention.startingPointIds || []).slice();': 'Copy starting point IDs for this contention.',
    'var allNotes = getListFromObject(round.notes);': 'Get list of all notes in this round.',
    'for (var an = 0; an < allNotes.length; an++) {': 'Loop through all notes to collect unlinked starting points.',
    'var nt = allNotes[an];': 'Get individual note object.',
    'if (nt.contentionId === groupIds[g] && !nt.parentId && startingPointIds.indexOf(nt.id) === -1) {': 'If note belongs to this contention without a parent, do the next lines.',
    'startingPointIds.push(nt.id);': 'Add note ID to starting points list.',
    'for (var p = 0; p < startingPointIds.length; p++) {': 'Loop through starting points to build flowsheet rows.',
    'var startId = startingPointIds[p];': 'Get ID of starting point for this row.',
    'var family = getAllChildPoints(round, startId, []);': 'Collect all reply notes in this argument chain.',
    'var tr = document.createElement("tr");': 'Create table row element.',
    'tr.className = "print-row";': 'Set class name to "print-row".',
    'var rowHasContent = false;': 'Track whether any cell in this row has non-empty text or evidence.',
    'for (var sp = 0; sp < speeches.length; sp++) {': 'Loop through speech columns.',
    'var td = document.createElement("td");': 'Create table cell element.',
    'td.className = "print-cell";': 'Set class name to "print-cell".',
    'var noteList = getListFromObject(round.notes);': 'Get note list from round.',
    'for (var n = 0; n < noteList.length; n++) {': 'Loop through notes.',
    'var item = noteList[n];': 'Get individual note.',
    'if (item.contentionId !== groupIds[g] || item.speechId !== speeches[sp]) continue;': 'If note is from another contention or speech, skip it.',
    'if (family.indexOf(item.id) === -1) continue;': 'If note does not belong to this argument chain, skip it.',
    'var hasText = Boolean(item.text && item.text.trim());': 'Check if note contains argument text.',
    'var hasEvidence = Boolean(includeEvidence && item.evidenceId && round.evidence[item.evidenceId] && round.evidence[item.evidenceId].plain && round.evidence[item.evidenceId].plain.trim());': 'Check if note contains research evidence text.',
    'if (!hasText && !hasEvidence) continue;': 'Skip empty cards without text or evidence.',
    'rowHasContent = true;': 'Mark that this row contains actual argument content.',
    'var card = cloneTemplate("print-card");': 'Clone print card template.',
    'card.className = "print-card";': 'Assign "print-card" class name.',
    'card.innerHTML = \'<span class="print-tag hide"></span><div class="print-words"></div><div class="print-proof hide"></div>\';': 'Build card markup structure.',
    'var marker = card.querySelector(".print-tag");': 'Find card marker badge element.',
    'if (marker) {': 'If marker element exists, do the next lines.',
    'if (item.marker) {': 'If note has a marker badge, do the next lines.',
    'marker.textContent = getMarkerLabel(item.marker);': 'Set marker badge text.',
    'showElement(marker);': 'Show marker badge.',
    'hideElement(marker);': 'Hide marker badge.',
    'var pointWords = item.text || "";': 'Get argument text or empty string.',
    'var wordsBox = card.querySelector(".print-words");': 'Find text container element in print card.',
    'if (wordsBox) {': 'If words container exists, do the next lines.',
    'if (item.html) {': 'If note has formatted HTML, do the next lines.',
    'wordsBox.innerHTML = cleanPastedHtml(item.html).html;': 'Clean and insert formatted text HTML.',
    'wordsBox.textContent = pointWords;': 'Set plain argument text.',
    'var evBox = card.querySelector(".print-proof");': 'Find evidence quote box in print card.',
    'if (evBox) {': 'If evidence container exists, do the next lines.',
    'if (includeEvidence && item.evidenceId && round.evidence[item.evidenceId]) {': 'If evidence is included and exists for this note, do the next lines.',
    'var proofText = round.evidence[item.evidenceId].plain || "";': 'Get plain evidence text.',
    'evBox.textContent = "Proof: " + proofText;': 'Display evidence text with Proof: label.',
    'showElement(evBox);': 'Show evidence quote box.',
    'hideElement(evBox);': 'Hide evidence quote box.',
    'td.appendChild(card);': 'Append card into table cell.',
    'tr.appendChild(td);': 'Append cell into table row.',
    'if (rowHasContent) {': 'If this row has actual content, do the next lines.',
    'tbody.appendChild(tr);': 'Append row to table body.',
    'if (tbody.children.length === 0) {': 'If table has no rows with content, do the next lines.',
    'var emptyTr = document.createElement("tr");': 'Create empty fallback row.',
    'emptyTr.className = "print-row";': 'Set class name to "print-row".',
    'for (var esp = 0; esp < speeches.length; esp++) {': 'Loop through speeches.',
    'var emptyTd = document.createElement("td");': 'Create empty table cell.',
    'emptyTd.className = "print-cell";': 'Set class name to "print-cell".',
    'emptyTr.appendChild(emptyTd);': 'Append empty cell to row.',
    'tbody.appendChild(emptyTr);': 'Append empty row to table.',
    'section.appendChild(block);': 'Append contention table block into case section.',
    'body.appendChild(section);': 'Append case section into print report body.',
    'var extra = cloneTemplate("print-cx");': 'Clone crossfire notes section template.',
    'extra.className = "print-notes new-page";': 'Set class name with page break before crossfire notes.',
    'extra.innerHTML = \'<h2 class="print-case-name">CROSSFIRE &amp; REFLECTION NOTES</h2>\';': 'Set crossfire section heading.',
    'extra.classList.add("new-page");': 'Add page break class before crossfire notes.',
    'var extraNotes = [': 'Prepare array of crossfire and reflection notes.',
    '["First Crossfire", round.crossNotes.firstCrossfire],': 'Include First Crossfire note.',
    '["Second Crossfire", round.crossNotes.secondCrossfire],': 'Include Second Crossfire note.',
    '["Grand Crossfire", round.crossNotes.grandCrossfire],': 'Include Grand Crossfire note.',
    '["Reflections & Decision", round.crossNotes.reflections]': 'Include Reflections & Decision note.',
    '];': 'Close notes array.',
    'for (var e = 0; e < extraNotes.length; e++) {': 'Loop through crossfire notes.',
    'if (extraNotes[e][1] && extraNotes[e][1].trim()) {': 'If note has text, do the next lines.',
    'var cxCard = cloneTemplate("print-cx-card");': 'Clone crossfire card template.',
    'cxCard.className = "print-note";': 'Set class name to "print-note".',
    'cxCard.innerHTML = \'<h3 class="print-note-name"></h3><div class="print-note-words"></div>\';': 'Create note heading and words container.',
    'var nameEl = cxCard.querySelector(".print-note-name");': 'Find note heading element.',
    'if (nameEl) nameEl.textContent = extraNotes[e][0];': 'Set note category title text.',
    'var wordsEl = cxCard.querySelector(".print-note-words");': 'Find note content container.',
    'if (wordsEl) wordsEl.textContent = extraNotes[e][1];': 'Set note content text.',
    'extra.appendChild(cxCard);': 'Append crossfire card into section.',
    'body.appendChild(extra);': 'Append crossfire section into print body.',
    'function downloadPdfReport(includeEvidence) {': 'This is the downloadPdfReport function. It exports the flowsheet report as a downloadable PDF.',
    'var report = document.getElementById("full-print-report");': 'Find the print report container element.',
    'var downloadBtn = document.getElementById("btn-download-pdf");': 'Find the Download PDF button.',
    'var originalBtnText = downloadBtn ? downloadBtn.textContent : "Download PDF";': 'Save the original button text.',
    'if (downloadBtn) {': 'If download button exists, do the next lines.',
    'downloadBtn.textContent = "Generating PDF...";': 'Update button text to Generating PDF....',
    'downloadBtn.disabled = true;': 'Disable button while PDF is being generated.',
    'preparePrintLayout(includeEvidence);': 'Build the flowsheet print tables.',
    'report.style.display = "block";': 'Show the print report element in-flow.',
    'report.style.width = "1000px";': 'Set explicit width for PDF canvas capture.',
    'report.style.background = "#ffffff";': 'Set white background for PDF page.',
    'report.style.padding = "24px";': 'Set 24px padding around report.',
    'report.style.margin = "0 auto";': 'Center report horizontally.',
    'report.style.boxSizing = "border-box";': 'Use border-box sizing.',
    'var rawTitle = round && round.title ? round.title : "Debate";': 'Get raw round title or default to Debate.',
    'var safeTitle = rawTitle.replace(/[^a-zA-Z0-9_\\- ]/g, "").trim().replace(/\\s+/g, "_");': 'Sanitize title for safe filename.',
    'var filename = (safeTitle || "Debate_Flow") + ".pdf";': 'Construct PDF filename.',
    'var opt = {': 'Configure html2pdf export options.',
    'margin: [8, 8, 8, 8],': 'Set 8mm margins on all sides.',
    'filename: filename,': 'Specify the output PDF filename.',
    'image: { type: "jpeg", quality: 0.98 },': 'Use high-quality JPEG compression.',
    'html2canvas: {': 'Configure html2canvas rendering options.',
    'scale: 1.5,': 'Render at 1.5x scale for sharp text.',
    'useCORS: true,': 'Enable CORS for loaded assets.',
    'backgroundColor: "#ffffff",': 'Set white background color for canvas.',
    'windowWidth: 1060': 'Set capture window width to 1060px.',
    'jsPDF: {': 'Configure jsPDF output options.',
    'unit: "mm",': 'Use millimeters as unit of measure.',
    'format: "a4",': 'Use standard A4 paper size.',
    'orientation: "landscape"': 'Use landscape page orientation for wide flowsheets.',
    'pagebreak: { mode: ["css", "legacy"] }': 'Honor CSS page breaks between cases.',
    'function finishExport() {': 'This is the finishExport helper. It cleans up temporary print report styles after export.',
    'report.style.display = "none";': 'Hide print report element.',
    'report.style.width = "";': 'Reset report width.',
    'report.style.padding = "";': 'Reset report padding.',
    'report.style.margin = "";': 'Reset report margin.',
    'report.style.background = "";': 'Reset report background.',
    'downloadBtn.textContent = originalBtnText;': 'Restore original button label.',
    'downloadBtn.disabled = false;': 'Re-enable download button.',
    'if (typeof html2pdf !== "undefined") {': 'If html2pdf library is loaded, do the next lines.',
    'html2pdf().set(opt).from(report).save().then(function () {': 'Generate and download the PDF file.',
    'finishExport();': 'Clean up export styles.',
    '}).catch(function (err) {': 'Handle any export error.',
    'console.error("PDF export error:", err);': 'Log export error to console.',
    'window.print();': 'Fall back to browser print dialog.',
    '} else if (action === "print") {': 'Otherwise, if the clicked action is "print", do the next lines.',
    'showElement(document.getElementById("print-box"));': 'Open the Print / Save PDF dialog modal.',
    '} else if (action === "do-print") {': 'Otherwise, if the clicked action is "do-print", do the next lines.',
    'var checkEl = document.getElementById("print-evidence");': 'Find evidence inclusion checkbox.',
    'downloadPdfReport(checkEl ? checkEl.checked : true);': 'Start PDF download with evidence setting.',
    '} else if (action === "print-browser") {': 'Otherwise, if the clicked action is "print-browser", do the next lines.',
    'preparePrintLayout(checkEl ? checkEl.checked : true);': 'Prepare print layout for browser printing.'
}

full_map = dict(mapping)
full_map.update(custom)

output_lines = [
    "common.js",
    "Shared script. Every page loads this first. It stores the speeches, the saved data, and the helpers the other scripts call.",
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

with open('explanations/common.txt', 'w', encoding='utf-8') as out:
    out.write('\n'.join(output_lines).rstrip() + '\n')

print("Generated explanations/common.txt successfully!")
