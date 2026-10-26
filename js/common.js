var SPEECHES = {
  "pro-constructive": { team: "pro", type: "constructive", short: "1AC", code: "1AC", full: "1AC" },
  "con-constructive": { team: "con", type: "constructive", short: "1NC", code: "1NC", full: "1NC" },
  "pro-rebuttal": { team: "pro", type: "rebuttal", short: "2AC", code: "2AC", full: "2AC" },
  "con-rebuttal": { team: "con", type: "rebuttal", short: "2NC/1NR", code: "2NC/1NR", full: "2NC/1NR" },
  "pro-summary": { team: "pro", type: "summary", short: "1AR", code: "1AR", full: "1AR" },
  "con-summary": { team: "con", type: "summary", short: "2NR", code: "2NR", full: "2NR" },
  "pro-final": { team: "pro", type: "final", short: "2AR", code: "2AR", full: "2AR" },
  "con-final": { team: "con", type: "final", short: "2NR", code: "2NR", full: "2NR" }
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
  { target: "[data-tour='clip-btn']", text: "The ev button attaches evidence to the selected note, including a response." },
  { target: "[data-tour='proof-panel']", text: "Paste from Docs or Word. Bold text and highlights stay. Your flow stays visible." },
  { target: "[data-tour='timer']", text: "Type the minutes and seconds, then press Start." },
  { target: "[data-tour='save']", text: "Notes save in this browser. Export downloads a record; version 1 does not import rounds." }
];

function createUniqueId(prefix) {
  var randomPart = Math.floor(Math.random() * 100000).toString(36);
  var timePart = Date.now().toString(36);

  return prefix + "-" + timePart + "-" + randomPart;
}

function getDefaultSpeechTimes() {
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

function fixSpeechTimes(durations) {
  var base = getDefaultSpeechTimes();
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
    durations: getDefaultSpeechTimes()
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
  if (side === "pro" || side === "aff") {
    return "Aff";
  } else {
    return "Neg";
  }
}

function getTimerSteps(firstSide, durations) {
  var first = "pro";

  if (firstSide === "con") {
    first = "con";
  }

  var second = "pro";

  if (first === "pro") {
    second = "con";
  }

  var times = durations;

  if (!times) {
    times = getDefaultSpeechTimes();
  }

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
  var src = notes;

  if (!src) {
    src = {};
  }

  var firstCrossfire = src.firstCrossfire;

  if (!firstCrossfire) {
    firstCrossfire = "";
  }

  var secondCrossfire = src.secondCrossfire;

  if (!secondCrossfire) {
    secondCrossfire = "";
  }

  var grandCrossfire = src.grandCrossfire;

  if (!grandCrossfire) {
    grandCrossfire = "";
  }

  var reflections = src.reflections;

  if (!reflections) {
    reflections = "";
  }

  return {
    firstCrossfire: firstCrossfire,
    secondCrossfire: secondCrossfire,
    grandCrossfire: grandCrossfire,
    reflections: reflections
  };
}

function createNewTimer(firstSide, durations) {
  var times = durations;

  if (!times) {
    times = getDefaultSpeechTimes();
  }

  var plan = getTimerSteps(firstSide, times);
  var allotted = {};

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
  var times = getDefaultSpeechTimes();

  if (settings && settings.durations) {
    times = settings.durations;
  }

  var groups = {};

  groups[pro.contention.id] = pro.contention;
  groups[con.contention.id] = con.contention;

  var title = fields.title;

  if (!title) {
    title = "Untitled round";
  }

  var topic = fields.topic;

  if (!topic) {
    topic = "";
  }

  var tournament = fields.tournament;

  if (!tournament) {
    tournament = "";
  }

  var roundLabel = fields.roundLabel;

  if (!roundLabel) {
    roundLabel = "";
  }

  var opponent = fields.opponent;

  if (!opponent) {
    opponent = "";
  }

  var yourSide = fields.yourSide;

  if (!yourSide) {
    yourSide = "pro";
  }

  var firstSide = "pro";

  if (fields.firstSide === "con") {
    firstSide = "con";
  }

  return {
    id: createUniqueId("round"),
    title: title,
    topic: topic,
    tournament: tournament,
    roundLabel: roundLabel,
    opponent: opponent,
    yourSide: yourSide,
    firstSide: firstSide,
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
    timers: createNewTimer(firstSide, times),
    columnFocus: {
      pro: { count: null, start: 0 },
      con: { count: null, start: 0 }
    },
    scroll: { pro: 0, con: 0 }
  };
}

function createNewPreflow(fields) {
  var side = "pro";

  if (fields.side === "con") {
    side = "con";
  }

  var contention = createContentionGroup("Contention 1");
  var groups = {};

  groups[contention.id] = contention;

  var title = fields.title;

  if (!title) {
    title = "Untitled preflow";
  }

  var topic = fields.topic;

  if (!topic) {
    topic = "";
  }

  return {
    id: createUniqueId("preflow"),
    title: title,
    topic: topic,
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
    timers: createNewTimer(preflow.side, getDefaultSpeechTimes()),
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
    html: "",
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

function removeIdFromList(list, id) {
  var kept = [];

  for (var i = 0; i < list.length; i++) {
    if (list[i] !== id) {
      kept.push(list[i]);
    }
  }

  return kept;
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
    var name = "";

    if (round.contentions[ids[i]]) {
      name = round.contentions[ids[i]].name;
    }

    var nameToCheck = name;

    if (!nameToCheck) {
      nameToCheck = "";
    }

    var num = /^Contention (\d+)$/.exec(nameToCheck);

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

  return { all: all, visible: all.slice(), start: 0, count: all.length };
}

function getNewIdForCopy(map, oldId) {
  if (!oldId) return null;

  if (!map[oldId]) {
    map[oldId] = createUniqueId("id");
  }

  return map[oldId];
}

function copyContentionsNotesAndEvidence(source) {
  var map = {};
  var groups = {};
  var notes = {};
  var evidence = {};
  var names = Object.keys(source.contentions);

  for (var i = 0; i < names.length; i++) {
    var oldId = names[i];
    var next = getNewIdForCopy(map, oldId);
    var group = source.contentions[oldId];
    var oldStarts = group.startingPointIds;
    var newStarts = [];

    for (var n = 0; n < oldStarts.length; n++) {
      newStarts.push(getNewIdForCopy(map, oldStarts[n]));
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
    var nextNoteId = getNewIdForCopy(map, noteId);
    var copiedParentId = null;

    if (note.parentId) {
      copiedParentId = getNewIdForCopy(map, note.parentId);
    }

    var copiedMarker = note.marker;

    if (!copiedMarker) {
      copiedMarker = "";
    }

    var copiedEvidenceId = null;

    if (note.evidenceId) {
      copiedEvidenceId = getNewIdForCopy(map, note.evidenceId);
    }

    notes[nextNoteId] = {
      id: nextNoteId,
      contentionId: getNewIdForCopy(map, note.contentionId),
      speechId: note.speechId,
      parentId: copiedParentId,
      order: note.order,
      text: note.text,
      html: note.html || "",
      marker: copiedMarker,
      evidenceId: copiedEvidenceId
    };
  }

  names = Object.keys(source.evidence || {});
  for (var k = 0; k < names.length; k++) {
    var evId = names[k];
    var item = source.evidence[evId];
    var nextEvId = getNewIdForCopy(map, evId);

    evidence[nextEvId] = {
      id: nextEvId,
      noteId: getNewIdForCopy(map, item.noteId),
      html: item.html,
      plain: item.plain
    };
  }

  return { map: map, contentions: groups, notes: notes, evidence: evidence };
}

function copyIdList(ids, map) {
  var list = [];

  for (var i = 0; i < ids.length; i++) {
    list.push(map[ids[i]]);
  }

  return list;
}

function cloneRound(round, settings) {
  var cloned = copyContentionsNotesAndEvidence(round);
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
    pro: { contentionIds: copyIdList(round.cases.pro.contentionIds, cloned.map) },
    con: { contentionIds: copyIdList(round.cases.con.contentionIds, cloned.map) }
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
  var cloned = copyContentionsNotesAndEvidence({
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
      if (note.evidenceId) {
        delete cloned.evidence[note.evidenceId];
      }

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

  round.cases[side].contentionIds = copyIdList(preflow.contentionIds, cloned.map);
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
      copy.html = note.html || "";
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

function makePointAMainPoint(round, note) {
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

  if (!round.cases) {
    round.cases = {};
  }

  if (!round.cases.pro) {
    round.cases.pro = { contentionIds: [] };
  }

  if (!round.cases.con) {
    round.cases.con = { contentionIds: [] };
  }

  if (!round.cases.pro.contentionIds) {
    round.cases.pro.contentionIds = [];
  }

  if (!round.cases.con.contentionIds) {
    round.cases.con.contentionIds = [];
  }

  if (!round.contentions) {
    round.contentions = {};
  }

  if (!round.notes) {
    round.notes = {};
  }

  if (!round.evidence) {
    round.evidence = {};
  }

  round.crossNotes = createCrossNotesObject(round.crossNotes);
  if (!round.columnFocus) {
    round.columnFocus = {};
  }

  if (!round.columnFocus.pro) {
    round.columnFocus.pro = { count: null, start: 0 };
  }

  if (!round.columnFocus.con) {
    round.columnFocus.con = { count: null, start: 0 };
  }

  if (!round.scroll) {
    round.scroll = { pro: 0, con: 0 };
  }

  if (typeof round.scroll.pro !== "number") {
    round.scroll.pro = 0;
  }

  if (typeof round.scroll.con !== "number") {
    round.scroll.con = 0;
  }

  if (!round.timers || !round.timers.prepLeft) {
    round.timers = createNewTimer(round.firstSide, getDefaultSpeechTimes());
  } else {
    if (round.timers.prepLeft.pro == null || round.timers.prepLeft.pro < 0) {
      round.timers.prepLeft.pro = 0;
    }

    if (round.timers.prepLeft.con == null || round.timers.prepLeft.con < 0) {
      round.timers.prepLeft.con = 0;
    }

    if (!round.timers.allotted) {
      round.timers.allotted = {};
    }
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
      if (!cont.name) {
        cont.name = "Contention " + (kept.length + 1);
      }

      if (!cont.startingPointIds) {
        cont.startingPointIds = [];
      }

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
      var side = getContentionSide(round, nItem.contentionId);

      if (!side) {
        side = "pro";
      }

      nItem.speechId = side + "-constructive";
    }

    if (!nItem.marker) {
      nItem.marker = "";
    }
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
        makePointAMainPoint(round, checkNote);
        break;
      }

      loopSeen[currId] = true;
      var parent = round.notes[currId];

      currId = parent && parent.parentId;
      stepCount++;
    }

    if (checkNote.parentId && !round.notes[checkNote.parentId]) {
      makePointAMainPoint(round, checkNote);
      continue;
    }

    if (!checkNote.parentId) continue;

    var parentObj = round.notes[checkNote.parentId];

    if (parentObj.contentionId !== checkNote.contentionId) {
      makePointAMainPoint(round, checkNote);
      continue;
    }

    var cSide = getContentionSide(round, checkNote.contentionId);
    var sOrder = getSpeechesForSide(round, cSide);

    if (sOrder.indexOf(parentObj.speechId) < 0 || sOrder.indexOf(checkNote.speechId) < 0 || sOrder.indexOf(parentObj.speechId) >= sOrder.indexOf(checkNote.speechId)) {
      makePointAMainPoint(round, checkNote);
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

  if (pre.side !== "con") {
    pre.side = "pro";
  }

  if (!pre.contentions) {
    pre.contentions = {};
  }

  if (!pre.notes) {
    pre.notes = {};
  }

  if (!pre.evidence) {
    pre.evidence = {};
  }

  if (!pre.contentionIds) {
    pre.contentionIds = [];
  }

  var kept = [];
  var seen = {};

  for (var i = 0; i < pre.contentionIds.length; i++) {
    var id = pre.contentionIds[i];
    if (seen[id] || !pre.contentions[id]) continue;

    seen[id] = true;
    var cont = pre.contentions[id];

    if (!cont.name) {
      cont.name = "Contention " + (kept.length + 1);
    }

    if (!cont.startingPointIds) {
      cont.startingPointIds = [];
    }

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

  if (left < 0) {
    left = 0;
  }

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
  if (value && value >= 56) return value;

  var noteText = note.text;

  if (!noteText) {
    noteText = "";
  }

  var lines = String(noteText).split("\n");
  var visual = 0;

  for (var i = 0; i < lines.length; i++) {
    visual += Math.max(1, Math.ceil((lines[i].length || 1) / 22));
  }

  if (!visual) {
    visual = 1;
  }

  return Math.max(32, visual * 20 + 12 + (note.marker ? 18 : 0));
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
      if (i < siblings.length - 1) {
        stack += 2;
      }
    }

    if (stack > maxStack) {
      maxStack = stack;
    }
  }

  saved[note.id] = Math.max(own, maxStack);
  return saved[note.id];
}

function placePointReplies(round, parentNote, parentTop, caseSide, heights, positions, colTops) {
  var later = getSpeechesAfter(round, caseSide, parentNote.speechId);

  for (var s = 0; s < later.length; s++) {
    var speechId = later[s];
    var siblings = getRepliesInColumn(round, parentNote.id, speechId);
    if (!siblings.length) continue;

    var curY = Math.max(parentTop, colTops[speechId] || 0);

    for (var i = 0; i < siblings.length; i++) {
      var sibNote = siblings[i];
      var sibHeight = calculateCardHeight(sibNote, heights);

      positions[sibNote.id] = {
        top: curY,
        height: sibHeight,
        speechId: speechId
      };

      colTops[speechId] = curY + sibHeight + 2;
      var thisTop = curY;
      curY += sibHeight + 2;

      placePointReplies(round, sibNote, thisTop, caseSide, heights, positions, colTops);
    }
  }
}

function calculatePointPosition(round, note, top, caseSide, heights, saved, positions) {
  var own = calculateCardHeight(note, heights);
  var later = getSpeechesAfter(round, caseSide, note.speechId);

  positions[note.id] = {
    top: top,
    height: own,
    reserved: own,
    speechId: note.speechId
  };
  for (var s = 0; s < later.length; s++) {
    var siblings = getRepliesInColumn(round, note.id, later[s]);
    var y = top;

    for (var i = 0; i < siblings.length; i++) {
      calculatePointPosition(round, siblings[i], y, caseSide, heights, saved, positions);
      y += calculateCardHeight(siblings[i], heights) + 2;
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

function calculateCaseFlowLayout(round, caseSide, heights) {
  var positions = {};
  var slots = [];
  var colTops = {};

  positions._threads = [];

  var contentionIds = (round.cases[caseSide] && round.cases[caseSide].contentionIds) || [];
  for (var c = 0; c < contentionIds.length; c++) {
    var contention = round.contentions[contentionIds[c]];
    if (!contention) continue;

    for (var i = 0; i < contention.startingPointIds.length; i++) {
      var id = contention.startingPointIds[i];
      var note = round.notes[id];
      if (!note) continue;

      var own = calculateCardHeight(note, heights);
      var speech = note.speechId;
      var top = colTops[speech] || 0;

      positions[note.id] = {
        top: top,
        height: own,
        speechId: speech
      };

      positions._threads.push({ id: note.id, top: top, reserved: own });
      colTops[speech] = top + own + 2;

      placePointReplies(round, note, top, caseSide, heights, positions, colTops);
    }
  }

  var names = Object.keys(positions);
  var slotTops = {};
  var allSpeeches = getSpeechesForSide(round, caseSide);
  for (var sp = 0; sp < allSpeeches.length; sp++) {
    slotTops[allSpeeches[sp]] = colTops[allSpeeches[sp]] || 0;
  }

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

      var sTop = Math.max(item.top, slotTops[speechId] || 0);
      slots.push({
        parentId: names[j],
        speechId: speechId,
        top: sTop
      });
      slotTops[speechId] = sTop + 34;
    }
  }

  var bottom = 0;
  for (var p = 0; p < names.length; p++) {
    if (names[p] === "_threads") continue;
    var pos = positions[names[p]];
    if (pos && pos.top + pos.height > bottom) {
      bottom = pos.top + pos.height;
    }
  }

  for (var k = 0; k < slots.length; k++) {
    var slot = slots[k];
    if (slot.top + 48 > bottom) {
      bottom = slot.top + 48;
    }
  }

  return {
    positions: positions,
    slots: slots,
    height: bottom > 0 ? Math.max(bottom, 60) : 0
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

  if (!data.rounds) {
    data.rounds = {};
  }

  if (!data.preflows) {
    data.preflows = {};
  }

  if (!data.settings) {
    data.settings = getDefaultSettings();
  }

  data.settings.durations = fixSpeechTimes(data.settings.durations);

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
  if (node) {
    node.classList.remove("hide");
  }
}

function hideElement(node) {
  if (node) {
    node.classList.add("hide");
  }
}

function clearElement(node) {
  if (!node) return;

  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function setElementText(node, text) {
  if (!node) return;

  var shownText = text;

  if (!shownText) {
    shownText = "";
  }

  node.textContent = shownText;
  if (text) {
    showElement(node);
  } else {
    hideElement(node);
  }
}

function getListFromObject(box) {
  var list = [];
  if (!box) return list;

  for (var key in box) {
    if (Object.prototype.hasOwnProperty.call(box, key)) {
      list.push(box[key]);
    }
  }

  return list;
}

function joinFilledText(parts, gap) {
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
    var dateA = a.updatedAt;

    if (!dateA) {
      dateA = "";
    }

    var dateB = b.updatedAt;

    if (!dateB) {
      dateB = "";
    }

    if (dateB > dateA) return 1;

    if (dateB < dateA) return -1;

    return 0;
  });
}

function formatSecondsToClock(ms) {
  var totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  var formattedSeconds = "" + seconds;

  if (seconds < 10) {
    formattedSeconds = "0" + seconds;
  }

  return minutes + ":" + formattedSeconds;
}

function formatSideName(side) {
  if (side === "con" || side === "neg") return "Neg";

  if (side === "pro" || side === "aff") return "Aff";

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
  var rawTitle = title;

  if (!rawTitle) {
    rawTitle = "round";
  }

  var text = String(rawTitle).toLowerCase();
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

  if (!out) return "round";

  return out;
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

function pastedStyleIsAllowed(value) {
  var lower = String(value || "").toLowerCase();
  if (lower.indexOf("url(") !== -1) return false;

  if (lower.indexOf("expression") !== -1) return false;

  if (lower.indexOf("javascript") !== -1) return false;

  if (lower.indexOf("@import") !== -1) return false;

  return true;
}

function copyAllowedStyles(style, raw) {
  var out = [];
  if (!style) return "";

  for (var i = 0; i < SAFE_STYLES.length; i++) {
    var val = style.getPropertyValue(SAFE_STYLES[i]);
    if (!val) continue;

    if (!pastedStyleIsAllowed(val)) continue;

    out.push(SAFE_STYLES[i] + ":" + val);
  }

  var joined = out.join(";");

  if (joined.indexOf("background-color") === -1) {
    var bg = style.getPropertyValue("background");

    if (bg && bg.indexOf("url(") === -1 && bg.indexOf("gradient") === -1 && pastedStyleIsAllowed(bg)) {
      var first = bg.split(" ")[0];

      if (first) {
        out.push("background-color:" + first);
      }
    }
  }

  joined = out.join(";");
  var rawText = String(raw || "").toLowerCase();
  var markAt = rawText.indexOf("mso-highlight:");

  if (markAt !== -1 && joined.indexOf("background-color") === -1) {
    var color = rawText.slice(markAt + "mso-highlight:".length).split(";")[0];

    color = color.replace(/^\s+|\s+$/g, "");
    if (color && color !== "none" && color !== "auto" && pastedStyleIsAllowed(color)) {
      out.push("background-color:" + color);
    }
  }

  copyBoldAndItalic(out, rawText);
  return out.join(";");
}

function readRawStyleValue(rawText, name) {
  var key = name + ":";
  var at = rawText.indexOf(key);
  if (at === -1) return "";

  return rawText.slice(at + key.length).split(";")[0].replace(/^\s+|\s+$/g, "");
}

function findStyleInList(out, name) {
  var i;

  for (i = 0; i < out.length; i++) {
    if (out[i].indexOf(name + ":") === 0) return out[i];
  }

  return "";
}

function putStyleInList(out, name, value) {
  var i;

  for (i = 0; i < out.length; i++) {
    if (out[i].indexOf(name + ":") === 0) {
      out[i] = name + ":" + value;
      return;
    }
  }

  out.push(name + ":" + value);
}

function copyBoldAndItalic(out, rawText) {
  var weightMark = readRawStyleValue(rawText, "mso-ansi-font-weight");

  if (!weightMark) {
    weightMark = readRawStyleValue(rawText, "mso-bidi-font-weight");
  }

  var currentWeight = findStyleInList(out, "font-weight");
  var weightIsPlain = !currentWeight || currentWeight.indexOf("normal") !== -1 || currentWeight.indexOf("400") !== -1;

  if ((weightMark === "bold" || weightMark === "700") && weightIsPlain) {
    putStyleInList(out, "font-weight", "bold");
  }

  var styleMark = readRawStyleValue(rawText, "mso-ansi-font-style");

  if (!styleMark) {
    styleMark = readRawStyleValue(rawText, "mso-bidi-font-style");
  }

  var currentStyle = findStyleInList(out, "font-style");

  if (styleMark === "italic" && (!currentStyle || currentStyle.indexOf("normal") !== -1)) {
    putStyleInList(out, "font-style", "italic");
  }
}

function keepSafeLink(href) {
  var value = String(href || "").trim();
  var lower = value.toLowerCase();
  if (lower.indexOf("https:") === 0) return value;

  if (lower.indexOf("http:") === 0) return value;

  if (lower.indexOf("mailto:") === 0) return value;

  return "";
}

function cleanChildTags(node, notice, fragment) {
  var child = node.firstChild;

  while (child) {
    var next = child.nextSibling;
    var cleaned = cleanOneTag(child, notice);

    if (cleaned) {
      fragment.appendChild(cleaned);
    }

    child = next;
  }
}

function cleanOneTag(node, notice) {
  if (node.nodeType === 3) return document.createTextNode(node.textContent);

  if (node.nodeType !== 1) return null;

  if (node.tagName === "TABLE" || node.tagName === "IMG" || node.tagName === "IMAGE") {
    if (notice.indexOf("simplified") === -1) {
      notice.push("simplified");
    }

    var text = "";

    if (node.tagName !== "IMG") {
      text = node.textContent;
      if (!text) {
        text = "";
      }
    }

    if (!text) return null;

    return document.createTextNode(text);
  }

  if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.tagName === "IFRAME" || node.tagName === "OBJECT") {
    return null;
  }

  if (!SAFE_TAGS[node.tagName]) {
    var copyFragment = document.createDocumentFragment();

    cleanChildTags(node, notice, copyFragment);
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

  var style = copyAllowedStyles(node.style, node.getAttribute("style"));

  if (node.tagName === "FONT") {
    if (node.color) {
      if (style) {
        style = style + ";color:" + node.color;
      } else {
        style = "color:" + node.color;
      }
    }

    if (node.size) {
      var fontPx = Number(node.size) * 4 + 8;

      if (style) {
        style = style + ";font-size:" + fontPx + "px";
      } else {
        style = "font-size:" + fontPx + "px";
      }
    }
  }

  if (style) {
    copy.setAttribute("style", style);
  }

  if (copy.tagName === "A") {
    var href = keepSafeLink(node.getAttribute("href"));

    if (!href) {
      var plainFragment = document.createDocumentFragment();

      cleanChildTags(node, notice, plainFragment);
      return plainFragment;
    }

    copy.setAttribute("href", href);
  }

  if (copy.tagName !== "BR") {
    cleanChildTags(node, notice, copy);
  }

  return copy;
}

function classNameFromCssRule(selector) {
  var name = String(selector || "").replace(/^\s+|\s+$/g, "");
  if (!name) return "";

  if (name.indexOf(" ") !== -1) return "";

  if (name.indexOf(",") !== -1) return "";

  if (name.indexOf(":") !== -1) return "";

  if (name.indexOf("#") !== -1) return "";

  var dot = name.indexOf(".");
  if (dot === -1) return "";

  if (name.indexOf(".", dot + 1) !== -1) return "";

  var className = name.slice(dot + 1);
  if (!className) return "";

  var tag = name.slice(0, dot);
  var t;

  for (t = 0; t < tag.length; t++) {
    var ch = tag.charAt(t).toLowerCase();
    if (ch < "a" || ch > "z") return "";
  }

  return className;
}

function copyClassStylesOntoPaste(parsed) {
  var styleTags = parsed.querySelectorAll("style");
  var classStyles = {};
  var s;

  for (s = 0; s < styleTags.length; s++) {
    var text = styleTags[s].textContent || "";
    var chunks = text.split("}");
    var c;

    for (c = 0; c < chunks.length; c++) {
      var chunk = chunks[c];
      var open = chunk.indexOf("{");
      if (open === -1) continue;

      var className = classNameFromCssRule(chunk.slice(0, open));
      if (!className) continue;

      classStyles[className] = chunk.slice(open + 1);
    }
  }

  var nodes = parsed.body.querySelectorAll("[class]");
  var n;

  for (n = 0; n < nodes.length; n++) {
    var names = (nodes[n].getAttribute("class") || "").split(" ");
    var extra = "";
    var i;

    for (i = 0; i < names.length; i++) {
      if (classStyles[names[i]]) {
        extra += classStyles[names[i]] + ";";
      }
    }

    if (!extra) continue;

    var current = nodes[n].getAttribute("style") || "";

    nodes[n].setAttribute("style", extra + current);
  }

  return parsed.body;
}

function cleanPastedHtml(html) {
  var notice = [];
  var htmlText = html;

  if (!htmlText) {
    htmlText = "";
  }

  var parsed = new DOMParser().parseFromString(String(htmlText), "text/html");
  var source = copyClassStylesOntoPaste(parsed);
  var wrap = document.createElement("div");

  if (source) {
    cleanChildTags(source, notice, wrap);
  }

  var plain = wrap.textContent;

  if (!plain) {
    plain = "";
  }

  var noticeText = "";

  if (notice.length > 0) {
    noticeText = "Some pasted content was simplified so it stays readable.";
  }

  return {
    html: wrap.innerHTML,
    plain: plain,
    notice: noticeText
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
  tourStep: -1,
  demo: false,
  navOpen: false,
  query: "",
  composing: false
};

var confirmRun = null;

function getOpenCaseSide() {
  if (state.round && state.round.isPreflow) {
    return state.round.preflowSide;
  }

  return state.caseSide;
}

function getFontSize() {
  var size = 14;

  if (db && db.settings && db.settings.fontSize) {
    size = db.settings.fontSize;
  }

  return size;
}

function clearUndoHistory() {
  state.history.past = [];
  state.history.future = [];
  state.history.typing = false;
  showUndoButtons();
}

function copyRoundForUndo() {
  if (!state.round) return null;

  return JSON.stringify({
    cases: state.round.cases,
    contentions: state.round.contentions,
    notes: state.round.notes,
    evidence: state.round.evidence
  });
}

function restoreRoundFromUndo(json) {
  if (!state.round || !json) return;

  var data = JSON.parse(json);

  state.round.cases = data.cases;
  state.round.contentions = data.contentions;
  state.round.notes = data.notes;
  state.round.evidence = data.evidence;
  repairRoundData(state.round);
  saveRoundAfterAMoment(true);
  render();
}

function saveUndoStep() {
  var snap = copyRoundForUndo();
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

function startTypingUndo() {
  if (!state.history.typing) {
    saveUndoStep();
    state.history.typing = true;
  }

  clearTimeout(state.typingTimer);
  state.typingTimer = setTimeout(function () {
    state.history.typing = false;
  }, 900);
}

function saveUndoBeforeChange() {
  finishTypingUndo();
  saveUndoStep();
}

function undo() {
  finishTypingUndo();
  if (!state.history.past.length) return;

  var current = copyRoundForUndo();
  var previous = state.history.past.pop();

  state.history.future.push(current);
  state.history.typing = false;
  restoreRoundFromUndo(previous);
  showUndoButtons();
}

function redo() {
  finishTypingUndo();
  if (!state.history.future.length) return;

  var current = copyRoundForUndo();
  var next = state.history.future.pop();

  state.history.past.push(current);
  state.history.typing = false;
  restoreRoundFromUndo(next);
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

function saveRoundAfterAMoment(now) {
  clearTimeout(state.saveTimer);
  state.saveState = "Saving…";
  updateSaveLabel();
  if (now) {
    saveThisRound();
  } else {
    state.saveTimer = setTimeout(saveThisRound, 450);
  }
}

function finishTypingUndo() {
  clearTimeout(state.typingTimer);
  state.history.typing = false;
}

function rememberOpenRound() {
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

function openPage(url) {
  window.location.href = url;
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

function beginFeatureTour() {
  var backId = "";

  if (state.round && !state.demo && !state.round.isPreflow) {
    backId = state.round.id;
  }

  sessionStorage.setItem("tourReturn", backId);

  var demo = createDemoRound();

  sessionStorage.setItem("tourDemo", "1");
  sessionStorage.setItem("tourStep", "0");
  sessionStorage.setItem("tourRound", JSON.stringify(demo));
  sessionStorage.setItem("caseSide", "pro");
  sessionStorage.removeItem("isOpenPreflow");

  if (document.body.dataset.page === "workspace") {
    state.demo = true;
    state.round = demo;
    state.caseSide = "pro";
    state.evidenceOpen = false;
    state.selectedId = null;
    state.tourStep = 0;
    clearUndoHistory();
    render();
    return;
  }

  openPage("workspace.html");
}

function loadOpenRound() {
  try {
    sessionStorage.removeItem("tourDemo");
    sessionStorage.removeItem("tourRound");
    sessionStorage.removeItem("tourStep");
    sessionStorage.removeItem("tourReturn");
  } catch (error) {}
  state.demo = false;

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
    rememberOpenRound();
    return true;
  }

  if (id && db.rounds[id]) {
    state.round = db.rounds[id];
    rememberOpenRound();
    return true;
  }

  var all = getListFromObject(db.rounds);

  if (all.length > 0) {
    state.round = sortByRecentDate(all)[0];
    rememberOpenRound();
    return true;
  }

  openPage("index.html");
  return false;
}

function openRound(id) {
  try {
    sessionStorage.setItem("openRoundId", id);
    sessionStorage.removeItem("isOpenPreflow");
  } catch (error) {}
  openPage("workspace.html");
}

function openOpening(id) {
  try {
    sessionStorage.setItem("openRoundId", id);
    sessionStorage.setItem("isOpenPreflow", "yes");
  } catch (error) {}
  openPage("workspace.html");
}

function updateSideMenu() {
  var shell = document.querySelector(".workspace");
  var side = document.querySelector(".sidebar");

  if (state.navOpen) {
    if (shell) {
      shell.classList.add("menu-open");
    }

    if (side) {
      side.classList.add("open");
    }
  } else {
    if (shell) {
      shell.classList.remove("menu-open");
    }

    if (side) {
      side.classList.remove("open");
    }
  }
}

function closePopups() {
  var boxes = document.querySelectorAll(".popup-cover");

  for (var i = 0; i < boxes.length; i++) {
    hideElement(boxes[i]);
  }

  closeDropdownMenu();
}

function askConfirm(title, text, okLabel, run) {
  confirmRun = run;
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-text").textContent = text;
  var buttonLabel = okLabel;

  if (!buttonLabel) {
    buttonLabel = "OK";
  }

  document.getElementById("confirm-ok").textContent = buttonLabel;
  showElement(document.getElementById("confirm-box"));
}

function getTimerButtonLabel() {
  var timer = state.round.timers;
  if (!timer) return "Timer";

  if (timer.running && timer.deadline) {
    return formatSecondsToClock(timer.deadline - Date.now());
  }

  if (timer.timeUp) return "0:00";

  return "Timer";
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

  var clock = document.getElementById("popover-clock");

  if (clock) {
    var shown = state.round.timers.remainingMs;

    if (state.round.timers.running && state.round.timers.deadline) {
      shown = state.round.timers.deadline - Date.now();
    }

    clock.textContent = formatSecondsToClock(shown);
  }

  var startBtn = document.getElementById("timer-start-btn");

  if (startBtn) {
    if (state.round.timers.running) {
      startBtn.textContent = "Pause";
    } else {
      startBtn.textContent = "Start";
    }
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

function readTimerLength() {
  var minutesBox = document.getElementById("timer-minutes");
  var secondsBox = document.getElementById("timer-seconds");
  var minutes = 0;

  if (minutesBox) {
    minutes = Number(minutesBox.value);
  }

  var seconds = 0;

  if (secondsBox) {
    seconds = Number(secondsBox.value);
  }

  if (!minutes || minutes < 0) {
    minutes = 0;
  }

  if (!seconds || seconds < 0) {
    seconds = 0;
  }

  return (minutes * 60 + seconds) * 1000;
}

function fillTimerInputs(ms) {
  var safeMs = ms;

  if (!safeMs) {
    safeMs = 0;
  }

  var total = Math.max(0, Math.ceil(safeMs / 1000));
  var minutesBox = document.getElementById("timer-minutes");
  var secondsBox = document.getElementById("timer-seconds");

  if (minutesBox) {
    minutesBox.value = String(Math.floor(total / 60));
  }

  if (secondsBox) {
    secondsBox.value = String(total % 60);
  }
}

function openSimpleTimer(anchor) {
  if (!state.round || state.round.isPreflow || !state.round.timers) return;

  var pop = document.getElementById("timer-popover");
  if (!pop) return;

  if (state.popover === pop) {
    closeDropdownMenu();
    return;
  }

  var timers = state.round.timers;
  var ms = timers.remainingMs;

  if (timers.running && timers.deadline) {
    ms = Math.max(0, timers.deadline - Date.now());
  }

  var clock = document.getElementById("popover-clock");
  if (clock) {
    clock.textContent = formatSecondsToClock(ms);
  }

  if (!timers.running) {
    fillTimerInputs(ms);
  }

  var startBtn = document.getElementById("timer-start-btn");
  if (startBtn) {
    startBtn.textContent = timers.running ? "Pause" : "Start";
  }

  showElement(pop);
  state.popover = pop;
}

function startOrPauseTimer() {
  if (!state.round || !state.round.timers) return;

  var timers = state.round.timers;

  if (timers.running) {
    timers.remainingMs = Math.max(0, timers.deadline - Date.now());
    timers.running = false;
    timers.deadline = null;
    timers.mode = null;
    saveRoundAfterAMoment(true);
  } else {
    var amount = readTimerLength();
    if (amount <= 0) amount = 240000;

    timers.remainingMs = amount;
    timers.timeUp = false;
    startTimer("speech");
  }

  updateTimerButton();
}

function resetSimpleTimer() {
  if (!state.round || !state.round.timers) return;

  var timers = state.round.timers;

  timers.running = false;
  timers.mode = null;
  timers.deadline = null;
  timers.timeUp = false;
  var amount = readTimerLength();
  if (amount <= 0) amount = 240000;
  timers.remainingMs = amount;
  fillTimerInputs(amount);
  saveRoundAfterAMoment(true);
  updateTimerButton();
}

function formatSelectedProof(command, value) {
  var selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  var node = selection.anchorNode;
  if (!node) return;

  var el = node.parentElement;

  if (node.nodeType === 1) {
    el = node;
  }

  if (!el || !el.closest) return;

  var proof = el.closest(".proof-text");
  var card = el.closest(".point-input, .reply-box, .new-box");
  var editor = proof || card;
  if (!editor) return;

  document.execCommand("styleWithCSS", false, true);
  if (value) {
    document.execCommand(command, false, value);
  } else {
    document.execCommand(command, false, null);
  }

  if (proof && typeof saveEvidenceText === "function") {
    startTypingUndo();
    saveEvidenceText(proof);
    saveRoundAfterAMoment(false);
  }

  if (card && card.classList.contains("point-input") && typeof savePointFormatting === "function") {
    startTypingUndo();
    savePointFormatting(card);
    saveRoundAfterAMoment(false);
  }
}

function startTimer(mode, side) {
  var timer = state.round.timers;

  timer.running = true;
  timer.mode = mode;
  timer.timeUp = false;
  if (mode === "prep") {
    timer.prepSide = side;
    var prepMs = timer.prepLeft[side];

    if (!prepMs) {
      prepMs = 0;
    }

    timer.deadline = Date.now() + prepMs;
  } else {
    timer.deadline = Date.now() + timer.remainingMs;
  }

  saveRoundAfterAMoment(true);
}

function calculateColumnWidth(pane, count) {
  var total = 800;
  var sidePad = 0;

  if (pane && pane.clientWidth) {
    total = pane.clientWidth;
    var box = window.getComputedStyle(pane);

    sidePad = parseFloat(box.paddingLeft) + parseFloat(box.paddingRight);

  } else if (typeof pane === "number" && pane > 0) {
    total = pane;
  }

  if (!count || count < 1) {
    count = 1;
  }

  var gap = 0;
  var minWidth = 220;
  var columnsInView = count;

  if (window.innerWidth <= 899) {
    gap = 0;
    minWidth = 148;
    if (count < 2) {
      columnsInView = count;
    } else {
      columnsInView = 2;
    }
  }

  var inner = total - sidePad;

  if (inner < minWidth) {
    inner = total;
  }

  var w = Math.floor((inner - (columnsInView - 1) * gap) / columnsInView);

  if (w < minWidth) {
    w = minWidth;
  }

  return w;
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
  var opp = "";

  if (state.round.opponent) {
    opp = " vs " + state.round.opponent;
  }

  var first = "Aff speaks first";

  if (state.round.firstSide === "con" || state.round.firstSide === "neg") {
    first = "Neg speaks first";
  }

  var side = "You are Aff";

  if (your === "observer") {
    side = "Observer";

  } else if (your === "con" || your === "neg") {
    side = "You are Neg";
  }

  return side + opp + " · " + first;
}

function updateRoundHeaderInfo() {
  if (!state.round) return;

  var title = document.querySelector(".title-input");

  if (title && document.activeElement !== title && title.value !== state.round.title) {
    title.value = state.round.title;
  }

  var note = document.getElementById("title-note");
  if (!note) return;

  var line1 = joinFilledText([state.round.tournament, state.round.roundLabel], " · ");
  var topicLine = "";

  if (state.round.topic && state.round.topic !== state.round.title) {
    topicLine = state.round.topic;
  }

  var line2 = joinFilledText([line1, topicLine], " — ");
  var line3 = joinFilledText([line2, getBallotInfoText()], " · ");

  note.textContent = line3;
}

function renderContentionJumpLinks() {
  var list = document.getElementById("jump-links");
  if (!list || !state.round) return;

  clearElement(list);
  var caseSide = getOpenCaseSide();
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
  var findBtn = document.getElementById("find-btn");

  if (preflow) {
    hideElement(caseLinks);
    hideElement(caseSwitch);
    hideElement(timerChip);
    hideElement(roundMenu);
    hideElement(columnTools);
    hideElement(toolbarTimer);
    hideElement(findBtn);
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
    showElement(findBtn);
    hideElement(preMenu);
    hideElement(preLabel);
  }

  updateActiveSideLinks();
  updateRoundHeaderInfo();
  renderContentionJumpLinks();
  var sizes = document.querySelector("[data-field='font-size']");

  if (sizes) {
    var chosenSize = db.settings.fontSize;

    if (!chosenSize) {
      chosenSize = 14;
    }

    sizes.value = String(chosenSize);
  }

  showUndoButtons();
  updateSideMenu();
}

function render() {
  if (window.renderCurrentPage) {
    window.renderCurrentPage();
  }
}

setInterval(function () {
  if (!state.round || state.round.isPreflow || !state.round.timers || !state.round.timers.running) {
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
    saveRoundAfterAMoment(true);
  }

  updateTimerButton();
}, 200);

function keepProofSelection(event) {
  var trigger = event.target.closest("[data-action='make-bold'], [data-action='make-highlight']");

  if (trigger) {
    event.preventDefault();
  }
}

document.addEventListener("mousedown", keepProofSelection);
document.addEventListener("pointerdown", keepProofSelection);

function preparePrintLayout(includeEvidence) {
  var round = state.round;
  if (!round) return;

  var printTitle = round.title || "Debate Round";
  var titleEl = document.getElementById("print-title");
  if (titleEl) {
    titleEl.textContent = printTitle;
  }

  var topicLine = round.topic ? "Topic / Resolution: " + round.topic : "";
  setElementText(document.getElementById("print-topic"), topicLine);

  var tournamentLine = round.tournament ? "Tournament: " + round.tournament : "";
  var roundNumberLine = round.roundLabel ? "Round Number: " + round.roundLabel : "";
  var opponentLine = round.opponent ? "vs " + round.opponent : "";
  var firstSideLine = round.firstSide ? formatSideName(round.firstSide) + " speaks first" : "";

  var metaLine = joinFilledText([
    tournamentLine,
    roundNumberLine,
    opponentLine,
    "Your Side: " + formatSideName(round.yourSide),
    firstSideLine
  ], "   |   ");
  setElementText(document.getElementById("print-meta"), metaLine);

  var body = document.getElementById("print-body");
  if (!body) return;

  clearElement(body);

  var sides = ["pro", "con"];

  for (var sideIndex = 0; sideIndex < sides.length; sideIndex++) {
    var caseSide = sides[sideIndex];
    var section = cloneTemplate("print-case-sample");

    if (sideIndex === 1) {
      section.classList.add("new-page");
    }

    var caseTitle = caseSide === "pro" ? "AFF CASE" : "NEG CASE";
    section.querySelector(".print-case-name").textContent = caseTitle + " FLOW";

    var speeches = getSpeechesForSide(round, caseSide);
    var groupIds = round.cases[caseSide].contentionIds;

    for (var g = 0; g < groupIds.length; g++) {
      var contention = round.contentions[groupIds[g]];
      if (!contention) continue;

      var block = cloneTemplate("print-cont");
      if (!block) {
        block = document.createElement("div");
        block.className = "print-group";
        block.innerHTML = '<h3 class="print-group-name"></h3><table class="print-table"><thead><tr></tr></thead><tbody></tbody></table>';
      }

      var groupHeader = block.querySelector(".print-group-name");
      if (groupHeader) {
        if (contention.name && contention.name !== "Contention 1" && contention.name !== "Opening Case") {
          groupHeader.textContent = contention.name;
        } else {
          hideElement(groupHeader);
        }
      }

      var headRow = block.querySelector("thead tr");
      if (!headRow) {
        var thead = block.querySelector("thead") || block.querySelector("table").appendChild(document.createElement("thead"));
        headRow = thead.appendChild(document.createElement("tr"));
      }

      for (var s = 0; s < speeches.length; s++) {
        var th = document.createElement("th");
        th.className = "print-head " + (SPEECHES[speeches[s]].team || "");
        th.textContent = SPEECHES[speeches[s]].short;
        headRow.appendChild(th);
      }

      var tbody = block.querySelector("tbody");
      if (!tbody) {
        tbody = block.querySelector("table").appendChild(document.createElement("tbody"));
      }

      var startingPointIds = (contention.startingPointIds || []).slice();
      var allNotes = getListFromObject(round.notes);
      for (var an = 0; an < allNotes.length; an++) {
        var nt = allNotes[an];
        if (nt.contentionId === groupIds[g] && !nt.parentId && startingPointIds.indexOf(nt.id) === -1) {
          startingPointIds.push(nt.id);
        }
      }

      for (var p = 0; p < startingPointIds.length; p++) {
        var startId = startingPointIds[p];
        var family = getAllChildPoints(round, startId, []);
        var tr = document.createElement("tr");
        tr.className = "print-row";
        var rowHasContent = false;

        for (var sp = 0; sp < speeches.length; sp++) {
          var td = document.createElement("td");
          td.className = "print-cell";
          var noteList = getListFromObject(round.notes);

          for (var n = 0; n < noteList.length; n++) {
            var item = noteList[n];
            if (item.contentionId !== groupIds[g] || item.speechId !== speeches[sp]) continue;

            if (family.indexOf(item.id) === -1) continue;

            var hasText = Boolean(item.text && item.text.trim());
            var hasEvidence = Boolean(includeEvidence && item.evidenceId && round.evidence[item.evidenceId] && round.evidence[item.evidenceId].plain && round.evidence[item.evidenceId].plain.trim());

            if (!hasText && !hasEvidence) continue;

            rowHasContent = true;

            var card = cloneTemplate("print-card");
            if (!card) {
              card = document.createElement("div");
              card.className = "print-card";
              card.innerHTML = '<span class="print-tag hide"></span><div class="print-words"></div><div class="print-proof hide"></div>';
            }

            var marker = card.querySelector(".print-tag");
            if (marker) {
              if (item.marker) {
                marker.textContent = getMarkerLabel(item.marker);
                showElement(marker);
              } else {
                hideElement(marker);
              }
            }

            var pointWords = item.text || "";
            var wordsBox = card.querySelector(".print-words");
            if (wordsBox) {
              if (item.html) {
                wordsBox.innerHTML = cleanPastedHtml(item.html).html;
              } else {
                wordsBox.textContent = pointWords;
              }
            }

            var evBox = card.querySelector(".print-proof");
            if (evBox) {
              if (includeEvidence && item.evidenceId && round.evidence[item.evidenceId]) {
                var proofText = round.evidence[item.evidenceId].plain || "";
                evBox.textContent = "Proof: " + proofText;
                showElement(evBox);
              } else {
                hideElement(evBox);
              }
            }

            td.appendChild(card);
          }

          tr.appendChild(td);
        }

        if (rowHasContent) {
          tbody.appendChild(tr);
        }
      }

      if (tbody.children.length === 0) {
        var emptyTr = document.createElement("tr");
        emptyTr.className = "print-row";
        for (var esp = 0; esp < speeches.length; esp++) {
          var emptyTd = document.createElement("td");
          emptyTd.className = "print-cell";
          emptyTr.appendChild(emptyTd);
        }
        tbody.appendChild(emptyTr);
      }

      section.appendChild(block);
    }

    body.appendChild(section);
  }

  var extra = cloneTemplate("print-cx");
  if (!extra) {
    extra = document.createElement("div");
    extra.className = "print-notes new-page";
    extra.innerHTML = '<h2 class="print-case-name">CROSSFIRE &amp; REFLECTION NOTES</h2>';
  } else {
    extra.classList.add("new-page");
  }

  var extraNotes = [
    ["First Crossfire", round.crossNotes.firstCrossfire],
    ["Second Crossfire", round.crossNotes.secondCrossfire],
    ["Grand Crossfire", round.crossNotes.grandCrossfire],
    ["Reflections & Decision", round.crossNotes.reflections]
  ];

  for (var e = 0; e < extraNotes.length; e++) {
    if (extraNotes[e][1] && extraNotes[e][1].trim()) {
      var cxCard = cloneTemplate("print-cx-card");
      if (!cxCard) {
        cxCard = document.createElement("div");
        cxCard.className = "print-note";
        cxCard.innerHTML = '<h3 class="print-note-name"></h3><div class="print-note-words"></div>';
      }

      var nameEl = cxCard.querySelector(".print-note-name");
      if (nameEl) nameEl.textContent = extraNotes[e][0];

      var wordsEl = cxCard.querySelector(".print-note-words");
      if (wordsEl) wordsEl.textContent = extraNotes[e][1];

      extra.appendChild(cxCard);
    }
  }

  body.appendChild(extra);
}

function downloadPdfReport(includeEvidence) {
  var report = document.getElementById("full-print-report");
  if (!report) return;

  var downloadBtn = document.getElementById("btn-download-pdf");
  var originalBtnText = downloadBtn ? downloadBtn.textContent : "Download PDF";
  if (downloadBtn) {
    downloadBtn.textContent = "Generating PDF...";
    downloadBtn.disabled = true;
  }

  preparePrintLayout(includeEvidence);

  report.style.display = "block";
  report.style.width = "1000px";
  report.style.background = "#ffffff";
  report.style.padding = "24px";
  report.style.margin = "0 auto";
  report.style.boxSizing = "border-box";

  var round = state.round;
  var rawTitle = round && round.title ? round.title : "Debate";
  var safeTitle = rawTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "_");
  var filename = (safeTitle || "Debate_Flow") + ".pdf";

  var opt = {
    margin: [8, 8, 8, 8],
    filename: filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 1.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 1060
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "landscape"
    },
    pagebreak: { mode: ["css", "legacy"] }
  };

  function finishExport() {
    report.style.display = "none";
    report.style.width = "";
    report.style.padding = "";
    report.style.margin = "";
    report.style.background = "";
    if (downloadBtn) {
      downloadBtn.textContent = originalBtnText;
      downloadBtn.disabled = false;
    }
    closePopups();
  }

  setTimeout(function () {
    if (typeof html2pdf !== "undefined") {
      html2pdf().set(opt).from(report).save().then(function () {
        finishExport();
      }).catch(function (err) {
        console.error("PDF export error:", err);
        finishExport();
        window.print();
      });
    } else {
      finishExport();
      window.print();
    }
  }, 120);
}

document.addEventListener("click", function (event) {
  if (state.popover && !state.popover.contains(event.target) &&
      !event.target.closest("[data-action='timer-toggle'], [data-action='round-menu'], [data-action='note-menu'], [data-action='opening-menu']")) {
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
    openPage("index.html");

  } else if (action === "tour") {
    beginFeatureTour();

  } else if (action === "show-openings") {
    openPage("preflows.html");

  } else if (action === "show-notes") {
    if (document.body.dataset.page !== "notes") {
      openPage("notes.html");
    }

  } else if (action === "toggle-nav") {
    state.navOpen = !state.navOpen;

  } else if (action === "close-nav") {
    state.navOpen = false;

  } else if (action === "close-dialog") {
    closePopups();

  } else if (action === "timer-toggle") {
    openSimpleTimer(trigger);

  } else if (action === "timer-start") {
    startOrPauseTimer();

  } else if (action === "timer-reset") {
    resetSimpleTimer();

  } else if (action === "make-bold") {
    formatSelectedProof("bold");

  } else if (action === "make-highlight") {
    formatSelectedProof("hiliteColor", "#fff3a0");

  } else if (action === "print") {
    closeDropdownMenu();
    showElement(document.getElementById("print-box"));

  } else if (action === "do-print") {
    var checkEl = document.getElementById("print-evidence");
    downloadPdfReport(checkEl ? checkEl.checked : true);

  } else if (action === "print-browser") {
    var checkEl = document.getElementById("print-evidence");
    closePopups();
    preparePrintLayout(checkEl ? checkEl.checked : true);
    setTimeout(function () {
      window.print();
    }, 100);
  }

  if (action === "toggle-nav" || action === "close-nav" || trigger.closest(".sidebar")) {
    updateSideMenu();
  }
});

var installPromptEvent = null;

window.addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault();
  installPromptEvent = event;
  showInstallButton();
});

window.addEventListener("appinstalled", function () {
  installPromptEvent = null;
  hideInstallButton();
});

function appAlreadyInstalled() {
  if (window.navigator.standalone) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isIosBrowser() {
  var ua = window.navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
}

function showInstallButton() {
  var wrap = document.getElementById("install-wrap");
  if (wrap) showElement(wrap);
}

function hideInstallButton() {
  var wrap = document.getElementById("install-wrap");
  if (wrap) hideElement(wrap);
}

function setupInstallButton() {
  if (document.body.dataset.page !== "home" || appAlreadyInstalled()) return;

  var menu = document.querySelector(".top-menu");
  var preflows = menu && menu.querySelector('a[href="preflows.html"]');
  if (!menu || !preflows || document.getElementById("install-wrap")) return;

  var wrap = document.createElement("div");
  var note = document.createElement("p");
  var button = document.createElement("button");

  wrap.id = "install-wrap";
  wrap.className = "install-wrap hide";
  note.id = "install-note";
  note.className = "install-note hide";
  note.textContent = "On iPhone, tap Share, then Add to Home Screen.";
  button.type = "button";
  button.className = "btn main install-btn";
  button.textContent = "Install";

  button.addEventListener("click", function () {
    if (installPromptEvent) {
      var waiting = installPromptEvent;
      installPromptEvent = null;
      waiting.prompt();
      waiting.userChoice.then(function () {
        hideInstallButton();
      });
      return;
    }

    if (isIosBrowser()) {
      if (note.classList.contains("hide")) showElement(note);
      else hideElement(note);
    }
  });

  wrap.appendChild(note);
  wrap.appendChild(button);
  preflows.insertAdjacentElement("afterend", wrap);

  if (installPromptEvent || isIosBrowser()) showInstallButton();
}

function registerInstalledApp() {
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.register("sw.js");
}


function setupDraggableTimer() {
  var pop = document.getElementById("timer-popover");
  var handle = document.getElementById("timer-drag-handle");
  if (!pop || !handle) return;

  var dragging = false;
  var startX = 0, startY = 0, startLeft = 0, startTop = 0;

  handle.addEventListener("mousedown", function (e) {
    if (e.target.closest("button, input")) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    var rect = pop.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    pop.style.bottom = "auto";
    pop.style.right = "auto";
    pop.style.left = startLeft + "px";
    pop.style.top = startTop + "px";
    e.preventDefault();
  });

  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    var newLeft = Math.max(10, Math.min(window.innerWidth - pop.offsetWidth - 10, startLeft + dx));
    var newTop = Math.max(10, Math.min(window.innerHeight - pop.offsetHeight - 10, startTop + dy));
    pop.style.left = newLeft + "px";
    pop.style.top = newTop + "px";
  });

  window.addEventListener("mouseup", function () {
    dragging = false;
  });
}

function startApp() {
  setupDraggableTimer();
  registerInstalledApp();
  setupInstallButton();

  state.view = document.body.dataset.page;
  if (!state.view) {
    state.view = "home";
  }

  var okBtn = document.getElementById("confirm-ok");

  if (okBtn) {
    okBtn.addEventListener("click", function () {
      var run = confirmRun;

      confirmRun = null;
      hideElement(document.getElementById("confirm-box"));
      if (run) {
        run();
      }
    });
  }

  var icon = document.querySelector(".edit-mark");

  if (icon) {
    icon.addEventListener("click", function () {
      var title = document.querySelector(".title-input");

      if (title) {
        title.focus();
      }
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
