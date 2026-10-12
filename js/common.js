var SPEECHES = {
  "pro-constructive": { team: "pro", type: "constructive", short: "Pro Constr.", full: "Pro Constructive" },
  "con-constructive": { team: "con", type: "constructive", short: "Con Constr.", full: "Con Constructive" },
  "pro-rebuttal": { team: "pro", type: "rebuttal", short: "Pro Reb.", full: "Pro Rebuttal" },
  "con-rebuttal": { team: "con", type: "rebuttal", short: "Con Reb.", full: "Con Rebuttal" },
  "pro-summary": { team: "pro", type: "summary", short: "Pro Sum.", full: "Pro Summary" },
  "con-summary": { team: "con", type: "summary", short: "Con Sum.", full: "Con Summary" },
  "pro-final": { team: "pro", type: "final", short: "Pro FF", full: "Pro Final Focus" },
  "con-final": { team: "con", type: "final", short: "Con FF", full: "Con Final Focus" }
};

var MARKERS = [
  { id: "", label: "None" },
  { id: "answered", label: "Answered" },
  { id: "extend", label: "Extend" },
  { id: "dropped", label: "Dropped" },
  { id: "turn", label: "Turn" }
];

var STORE_KEY = "goWithTheFlow";
var BACKUP_KEY = "goWithTheFlowBackup";

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

function createUniqueId(prefix) {
  var randomPart = Math.floor(Math.random() * 100000).toString(36);
  var timePart = Date.now().toString(36);
  return prefix + "-" + timePart + "-" + randomPart;
}

function timerTimes() {
  return {
    constructive: 240,
    rebuttal: 240,
    summary: 180,
    final: 120,
    crossfire: 180,
    grand: 180,
    prep: 180
  };
}

function validateSpeechTime(kind, rawTime) {
  var num = Number(rawTime);
  var label = kind;
  if (kind === "final") {
    label = "final focus";
  } else if (kind === "grand") {
    label = "grand cross";
  } else if (kind === "prep") {
    label = "prep";
  }

  if (!isFinite(num) || num <= 0) {
    return { ok: false, seconds: 0, message: label + " has to be a positive time." };
  }
  if (num > 20 * 60) {
    return { ok: false, seconds: 0, message: label + " over 20 minutes isn't a PF clock." };
  }
  if (num <= 15) {
    var inSeconds = Math.round(num * 60);
    return {
      ok: true,
      seconds: inSeconds,
      message: label + ": " + num + " min saved as " + inSeconds + " seconds."
    };
  }
  return { ok: true, seconds: Math.round(num), message: "" };
}

function repairTimerSettings(durations) {
  var base = timerTimes();
  var keys = Object.keys(base);
  if (!durations || typeof durations !== "object") {
    return base;
  }
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var n = Number(durations[key]);
    if (!isFinite(n) || n <= 0 || n > 20 * 60) {
      durations[key] = base[key];
    } else {
      durations[key] = Math.round(n);
    }
  }
  return durations;
}

function getDefaultSettings() {
  return {
    fontSize: 14,
    sound: false,
    durations: timerTimes()
  };
}

function sortPointsByOrder(list) {
  var temp;
  for (var i = 0; i < list.length; i++) {
    for (var j = i + 1; j < list.length; j++) {
      if (list[j].order < list[i].order || (list[j].order === list[i].order && list[j].id < list[i].id)) {
        temp = list[i];
        list[i] = list[j];
        list[j] = temp;
      }
    }
  }
  return list;
}

function getSpeechOrder(firstSide) {
  var pairs = [
    ["pro-constructive", "con-constructive"],
    ["pro-rebuttal", "con-rebuttal"],
    ["pro-summary", "con-summary"],
    ["pro-final", "con-final"]
  ];
  var list = [];
  for (var i = 0; i < pairs.length; i++) {
    if (firstSide === "con") {
      list.push(pairs[i][1], pairs[i][0]);
    } else {
      list.push(pairs[i][0], pairs[i][1]);
    }
  }
  return list;
}

function getSpeechesForSide(round, caseSide) {
  if (round.isPreflow) {
    return [caseSide + "-constructive"];
  }
  var all = getSpeechOrder(round.firstSide);
  var start = all.indexOf(caseSide + "-constructive");
  if (start < 0) {
    return all.slice();
  }
  return all.slice(start);
}

function getSpeechName(id, full) {
  var info = SPEECHES[id];
  if (!info) {
    return id;
  }
  if (full) {
    return info.full;
  } else {
    return info.short;
  }
}

function getTeamName(side) {
  if (side === "pro") {
    return "Pro";
  } else {
    return "Con";
  }
}

function getTimerSteps(firstSide, durations) {
  var first = (firstSide === "con") ? "con" : "pro";
  var second = (first === "pro") ? "con" : "pro";
  var times = durations || timerTimes();

  return [
    { id: "first-constructive", label: getTeamName(first) + " Constructive", seconds: times.constructive },
    { id: "second-constructive", label: getTeamName(second) + " Constructive", seconds: times.constructive },
    { id: "first-crossfire", label: "First crossfire", seconds: times.crossfire },
    { id: "first-rebuttal", label: getTeamName(first) + " Rebuttal", seconds: times.rebuttal },
    { id: "second-rebuttal", label: getTeamName(second) + " Rebuttal", seconds: times.rebuttal },
    { id: "second-crossfire", label: "Second crossfire", seconds: times.crossfire },
    { id: "first-summary", label: getTeamName(first) + " Summary", seconds: times.summary },
    { id: "second-summary", label: getTeamName(second) + " Summary", seconds: times.summary },
    { id: "grand-crossfire", label: "Grand crossfire", seconds: times.grand },
    { id: "first-final", label: getTeamName(first) + " Final Focus", seconds: times.final },
    { id: "second-final", label: getTeamName(second) + " Final Focus", seconds: times.final }
  ];
}

function createCrossNotesObject(notes) {
  var src = notes || {};
  return {
    firstCrossfire: src.firstCrossfire || "",
    secondCrossfire: src.secondCrossfire || "",
    grandCrossfire: src.grandCrossfire || "",
    reflections: src.reflections || ""
  };
}

function createNewTimer(firstSide, durations) {
  var plan = getTimerSteps(firstSide, durations);
  var allotted = {};
  var times = durations || timerTimes();
  for (var i = 0; i < plan.length; i++) {
    allotted[plan[i].id] = plan[i].seconds;
  }
  return {
    index: 0,
    running: false,
    mode: null,
    prepSide: "pro",
    deadline: null,
    remainingMs: allotted[plan[0].id] * 1000,
    allotted: allotted,
    prepLeft: {
      pro: times.prep * 1000,
      con: times.prep * 1000
    },
    timeUp: false
  };
}

function createContentionGroup(name) {
  return {
    id: createUniqueId("cont"),
    name: name,
    collapsed: false,
    startingPointIds: []
  };
}

function createNewCase() {
  var contention = createContentionGroup("Contention 1");
  return {
    contentionIds: [contention.id],
    contention: contention
  };
}

function createNewRound(fields, settings) {
  var pro = createNewCase();
  var con = createNewCase();
  var times = (settings && settings.durations) || timerTimes();
  var groups = {};
  groups[pro.contention.id] = pro.contention;
  groups[con.contention.id] = con.contention;

  return {
    id: createUniqueId("round"),
    title: fields.title || "Untitled round",
    topic: fields.topic || "",
    tournament: fields.tournament || "",
    roundLabel: fields.roundLabel || "",
    opponent: fields.opponent || "",
    yourSide: fields.yourSide || "pro",
    firstSide: (fields.firstSide === "con") ? "con" : "pro",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cases: {
      pro: { contentionIds: pro.contentionIds },
      con: { contentionIds: con.contentionIds }
    },
    contentions: groups,
    notes: {},
    evidence: {},
    crossNotes: createCrossNotesObject(),
    timers: createNewTimer((fields.firstSide === "con") ? "con" : "pro", times),
    columnFocus: {
      pro: { count: null, start: 0 },
      con: { count: null, start: 0 }
    },
    scroll: { pro: 0, con: 0 }
  };
}

function createNewPreflow(fields) {
  var side = (fields.side === "con") ? "con" : "pro";
  var contention = createContentionGroup("Contention 1");
  var groups = {};
  groups[contention.id] = contention;

  return {
    id: createUniqueId("preflow"),
    title: fields.title || "Untitled preflow",
    topic: fields.topic || "",
    side: side,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contentionIds: [contention.id],
    contentions: groups,
    notes: {},
    evidence: {}
  };
}

function convertPreflowToRound(preflow) {
  var cases = {
    pro: { contentionIds: [] },
    con: { contentionIds: [] }
  };
  cases[preflow.side].contentionIds = preflow.contentionIds.slice();

  return {
    id: preflow.id,
    title: preflow.title,
    topic: preflow.topic || "",
    tournament: "",
    roundLabel: "",
    opponent: "",
    yourSide: preflow.side,
    firstSide: preflow.side,
    isPreflow: true,
    preflowSide: preflow.side,
    cases: cases,
    contentions: preflow.contentions,
    notes: preflow.notes,
    evidence: preflow.evidence,
    crossNotes: createCrossNotesObject(),
    timers: createNewTimer(preflow.side, timerTimes()),
    columnFocus: {
      pro: { count: null, start: 0 },
      con: { count: null, start: 0 }
    },
    scroll: { pro: 0, con: 0 }
  };
}

function getContentionSide(round, contentionId) {
  if (round.cases.pro.contentionIds.indexOf(contentionId) !== -1) {
    return "pro";
  }
  if (round.cases.con.contentionIds.indexOf(contentionId) !== -1) {
    return "con";
  }
  return null;
}

function getPointsInContention(round, contentionId) {
  var names = Object.keys(round.notes);
  var list = [];
  for (var i = 0; i < names.length; i++) {
    var card = round.notes[names[i]];
    if (card.contentionId === contentionId) {
      list.push(card);
    }
  }
  return list;
}

function getReplyPoints(round, parentId, speechId) {
  var parent = round.notes[parentId];
  if (!parent) return [];
  var notes = getPointsInContention(round, parent.contentionId);
  var list = [];
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].parentId === parentId && notes[i].speechId === speechId) {
      list.push(notes[i]);
    }
  }
  return sortPointsByOrder(list);
}

function getSpeechesAfter(round, caseSide, speechId) {
  var list = getSpeechesForSide(round, caseSide);
  var index = list.indexOf(speechId);
  if (index < 0) {
    return [];
  }
  return list.slice(index + 1);
}

function getNextOrderNumber(list) {
  var max = 0;
  for (var i = 0; i < list.length; i++) {
    if (list[i].order >= max) {
      max = list[i].order + 1;
    }
  }
  return max;
}

function createNewPoint(contentionId, speechId, parentId, order, text) {
  return {
    id: createUniqueId("note"),
    contentionId: contentionId,
    speechId: speechId,
    parentId: parentId || null,
    order: order,
    text: text || "",
    marker: "",
    evidenceId: null
  };
}

function addMainPoint(round, contentionId, speechId, text, afterId) {
  var contention = round.contentions[contentionId];
  var note = createNewPoint(contentionId, speechId, null, contention.startingPointIds.length, text);
  var index = contention.startingPointIds.length;
  if (afterId) {
    index = contention.startingPointIds.indexOf(afterId) + 1;
    if (index <= 0) {
      index = contention.startingPointIds.length;
    }
  }
  contention.startingPointIds.splice(index, 0, note.id);
  round.notes[note.id] = note;
  return note;
}

function addReplyPoint(round, parentId, speechId, text, afterId) {
  var parent = round.notes[parentId];
  var siblings = getReplyPoints(round, parentId, speechId);
  var note = createNewPoint(parent.contentionId, speechId, parentId, getNextOrderNumber(siblings), text);
  if (afterId && round.notes[afterId]) {
    note.order = round.notes[afterId].order + 0.5;
  }
  round.notes[note.id] = note;
  return note;
}

function getAllChildPoints(round, noteId, list) {
  var names = Object.keys(round.notes);
  list.push(noteId);
  for (var i = 0; i < names.length; i++) {
    if (round.notes[names[i]].parentId === noteId) {
      getAllChildPoints(round, names[i], list);
    }
  }
  return list;
}

function checkIfCanLinkPoints(round, noteId, parentId) {
  var note = round.notes[noteId];
  var parent = round.notes[parentId];
  if (!note || !parent) {
    return "That card isn't on this flow anymore.";
  }
  if (noteId === parentId) {
    return "A card can't answer itself.";
  }
  if (note.contentionId !== parent.contentionId) {
    return "Stay on this contention. Another contention is a different sheet.";
  }
  var under = getAllChildPoints(round, noteId, []);
  if (under.indexOf(parentId) !== -1) {
    return "That loops the line — the extension would be answering itself.";
  }
  var side = getContentionSide(round, note.contentionId);
  var cols = getSpeechesForSide(round, side);
  var parentCol = cols.indexOf(parent.speechId);
  var cardCol = cols.indexOf(note.speechId);
  if (parentCol < 0 || cardCol < 0 || parentCol >= cardCol) {
    return "Answers go in a later column. A constructive shell can't hang under rebuttal.";
  }
  return "";
}

function canLinkPoints(round, noteId, parentId) {
  return checkIfCanLinkPoints(round, noteId, parentId) === "";
}

function getMarkerWarning(round, note, markerId) {
  if (!note || !markerId) return "";
  var info = SPEECHES[note.speechId];
  var side = getContentionSide(round, note.contentionId);
  if (markerId === "dropped" && info && info.type === "constructive") {
    return "Dropped on a constructive shell doesn't track — that speech is the argument, nothing has gone unanswered yet. Label it anyway?";
  }
  if (markerId === "turn" && round.yourSide && round.yourSide !== "observer" && side === round.yourSide && info && info.type === "constructive") {
    return "A turn is their argument, flipped onto them. This card is on your constructive. Label it anyway?";
  }
  if (markerId === "extend" && !note.parentId) {
    return "Extend means you're kicking an earlier line back up. This card isn't under anything yet. Label it anyway?";
  }
  return "";
}

function removeIdFromList(list, id) {
  var kept = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] !== id) {
      kept.push(list[i]);
    }
  }
  return kept;
}

function linkPointToParent(round, noteId, parentId) {
  var note = round.notes[noteId];
  var contention;
  if (!note) return false;
  if (note.parentId === null) {
    contention = round.contentions[note.contentionId];
    contention.startingPointIds = removeIdFromList(contention.startingPointIds, noteId);
  }
  if (!parentId) {
    note.parentId = null;
    contention = round.contentions[note.contentionId];
    if (contention.startingPointIds.indexOf(noteId) === -1) {
      contention.startingPointIds.push(noteId);
    }
    return true;
  }
  if (!canLinkPoints(round, noteId, parentId)) {
    return false;
  }
  note.parentId = parentId;
  var siblings = [];
  var family = getReplyPoints(round, parentId, note.speechId);
  for (var i = 0; i < family.length; i++) {
    if (family[i].id !== noteId) {
      siblings.push(family[i]);
    }
  }
  note.order = getNextOrderNumber(siblings);
  return true;
}

function deletePoint(round, noteId) {
  var note = round.notes[noteId];
  if (!note) return;
  var names = Object.keys(round.notes);
  var children = [];
  for (var i = 0; i < names.length; i++) {
    var child = round.notes[names[i]];
    if (child.parentId === noteId) {
      children.push(child);
    }
  }
  for (var c1 = 0; c1 < children.length; c1++) {
    for (var c2 = c1 + 1; c2 < children.length; c2++) {
      if (children[c2].order < children[c1].order) {
        var tempChild = children[c1];
        children[c1] = children[c2];
        children[c2] = tempChild;
      }
    }
  }
  if (note.evidenceId && round.evidence[note.evidenceId]) {
    delete round.evidence[note.evidenceId];
  }
  if (note.parentId) {
    for (var k = 0; k < children.length; k++) {
      children[k].parentId = note.parentId;
      children[k].order = note.order + (k + 1) / (children.length + 2);
    }
  } else {
    var contention = round.contentions[note.contentionId];
    var index = contention.startingPointIds.indexOf(noteId);
    contention.startingPointIds = removeIdFromList(contention.startingPointIds, noteId);
    for (var m = 0; m < children.length; m++) {
      children[m].parentId = null;
      if (contention.startingPointIds.indexOf(children[m].id) === -1) {
        contention.startingPointIds.splice(index + m, 0, children[m].id);
      }
    }
  }
  delete round.notes[noteId];
}

function duplicatePoint(round, noteId) {
  var note = round.notes[noteId];
  if (!note) return null;
  var copy;
  if (note.parentId) {
    copy = addReplyPoint(round, note.parentId, note.speechId, note.text, noteId);
  } else {
    copy = addMainPoint(round, note.contentionId, note.speechId, note.text, noteId);
  }
  copy.marker = note.marker;
  if (note.evidenceId && round.evidence[note.evidenceId]) {
    var evidence = round.evidence[note.evidenceId];
    copy.evidenceId = createUniqueId("ev");
    round.evidence[copy.evidenceId] = {
      id: copy.evidenceId,
      noteId: copy.id,
      html: evidence.html,
      plain: evidence.plain
    };
  }
  return copy;
}

function movePointOrder(round, noteId, direction) {
  var note = round.notes[noteId];
  if (!note) return;
  var list = [];
  var ids;
  if (note.parentId) {
    list = getReplyPoints(round, note.parentId, note.speechId);
  } else {
    ids = round.contentions[note.contentionId].startingPointIds;
    for (var i = 0; i < ids.length; i++) {
      if (round.notes[ids[i]]) {
        list.push(round.notes[ids[i]]);
      }
    }
  }
  var index = -1;
  for (var j = 0; j < list.length; j++) {
    if (list[j].id === noteId) {
      index = j;
    }
  }
  var swap = index + direction;
  if (index < 0 || swap < 0 || swap >= list.length) {
    return;
  }
  if (!note.parentId) {
    ids = round.contentions[note.contentionId].startingPointIds;
    var tempId = ids[index];
    ids[index] = ids[swap];
    ids[swap] = tempId;
    return;
  }
  var order = list[index].order;
  list[index].order = list[swap].order;
  list[swap].order = order;
}

function checkIfRoundHasContent(round) {
  var names = Object.keys(round.notes);
  for (var i = 0; i < names.length; i++) {
    if (round.notes[names[i]].text || round.notes[names[i]].evidenceId) {
      return true;
    }
  }
  return Object.keys(round.evidence).length > 0;
}

function addContention(round, caseSide) {
  var ids = round.cases[caseSide].contentionIds;
  var n = 1;
  for (var i = 0; i < ids.length; i++) {
    var name = round.contentions[ids[i]] ? round.contentions[ids[i]].name : "";
    var num = /^Contention (\d+)$/.exec(name || "");
    if (num && Number(num[1]) >= n) {
      n = Number(num[1]) + 1;
    }
  }
  var contention = createContentionGroup("Contention " + n);
  round.contentions[contention.id] = contention;
  round.cases[caseSide].contentionIds.push(contention.id);
  return contention;
}

function deleteContention(round, contentionId) {
  var caseSide = getContentionSide(round, contentionId);
  if (!caseSide) return false;
  var notes = getPointsInContention(round, contentionId);
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].evidenceId) {
      delete round.evidence[notes[i].evidenceId];
    }
    delete round.notes[notes[i].id];
  }
  delete round.contentions[contentionId];
  var ids = round.cases[caseSide].contentionIds;
  var kept = [];
  for (var j = 0; j < ids.length; j++) {
    if (ids[j] !== contentionId) {
      kept.push(ids[j]);
    }
  }
  round.cases[caseSide].contentionIds = kept;
  return true;
}

function moveContention(round, contentionId, direction) {
  var caseSide = getContentionSide(round, contentionId);
  if (!caseSide) return;
  var ids = round.cases[caseSide].contentionIds;
  var index = ids.indexOf(contentionId);
  if (index < 0 || index + direction < 0 || index + direction >= ids.length) {
    return;
  }
  var temp = ids[index];
  ids[index] = ids[index + direction];
  ids[index + direction] = temp;
}

function checkIfContentionHasContent(round, contentionId) {
  var notes = getPointsInContention(round, contentionId);
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].text || notes[i].evidenceId) {
      return true;
    }
  }
  return false;
}

function getVisibleSpeeches(round, caseSide) {
  var all = getSpeechesForSide(round, caseSide);
  var focus = round.columnFocus[caseSide] || { count: null, start: 0 };
  var count = focus.count;
  var start = focus.start || 0;
  if (!count || count >= all.length) {
    return { all: all, visible: all.slice(), start: 0, count: all.length };
  }
  if (start < 0) {
    start = 0;
  }
  if (start + count > all.length) {
    start = Math.max(0, all.length - count);
  }
  return {
    all: all,
    visible: all.slice(start, start + count),
    start: start,
    count: count
  };
}

function getClonedId(map, oldId) {
  if (!oldId) return null;
  if (!map[oldId]) {
    map[oldId] = createUniqueId("id");
  }
  return map[oldId];
}

function cloneRoundParts(source) {
  var map = {};
  var groups = {};
  var notes = {};
  var evidence = {};
  var names = Object.keys(source.contentions);
  for (var i = 0; i < names.length; i++) {
    var oldId = names[i];
    var next = getClonedId(map, oldId);
    var group = source.contentions[oldId];
    var oldStarts = group.startingPointIds;
    var newStarts = [];
    for (var n = 0; n < oldStarts.length; n++) {
      newStarts.push(getClonedId(map, oldStarts[n]));
    }
    groups[next] = {
      id: next,
      name: group.name,
      collapsed: false,
      startingPointIds: newStarts
    };
  }
  names = Object.keys(source.notes);
  for (var j = 0; j < names.length; j++) {
    var noteId = names[j];
    var note = source.notes[noteId];
    var nextNoteId = getClonedId(map, noteId);
    notes[nextNoteId] = {
      id: nextNoteId,
      contentionId: getClonedId(map, note.contentionId),
      speechId: note.speechId,
      parentId: note.parentId ? getClonedId(map, note.parentId) : null,
      order: note.order,
      text: note.text,
      marker: note.marker || "",
      evidenceId: note.evidenceId ? getClonedId(map, note.evidenceId) : null
    };
  }
  names = Object.keys(source.evidence || {});
  for (var k = 0; k < names.length; k++) {
    var evId = names[k];
    var item = source.evidence[evId];
    var nextEvId = getClonedId(map, evId);
    evidence[nextEvId] = {
      id: nextEvId,
      noteId: getClonedId(map, item.noteId),
      html: item.html,
      plain: item.plain
    };
  }
  return { map: map, contentions: groups, notes: notes, evidence: evidence };
}

function cloneIdList(ids, map) {
  var list = [];
  for (var i = 0; i < ids.length; i++) {
    list.push(map[ids[i]]);
  }
  return list;
}

function cloneRound(round, settings) {
  var cloned = cloneRoundParts(round);
  var copy = createNewRound({
    title: round.title + " (copy)",
    topic: round.topic,
    tournament: round.tournament,
    roundLabel: round.roundLabel,
    opponent: round.opponent,
    yourSide: round.yourSide,
    firstSide: round.firstSide
  }, settings);
  copy.cases = {
    pro: { contentionIds: cloneIdList(round.cases.pro.contentionIds, cloned.map) },
    con: { contentionIds: cloneIdList(round.cases.con.contentionIds, cloned.map) }
  };
  copy.contentions = cloned.contentions;
  copy.notes = cloned.notes;
  copy.evidence = cloned.evidence;
  copy.crossNotes = createCrossNotesObject(round.crossNotes);
  copy.columnFocus = {
    pro: { count: round.columnFocus.pro.count, start: round.columnFocus.pro.start },
    con: { count: round.columnFocus.con.count, start: round.columnFocus.con.start }
  };
  return copy;
}

function applyPreflowToRound(round, preflow) {
  var cloned = cloneRoundParts({
    contentions: preflow.contentions,
    notes: preflow.notes,
    evidence: preflow.evidence
  });
  var side = preflow.side;
  var kept = [];
  var names = Object.keys(cloned.notes);
  for (var i = 0; i < names.length; i++) {
    var note = cloned.notes[names[i]];
    if (note.speechId !== side + "-constructive" || note.parentId) {
      if (note.evidenceId) delete cloned.evidence[note.evidenceId];
      delete cloned.notes[names[i]];
      continue;
    }
    kept.push(names[i]);
  }
  names = Object.keys(cloned.contentions);
  for (var j = 0; j < names.length; j++) {
    var oldIds = cloned.contentions[names[j]].startingPointIds;
    var newIds = [];
    for (var n = 0; n < oldIds.length; n++) {
      if (kept.indexOf(oldIds[n]) !== -1) {
        newIds.push(oldIds[n]);
      }
    }
    cloned.contentions[names[j]].startingPointIds = newIds;
  }
  var oldContIds = round.cases[side].contentionIds.slice();
  for (var k = 0; k < oldContIds.length; k++) {
    deleteContention(round, oldContIds[k]);
  }
  round.cases[side].contentionIds = cloneIdList(preflow.contentionIds, cloned.map);
  names = Object.keys(cloned.contentions);
  for (var m = 0; m < names.length; m++) {
    round.contentions[names[m]] = cloned.contentions[names[m]];
  }
  names = Object.keys(cloned.notes);
  for (var p = 0; p < names.length; p++) {
    round.notes[names[p]] = cloned.notes[names[p]];
  }
  names = Object.keys(cloned.evidence);
  for (var q = 0; q < names.length; q++) {
    round.evidence[names[q]] = cloned.evidence[names[q]];
  }
}

function convertCaseToPreflow(round, caseSide, title) {
  var preflow = createNewPreflow({ title: title, topic: round.topic, side: caseSide });
  var speech = caseSide + "-constructive";
  delete preflow.contentions[preflow.contentionIds[0]];
  preflow.contentionIds = [];
  var groupIds = round.cases[caseSide].contentionIds;
  for (var i = 0; i < groupIds.length; i++) {
    var source = round.contentions[groupIds[i]];
    var contention = createContentionGroup(source.name);
    preflow.contentions[contention.id] = contention;
    preflow.contentionIds.push(contention.id);
    var starts = source.startingPointIds;
    for (var n = 0; n < starts.length; n++) {
      var note = round.notes[starts[n]];
      if (!note || note.speechId !== speech) continue;
      var copy = createNewPoint(contention.id, speech, null, contention.startingPointIds.length, note.text);
      copy.marker = note.marker;
      contention.startingPointIds.push(copy.id);
      preflow.notes[copy.id] = copy;
      if (note.evidenceId && round.evidence[note.evidenceId]) {
        copy.evidenceId = createUniqueId("ev");
        preflow.evidence[copy.evidenceId] = {
          id: copy.evidenceId,
          noteId: copy.id,
          html: round.evidence[note.evidenceId].html,
          plain: round.evidence[note.evidenceId].plain
        };
      }
    }
  }
  if (!preflow.contentionIds.length) {
    var blank = createContentionGroup("Contention 1");
    preflow.contentions[blank.id] = blank;
    preflow.contentionIds.push(blank.id);
  }
  return preflow;
}

function resetPointToMain(round, note) {
  var cont = round.contentions[note.contentionId];
  note.parentId = null;
  if (cont && cont.startingPointIds.indexOf(note.id) === -1) {
    cont.startingPointIds.push(note.id);
  }
}

function repairRoundData(round) {
  if (!round || typeof round !== "object") return;
  if (round.yourSide !== "con" && round.yourSide !== "observer") {
    round.yourSide = "pro";
  }
  if (round.firstSide !== "con") {
    round.firstSide = "pro";
  }
  if (!round.cases) round.cases = {};
  if (!round.cases.pro) round.cases.pro = { contentionIds: [] };
  if (!round.cases.con) round.cases.con = { contentionIds: [] };
  if (!round.cases.pro.contentionIds) round.cases.pro.contentionIds = [];
  if (!round.cases.con.contentionIds) round.cases.con.contentionIds = [];
  if (!round.contentions) round.contentions = {};
  if (!round.notes) round.notes = {};
  if (!round.evidence) round.evidence = {};
  round.crossNotes = createCrossNotesObject(round.crossNotes);
  if (!round.columnFocus) round.columnFocus = {};
  if (!round.columnFocus.pro) round.columnFocus.pro = { count: null, start: 0 };
  if (!round.columnFocus.con) round.columnFocus.con = { count: null, start: 0 };
  if (!round.scroll) round.scroll = { pro: 0, con: 0 };
  if (typeof round.scroll.pro !== "number") round.scroll.pro = 0;
  if (typeof round.scroll.con !== "number") round.scroll.con = 0;
  if (!round.timers || !round.timers.prepLeft) {
    round.timers = createNewTimer(round.firstSide, timerTimes());
  } else {
    if (round.timers.prepLeft.pro == null || round.timers.prepLeft.pro < 0) round.timers.prepLeft.pro = 0;
    if (round.timers.prepLeft.con == null || round.timers.prepLeft.con < 0) round.timers.prepLeft.con = 0;
    if (!round.timers.allotted) round.timers.allotted = {};
  }

  var sides = ["pro", "con"];
  for (var s = 0; s < sides.length; s++) {
    var ids = round.cases[sides[s]].contentionIds;
    var kept = [];
    var seen = {};
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (seen[id]) continue;
      var cont = round.contentions[id];
      if (!cont) continue;
      seen[id] = true;
      if (!cont.name) cont.name = "Contention " + (kept.length + 1);
      if (!cont.startingPointIds) cont.startingPointIds = [];
      var starts = [];
      for (var n = 0; n < cont.startingPointIds.length; n++) {
        var note = round.notes[cont.startingPointIds[n]];
        if (!note || note.contentionId !== id || note.parentId) continue;
        starts.push(note.id);
      }
      cont.startingPointIds = starts;
      kept.push(id);
    }
    if (!kept.length) {
      var newCont = createContentionGroup("Contention 1");
      round.contentions[newCont.id] = newCont;
      kept.push(newCont.id);
    }
    round.cases[sides[s]].contentionIds = kept;
  }

  var names = Object.keys(round.notes);
  for (var j = 0; j < names.length; j++) {
    var nItem = round.notes[names[j]];
    if (!nItem || !round.contentions[nItem.contentionId]) {
      if (nItem && nItem.evidenceId && round.evidence[nItem.evidenceId]) {
        delete round.evidence[nItem.evidenceId];
      }
      delete round.notes[names[j]];
      continue;
    }
    if (!SPEECHES[nItem.speechId]) {
      var side = getContentionSide(round, nItem.contentionId) || "pro";
      nItem.speechId = side + "-constructive";
    }
    if (!nItem.marker) nItem.marker = "";
  }

  names = Object.keys(round.notes);
  for (var k = 0; k < names.length; k++) {
    var checkNote = round.notes[names[k]];
    if (!checkNote) continue;
    var loopSeen = {};
    var currId = checkNote.id;
    var stepCount = 0;
    while (currId && stepCount < 40) {
      if (loopSeen[currId]) {
        resetPointToMain(round, checkNote);
        break;
      }
      loopSeen[currId] = true;
      var parent = round.notes[currId];
      currId = parent && parent.parentId;
      stepCount++;
    }
    if (checkNote.parentId && !round.notes[checkNote.parentId]) {
      resetPointToMain(round, checkNote);
      continue;
    }
    if (!checkNote.parentId) continue;
    var parentObj = round.notes[checkNote.parentId];
    if (parentObj.contentionId !== checkNote.contentionId) {
      resetPointToMain(round, checkNote);
      continue;
    }
    var cSide = getContentionSide(round, checkNote.contentionId);
    var sOrder = getSpeechesForSide(round, cSide);
    if (sOrder.indexOf(parentObj.speechId) < 0 || sOrder.indexOf(checkNote.speechId) < 0 || sOrder.indexOf(parentObj.speechId) >= sOrder.indexOf(checkNote.speechId)) {
      resetPointToMain(round, checkNote);
    }
  }

  names = Object.keys(round.notes);
  for (var m = 0; m < names.length; m++) {
    var startNote = round.notes[names[m]];
    if (!startNote || startNote.parentId) continue;
    var cGroup = round.contentions[startNote.contentionId];
    if (cGroup && cGroup.startingPointIds.indexOf(startNote.id) === -1) {
      cGroup.startingPointIds.push(startNote.id);
    }
  }

  names = Object.keys(round.evidence);
  for (var e = 0; e < names.length; e++) {
    var ev = round.evidence[names[e]];
    if (!ev || !ev.noteId || !round.notes[ev.noteId]) {
      delete round.evidence[names[e]];
      continue;
    }
    round.notes[ev.noteId].evidenceId = names[e];
  }
}

function repairPreflowData(pre) {
  if (!pre || typeof pre !== "object") return;
  if (pre.side !== "con") pre.side = "pro";
  if (!pre.contentions) pre.contentions = {};
  if (!pre.notes) pre.notes = {};
  if (!pre.evidence) pre.evidence = {};
  if (!pre.contentionIds) pre.contentionIds = [];
  var kept = [];
  var seen = {};
  for (var i = 0; i < pre.contentionIds.length; i++) {
    var id = pre.contentionIds[i];
    if (seen[id] || !pre.contentions[id]) continue;
    seen[id] = true;
    var cont = pre.contentions[id];
    if (!cont.name) cont.name = "Contention " + (kept.length + 1);
    if (!cont.startingPointIds) cont.startingPointIds = [];
    var starts = [];
    for (var n = 0; n < cont.startingPointIds.length; n++) {
      var note = pre.notes[cont.startingPointIds[n]];
      if (note && note.contentionId === id && !note.parentId) {
        starts.push(note.id);
      }
    }
    cont.startingPointIds = starts;
    kept.push(id);
  }
  if (!kept.length) {
    var newCont = createContentionGroup("Contention 1");
    pre.contentions[newCont.id] = newCont;
    kept.push(newCont.id);
  }
  pre.contentionIds = kept;

  var names = Object.keys(pre.notes);
  for (var j = 0; j < names.length; j++) {
    var pNote = pre.notes[names[j]];
    if (!pNote || !pre.contentions[pNote.contentionId]) {
      if (pNote && pNote.evidenceId) {
        delete pre.evidence[pNote.evidenceId];
      }
      delete pre.notes[names[j]];
    }
  }

  names = Object.keys(pre.evidence);
  for (var k = 0; k < names.length; k++) {
    if (!pre.evidence[names[k]] || !pre.notes[pre.evidence[names[k]].noteId]) {
      delete pre.evidence[names[k]];
    }
  }
}

function pauseTimerOnOpen(round) {
  if (!round.timers || !round.timers.running || !round.timers.deadline) return;
  var left = round.timers.deadline - Date.now();
  if (left < 0) left = 0;
  if (round.timers.mode === "prep" && round.timers.prepSide) {
    round.timers.prepLeft[round.timers.prepSide] = left;
  } else {
    round.timers.remainingMs = left;
  }
  round.timers.running = false;
  round.timers.mode = null;
  round.timers.deadline = null;
  round.timers.timeUp = (left === 0);
}

function calculateCardHeight(note, heights) {
  var value = heights && heights[note.id];
  if (value && value >= 40) return value;
  var lines = String(note.text || "").split("\n");
  var visual = 0;
  for (var i = 0; i < lines.length; i++) {
    visual += Math.max(1, Math.ceil((lines[i].length || 1) / 32));
  }
  if (!visual) visual = 1;
  return Math.max(40, visual * 22 + 16);
}

function getRepliesInColumn(round, parentId, speechId) {
  var parent = round.notes[parentId];
  if (!parent) return [];
  var names = Object.keys(round.notes);
  var list = [];
  for (var i = 0; i < names.length; i++) {
    var note = round.notes[names[i]];
    if (note.parentId === parentId && note.speechId === speechId && note.contentionId === parent.contentionId) {
      list.push(note);
    }
  }
  return sortPointsByOrder(list);
}

function calculateSpaceForPoint(round, note, caseSide, heights, saved) {
  if (saved[note.id]) return saved[note.id];
  var own = calculateCardHeight(note, heights);
  var later = getSpeechesAfter(round, caseSide, note.speechId);
  var maxStack = 0;
  for (var s = 0; s < later.length; s++) {
    var siblings = getRepliesInColumn(round, note.id, later[s]);
    if (!siblings.length) continue;
    var stack = 0;
    for (var i = 0; i < siblings.length; i++) {
      stack += calculateSpaceForPoint(round, siblings[i], caseSide, heights, saved);
      if (i < siblings.length - 1) stack += 8;
    }
    if (stack > maxStack) {
      maxStack = stack;
    }
  }
  saved[note.id] = Math.max(own, maxStack);
  return saved[note.id];
}

function calculatePointPosition(round, note, top, caseSide, heights, saved, positions) {
  var own = calculateCardHeight(note, heights);
  var later = getSpeechesAfter(round, caseSide, note.speechId);
  positions[note.id] = {
    top: top,
    height: own,
    reserved: saved[note.id],
    speechId: note.speechId
  };
  for (var s = 0; s < later.length; s++) {
    var siblings = getRepliesInColumn(round, note.id, later[s]);
    var y = top;
    for (var i = 0; i < siblings.length; i++) {
      calculatePointPosition(round, siblings[i], y, caseSide, heights, saved, positions);
      y += saved[siblings[i].id] + 8;
    }
  }
}

function checkEarlierReplies(round, noteId, speechId, caseSide) {
  var list = getSpeechesForSide(round, caseSide);
  var limit = list.indexOf(speechId);
  if (limit < 0) return false;
  for (var s = 0; s < limit; s++) {
    if (getRepliesInColumn(round, noteId, list[s]).length) {
      return true;
    }
  }
  return false;
}

function calculateContentionLayout(round, contention, caseSide, heights) {
  var saved = {};
  var positions = {};
  var slots = [];
  var y = 0;
  positions._threads = [];

  for (var i = 0; i < contention.startingPointIds.length; i++) {
    var id = contention.startingPointIds[i];
    var note = round.notes[id];
    if (!note) continue;
    calculateSpaceForPoint(round, note, caseSide, heights, saved);
    calculatePointPosition(round, note, y, caseSide, heights, saved, positions);
    var threadSpace = saved[note.id];
    positions._threads.push({ id: note.id, top: y, reserved: threadSpace });
    y += threadSpace + 8;
  }

  var names = Object.keys(positions);
  for (var j = 0; j < names.length; j++) {
    if (names[j] === "_threads") continue;
    var item = positions[names[j]];
    var later = getSpeechesAfter(round, caseSide, item.speechId);
    for (var s = 0; s < later.length; s++) {
      var speechId = later[s];
      var siblings = getRepliesInColumn(round, names[j], speechId);
      if (siblings.length || checkEarlierReplies(round, names[j], speechId, caseSide)) {
        continue;
      }
      slots.push({
        parentId: names[j],
        speechId: speechId,
        top: item.top
      });
    }
  }

  var bottom = y;
  for (var k = 0; k < slots.length; k++) {
    var slot = slots[k];
    if (slot.top + 48 > bottom) {
      bottom = slot.top + 48;
    }
  }

  return {
    positions: positions,
    slots: slots,
    height: Math.max(bottom, 48)
  };
}

function createBlankSaveData() {
  return {
    rounds: {},
    preflows: {},
    settings: getDefaultSettings(),
    lastRoundId: null
  };
}

function readFromLocalStorage(key) {
  try {
    var rawText = localStorage.getItem(key);
    if (!rawText) return null;
    var data = JSON.parse(rawText);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch (error) {
    return null;
  }
}

function loadSavedData() {
  var data = readFromLocalStorage(STORE_KEY);
  var backup = readFromLocalStorage(BACKUP_KEY);
  if (!data) {
    if (backup) {
      data = backup;
      data.recovered = true;
    } else {
      data = createBlankSaveData();
    }
  }
  if (!data.rounds) data.rounds = {};
  if (!data.preflows) data.preflows = {};
  if (!data.settings) data.settings = getDefaultSettings();
  data.settings.durations = repairTimerSettings(data.settings.durations);

  var roundIds = Object.keys(data.rounds);
  for (var i = 0; i < roundIds.length; i++) {
    var currentRound = data.rounds[roundIds[i]];
    repairRoundData(currentRound);
    pauseTimerOnOpen(currentRound);
  }

  var preflowIds = Object.keys(data.preflows);
  for (var j = 0; j < preflowIds.length; j++) {
    var currentPreflow = data.preflows[preflowIds[j]];
    repairPreflowData(currentPreflow);
  }
  return data;
}

function isStorageFull(error) {
  if (!error) return false;
  if (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  if (error.code === 22 || error.code === 1014) return true;
  return false;
}

function saveToLocalStorage(store) {
  var copy = {
    rounds: store.rounds,
    preflows: store.preflows,
    settings: store.settings,
    lastRoundId: store.lastRoundId || null
  };
  var jsonText;
  try {
    jsonText = JSON.stringify(copy);
  } catch (error) {
    return "This round couldn't be written. Copy the cards out before you close the tab.";
  }
  try {
    localStorage.setItem(STORE_KEY, jsonText);
  } catch (error) {
    if (isStorageFull(error)) {
      return "Browser storage is full. Export this round, then delete an old one.";
    }
    return "Could not save — export a copy";
  }
  try {
    localStorage.setItem(BACKUP_KEY, jsonText);
  } catch (error) {
    return "";
  }
  return "";
}

function cloneTemplate(id) {
  var templateElement = document.getElementById(id);
  if (!templateElement || !templateElement.firstElementChild) return null;
  return templateElement.firstElementChild.cloneNode(true);
}

function showElement(node) {
  if (node) node.classList.remove("hide");
}

function hideElement(node) {
  if (node) node.classList.add("hide");
}

function clearElement(node) {
  if (!node) return;
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function setElementText(node, text) {
  if (!node) return;
  node.textContent = text || "";
  if (text) {
    showElement(node);
  } else {
    hideElement(node);
  }
}

function objectValuesToList(box) {
  var list = [];
  if (!box) return list;
  for (var key in box) {
    if (Object.prototype.hasOwnProperty.call(box, key)) {
      list.push(box[key]);
    }
  }
  return list;
}

function joinNonEmptyText(parts, gap) {
  var out = "";
  for (var i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    if (out) {
      out = out + gap + parts[i];
    } else {
      out = String(parts[i]);
    }
  }
  return out;
}

function sortByRecentDate(list) {
  return list.sort(function (a, b) {
    var dateA = a.updatedAt || "";
    var dateB = b.updatedAt || "";
    if (dateB > dateA) return 1;
    if (dateB < dateA) return -1;
    return 0;
  });
}

function formatSecondsToClock(ms) {
  var totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  var formattedSeconds = (seconds < 10 ? "0" : "") + seconds;
  return minutes + ":" + formattedSeconds;
}

function formatSideName(side) {
  if (side === "con") return "Con";
  if (side === "pro") return "Pro";
  if (side === "observer") return "Observer";
  return "";
}

function getMarkerLabel(id) {
  for (var i = 0; i < MARKERS.length; i++) {
    if (MARKERS[i].id === id) {
      return MARKERS[i].label;
    }
  }
  return "";
}

function createSafeFileName(title) {
  var text = String(title || "round").toLowerCase();
  var out = "";
  for (var i = 0; i < text.length; i++) {
    var letter = text.charAt(i);
    if ((letter >= "a" && letter <= "z") || (letter >= "0" && letter <= "9")) {
      out += letter;
    } else if (out && out.charAt(out.length - 1) !== "-") {
      out += "-";
    }
  }
  if (out.charAt(out.length - 1) === "-") {
    out = out.slice(0, out.length - 1);
  }
  return out || "round";
}

function downloadRoundAsJson(round) {
  if (!round) return;
  var payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    note: "Version 1 does not import this file. It is a record of the round.",
    round: round
  };
  var file = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  var link = document.createElement("a");
  var name = createSafeFileName(round.title);
  link.href = URL.createObjectURL(file);
  link.download = name + "-" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  setTimeout(function () {
    URL.revokeObjectURL(link.href);
  }, 1000);
}

var SAFE_TAGS = {
  B: true, STRONG: true, I: true, EM: true, U: true, S: true, STRIKE: true, DEL: true,
  BR: true, P: true, DIV: true, SPAN: true, UL: true, OL: true, LI: true, A: true,
  MARK: true, SUB: true, SUP: true, BLOCKQUOTE: true, H1: true, H2: true, H3: true, FONT: true
};

var SAFE_STYLES = [
  "color", "background-color", "font-size", "font-family", 
  "font-weight", "font-style", "text-decoration", "text-align"
];

function styleIsSafe(value) {
  var lower = String(value || "").toLowerCase();
  if (lower.indexOf("url(") !== -1) return false;
  if (lower.indexOf("expression") !== -1) return false;
  if (lower.indexOf("javascript") !== -1) return false;
  if (lower.indexOf("@import") !== -1) return false;
  return true;
}

function keepStyle(style) {
  var out = [];
  if (!style) return "";
  for (var i = 0; i < SAFE_STYLES.length; i++) {
    var val = style.getPropertyValue(SAFE_STYLES[i]);
    if (!val) continue;
    if (!styleIsSafe(val)) continue;
    out.push(SAFE_STYLES[i] + ":" + val);
  }
  return out.join(";");
}

function keepLink(href) {
  var value = String(href || "").trim();
  var lower = value.toLowerCase();
  if (lower.indexOf("https:") === 0) return value;
  if (lower.indexOf("http:") === 0) return value;
  if (lower.indexOf("mailto:") === 0) return value;
  return "";
}

function cleanInside(node, notice, fragment) {
  var child = node.firstChild;
  while (child) {
    var next = child.nextSibling;
    var cleaned = cleanTag(child, notice);
    if (cleaned) {
      fragment.appendChild(cleaned);
    }
    child = next;
  }
}

function cleanTag(node, notice) {
  if (node.nodeType === 3) return document.createTextNode(node.textContent);
  if (node.nodeType !== 1) return null;
  if (node.tagName === "TABLE" || node.tagName === "IMG" || node.tagName === "IMAGE") {
    if (notice.indexOf("simplified") === -1) notice.push("simplified");
    var text = (node.tagName === "IMG") ? "" : (node.textContent || "");
    return text ? document.createTextNode(text) : null;
  }
  if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.tagName === "IFRAME" || node.tagName === "OBJECT") {
    return null;
  }
  if (!SAFE_TAGS[node.tagName]) {
    var copyFragment = document.createDocumentFragment();
    cleanInside(node, notice, copyFragment);
    return copyFragment;
  }
  var copy;
  if (node.tagName === "FONT") {
    copy = document.createElement("span");
  } else if (node.tagName === "H1" || node.tagName === "H2" || node.tagName === "H3") {
    copy = document.createElement("p");
  } else {
    copy = document.createElement(node.tagName.toLowerCase());
  }
  var style = keepStyle(node.style);
  if (node.tagName === "FONT") {
    if (node.color) style = (style ? style + ";" : "") + "color:" + node.color;
    if (node.size) style = (style ? style + ";" : "") + "font-size:" + (Number(node.size) * 4 + 8) + "px";
  }
  if (style) copy.setAttribute("style", style);
  if (copy.tagName === "A") {
    var href = keepLink(node.getAttribute("href"));
    if (!href) {
      var plainFragment = document.createDocumentFragment();
      cleanInside(node, notice, plainFragment);
      return plainFragment;
    }
    copy.setAttribute("href", href);
  }
  if (copy.tagName !== "BR") cleanInside(node, notice, copy);
  return copy;
}

function cleanPastedHtml(html) {
  var notice = [];
  var parsed = new DOMParser().parseFromString("<div>" + String(html || "") + "</div>", "text/html");
  var source = parsed.body.firstChild;
  var wrap = document.createElement("div");
  if (source) cleanInside(source, notice, wrap);
  return {
    html: wrap.innerHTML,
    plain: wrap.textContent || "",
    notice: (notice.length > 0) ? "Some pasted content was simplified so it stays readable." : ""
  };
}

function convertLinesToHtml(text) {
  var lines = String(text || "").split("\n");
  var parts = [];
  for (var i = 0; i < lines.length; i++) {
    var lineBox = document.createElement("div");
    lineBox.textContent = lines[i];
    parts.push(lineBox.innerHTML);
  }
  return parts.join("<br>");
}

function insertHtmlAtCursor(html) {
  if (!html) return;
  var selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  var range = selection.getRangeAt(0);
  range.deleteContents();
  var parsed = new DOMParser().parseFromString("<div>" + html + "</div>", "text/html");
  var fragment = document.createDocumentFragment();
  var holder = parsed.body.firstChild;
  while (holder && holder.firstChild) {
    fragment.appendChild(holder.firstChild);
  }
  var node = fragment.lastChild;
  range.insertNode(fragment);
  if (node) {
    range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

var db = loadSavedData();

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

function activeCase() {
  if (state.round && state.round.isPreflow) {
    return state.round.preflowSide;
  }
  return state.caseSide;
}

function textSize() {
  return (db && db.settings && db.settings.fontSize) || 14;
}

function resetHistory() {
  state.history.past = [];
  state.history.future = [];
  state.history.typing = false;
  showUndoButtons();
}

function copyFlow() {
  if (!state.round) return null;
  return JSON.stringify({
    cases: state.round.cases,
    contentions: state.round.contentions,
    notes: state.round.notes,
    evidence: state.round.evidence
  });
}

function putFlowBack(json) {
  if (!state.round || !json) return;
  var data = JSON.parse(json);
  state.round.cases = data.cases;
  state.round.contentions = data.contentions;
  state.round.notes = data.notes;
  state.round.evidence = data.evidence;
  repairRoundData(state.round);
  saveSoon(true);
  render();
}

function rememberStep() {
  var snap = copyFlow();
  if (!snap) return;
  state.history.past.push(snap);
  if (state.history.past.length > 30) {
    state.history.past.shift();
  }
  state.history.future = [];
  showUndoButtons();
}

function showUndoButtons() {
  var undoBtn = document.querySelector("[data-action='undo']");
  var redoBtn = document.querySelector("[data-action='redo']");
  if (undoBtn) {
    undoBtn.disabled = (state.history.past.length === 0);
  }
  if (redoBtn) {
    redoBtn.disabled = (state.history.future.length === 0);
  }
}

function beginTyping() {
  if (!state.history.typing) {
    rememberStep();
    state.history.typing = true;
  }
  clearTimeout(state.typingTimer);
  state.typingTimer = setTimeout(function () {
    state.history.typing = false;
  }, 900);
}

function rememberBeforeChange() {
  saveTypedWords();
  rememberStep();
}

function undo() {
  saveTypedWords();
  if (!state.history.past.length) return;
  var current = copyFlow();
  var previous = state.history.past.pop();
  state.history.future.push(current);
  state.history.typing = false;
  putFlowBack(previous);
  showUndoButtons();
}

function redo() {
  saveTypedWords();
  if (!state.history.future.length) return;
  var current = copyFlow();
  var next = state.history.future.pop();
  state.history.past.push(current);
  state.history.typing = false;
  putFlowBack(next);
  showUndoButtons();
}

function updateSaveLabel() {
  var label = document.getElementById("save-label");
  if (label) {
    label.textContent = state.saveState;
  }
}

function saveThisRound() {
  if (!state.round || state.demo) return;
  state.round.updatedAt = new Date().toISOString();
  if (state.round.isPreflow) {
    var pre = db.preflows[state.round.id];
    if (pre) {
      pre.title = state.round.title;
      pre.topic = state.round.topic;
      pre.contentions = state.round.contentions;
      pre.contentionIds = state.round.cases[pre.side].contentionIds;
      pre.notes = state.round.notes;
      pre.evidence = state.round.evidence;
      pre.updatedAt = state.round.updatedAt;
    }
  } else {
    db.rounds[state.round.id] = state.round;
  }
  var msg = saveToLocalStorage(db);
  if (msg) {
    state.saveState = msg;
  } else {
    state.saveState = "Saved in this browser";
  }
  updateSaveLabel();
}

function saveSoon(now) {
  clearTimeout(state.saveTimer);
  state.saveState = "Saving…";
  updateSaveLabel();
  if (now) {
    saveThisRound();
  } else {
    state.saveTimer = setTimeout(saveThisRound, 450);
  }
}

function saveNow() {
  clearTimeout(state.saveTimer);
  saveThisRound();
}

function saveTypedWords() {
  clearTimeout(state.typingTimer);
  state.history.typing = false;
}

function rememberRound() {
  if (!state.round) return;
  try {
    sessionStorage.setItem("openRoundId", state.round.id);
    if (state.round.isPreflow) {
      sessionStorage.setItem("isOpenPreflow", "yes");
    } else {
      sessionStorage.removeItem("isOpenPreflow");
      db.lastRoundId = state.round.id;
      saveToLocalStorage(db);
    }
  } catch (error) {}
}

function go(url) {
  window.location.href = url;
}

function loadOpenRound() {
  var id = null;
  var isPre = false;
  try {
    id = sessionStorage.getItem("openRoundId");
    isPre = sessionStorage.getItem("isOpenPreflow") === "yes";
  } catch (error) {}

  if (!id && !isPre) {
    id = db.lastRoundId;
  }

  if (isPre && id && db.preflows[id]) {
    state.round = convertPreflowToRound(db.preflows[id]);
    rememberRound();
    return true;
  }
  if (id && db.rounds[id]) {
    state.round = db.rounds[id];
    rememberRound();
    return true;
  }

  var all = objectValuesToList(db.rounds);
  if (all.length > 0) {
    state.round = sortByRecentDate(all)[0];
    rememberRound();
    return true;
  }

  go("index.html");
  return false;
}

function openRound(id) {
  try {
    sessionStorage.setItem("openRoundId", id);
    sessionStorage.removeItem("isOpenPreflow");
  } catch (error) {}
  go("workspace.html");
}

function openOpening(id) {
  try {
    sessionStorage.setItem("openRoundId", id);
    sessionStorage.setItem("isOpenPreflow", "yes");
  } catch (error) {}
  go("workspace.html");
}

function updateSideMenu() {
  var side = document.querySelector(".sidebar");
  if (!side) return;
  if (state.navOpen) {
    side.classList.add("nav-active");
  } else {
    side.classList.remove("nav-active");
  }
}

function closePopups() {
  var boxes = document.querySelectorAll(".dialog-cover");
  for (var i = 0; i < boxes.length; i++) {
    hideElement(boxes[i]);
  }
  closeDropdownMenu();
}

function askConfirm(title, text, okLabel, run) {
  confirmRun = run;
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-text").textContent = text;
  document.getElementById("confirm-ok").textContent = okLabel || "OK";
  showElement(document.getElementById("confirm-box"));
}

function getCurrentTimerStep() {
  var timer = state.round.timers;
  var plan = getTimerSteps(state.round.firstSide, db.settings.durations);
  var index = Math.min(plan.length - 1, Math.max(0, timer.index || 0));
  return { plan: plan, index: index, item: plan[index] };
}

function getTimerButtonLabel() {
  var timer = state.round.timers;
  if (timer.running && timer.mode === "prep" && timer.prepSide) {
    return formatSideName(timer.prepSide) + " prep " + formatSecondsToClock(timer.deadline - Date.now());
  }
  if (timer.mode === "prep" && timer.prepSide) {
    return formatSideName(timer.prepSide) + " prep " + formatSecondsToClock(timer.prepLeft[timer.prepSide]);
  }
  var ms = timer.running ? Math.max(0, timer.deadline - Date.now()) : timer.remainingMs;
  var step = getCurrentTimerStep();
  return step.item.label + " " + formatSecondsToClock(ms);
}

function updateTimerButton() {
  var btn = document.getElementById("timer-btn");
  if (!btn || !state.round || !state.round.timers) return;
  btn.textContent = getTimerButtonLabel();
  if (state.round.timers.running) {
    btn.classList.add("running");
  } else {
    btn.classList.remove("running");
  }
  if (state.round.timers.timeUp) {
    btn.classList.add("time-up");
  } else {
    btn.classList.remove("time-up");
  }
}

function beep() {
  if (!db.settings.sound) return;
  try {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    var ctx = new AudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (error) {}
}

function startTimer(mode, side) {
  var timer = state.round.timers;
  timer.running = true;
  timer.mode = mode;
  timer.timeUp = false;
  if (mode === "prep") {
    timer.prepSide = side;
    timer.deadline = Date.now() + (timer.prepLeft[side] || 0);
  } else {
    timer.deadline = Date.now() + timer.remainingMs;
  }
  saveSoon(true);
}

function calculateColumnWidth(pane, count) {
  var total = (pane && pane.clientWidth) || 800;
  var w = Math.floor((total - (count - 1) * 12) / count);
  return Math.max(220, w);
}

function showDropdownMenu(anchor, node) {
  if (state.popover === node) {
    closeDropdownMenu();
    return;
  }
  closeDropdownMenu();
  if (!anchor || !node) return;
  var rect = anchor.getBoundingClientRect();
  node.style.top = (rect.bottom + 6) + "px";
  node.style.right = (window.innerWidth - rect.right) + "px";
  node.style.left = "auto";
  showElement(node);
  state.popover = node;
}

function closeDropdownMenu() {
  if (state.popover) {
    hideElement(state.popover);
  }
  state.popover = null;
}

function getBallotInfoText() {
  var your = state.round.yourSide;
  var opp = state.round.opponent ? " vs " + state.round.opponent : "";
  var first = (state.round.firstSide === "con") ? "Con speaks first" : "Pro speaks first";
  var side = (your === "observer") ? "Observer" : ("You are " + (your === "con" ? "Con" : "Pro"));
  return side + opp + " · " + first;
}

function updateRoundHeaderInfo() {
  var stamp = document.getElementById("round-stamp");
  if (!stamp || !state.round) return;
  var line1 = joinNonEmptyText([state.round.tournament, state.round.roundLabel], " · ");
  var line2 = joinNonEmptyText([line1, state.round.topic], " — ");
  var line3 = joinNonEmptyText([line2, getBallotInfoText()], " · ");
  stamp.textContent = line3 || "Round";
}

function renderContentionJumpLinks() {
  var list = document.getElementById("jump-links");
  if (!list || !state.round) return;
  clearElement(list);
  var caseSide = activeCase();
  var ids = state.round.cases[caseSide].contentionIds;
  for (var i = 0; i < ids.length; i++) {
    var contention = state.round.contentions[ids[i]];
    if (!contention) continue;
    var jump = cloneTemplate("jump-sample");
    jump.dataset.id = ids[i];
    jump.querySelector(".color-dot").style.backgroundColor = JUMP_COLORS[i % JUMP_COLORS.length];
    jump.querySelector(".link-name").textContent = contention.name;
    list.appendChild(jump);
  }
}

function setLinkActiveState(id, on) {
  var node = document.getElementById(id);
  if (node) {
    node.classList.toggle("active", on);
  }
}

function updateActiveSideLinks() {
  var onNotes = (document.body.dataset.page === "notes");
  setLinkActiveState("link-pro", !onNotes && state.caseSide === "pro");
  setLinkActiveState("switch-pro", !onNotes && state.caseSide === "pro");
  setLinkActiveState("link-con", !onNotes && state.caseSide === "con");
  setLinkActiveState("switch-con", !onNotes && state.caseSide === "con");
  setLinkActiveState("link-notes", onNotes);
  setLinkActiveState("switch-notes", onNotes);
}

function updateTopBarAndSidebar() {
  if (!state.round) return;
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
    hideElement(caseLinks);
    hideElement(caseSwitch);
    hideElement(timerChip);
    hideElement(roundMenu);
    hideElement(columnTools);
    hideElement(toolbarTimer);
    showElement(preMenu);
    if (preLabel) {
      preLabel.textContent = formatSideName(state.round.preflowSide) + " preflow";
      showElement(preLabel);
    }
  } else {
    showElement(caseLinks);
    showElement(caseSwitch);
    showElement(timerChip);
    showElement(roundMenu);
    showElement(columnTools);
    showElement(toolbarTimer);
    hideElement(preMenu);
    hideElement(preLabel);
  }
  updateActiveSideLinks();
  updateRoundHeaderInfo();
  renderContentionJumpLinks();
  var sizes = document.querySelector("[data-field='font-size']");
  if (sizes) sizes.value = String(db.settings.fontSize || 14);
  showUndoButtons();
  updateSideMenu();
}

function render() {
  if (window.renderCurrentPage) {
    window.renderCurrentPage();
  }
}

setInterval(function () {
  if (!state.round || state.demo || state.round.isPreflow || !state.round.timers || !state.round.timers.running) {
    return;
  }
  var timer = state.round.timers;
  var left = timer.deadline - Date.now();
  if (left <= 0) {
    if (timer.mode === "prep") {
      timer.prepLeft[timer.prepSide] = 0;
    } else {
      timer.remainingMs = 0;
    }
    timer.running = false;
    timer.mode = null;
    timer.deadline = null;
    timer.timeUp = true;
    beep();
    saveSoon(true);
  }
  updateTimerButton();
}, 200);

document.addEventListener("click", function (event) {
  if (state.popover && !state.popover.contains(event.target) &&
      !event.target.closest("[data-action='timer-toggle'], [data-action='find-toggle'], [data-action='round-menu'], [data-action='note-menu'], [data-action='opening-menu']")) {
    closeDropdownMenu();
  }

  var trigger = event.target.closest("[data-action]");
  if (!trigger) {
    return;
  }

  var action = trigger.dataset.action;
  var id = trigger.dataset.id;

  if (trigger.closest(".sidebar") && window.innerWidth <= 899 && action !== "toggle-nav") {
    state.navOpen = false;
  }

  if (action === "home") {
    go("index.html");
  } else if (action === "show-help") {
    go("help.html");
  } else if (action === "show-settings") {
    go("settings.html");
  } else if (action === "show-openings") {
    go("preflows.html");
  } else if (action === "show-notes") {
    if (document.body.dataset.page !== "notes") {
      go("notes.html");
    }
  } else if (action === "toggle-nav") {
    state.navOpen = !state.navOpen;
  } else if (action === "close-nav") {
    state.navOpen = false;
  } else if (action === "close-dialog") {
    closePopups();
  }

  if (action === "toggle-nav" || action === "close-nav" || trigger.closest(".sidebar")) {
    updateSideMenu();
  }
});

function startApp() {
  state.view = document.body.dataset.page || "home";

  var okBtn = document.getElementById("confirm-ok");
  if (okBtn) {
    okBtn.addEventListener("click", function () {
      var run = confirmRun;
      confirmRun = null;
      hideElement(document.getElementById("confirm-box"));
      if (run) run();
    });
  }

  var icon = document.querySelector(".edit-mark");
  if (icon) {
    icon.addEventListener("click", function () {
      var title = document.querySelector(".title-input");
      if (title) title.focus();
    });
  }

  if ((state.view === "workspace" || state.view === "notes") && !loadOpenRound()) {
    return;
  }

  render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
