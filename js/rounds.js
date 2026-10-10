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

function uid(prefix) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 100000).toString(36);
}

// NSDA PF card, stored in seconds: 4 constructive, 4 rebuttal, 3 summary, 2 final focus,
// 3 / 3 crossfire, 3 grand cross, 3 prep per team for the whole round.
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

// The settings boxes are seconds. A 4 in constructive is the usual "I meant the 4-minute speech" typo.
function pfClock(kind, raw) {
  var n = Number(raw);
  var label = kind;
  if (kind === "final") label = "final focus";
  else if (kind === "grand") label = "grand cross";
  else if (kind === "prep") label = "prep";
  if (!isFinite(n) || n <= 0) return { ok: false, seconds: 0, message: label + " has to be a positive time." };
  if (n > 20 * 60) return { ok: false, seconds: 0, message: label + " over 20 minutes isn't a PF clock." };
  if (n <= 15) {
    return {
      ok: true,
      seconds: Math.round(n * 60),
      message: label + ": " + n + " min saved as " + Math.round(n * 60) + " seconds."
    };
  }
  return { ok: true, seconds: Math.round(n), message: "" };
}

function mendClocks(durations) {
  var base = timerTimes();
  var keys = Object.keys(base);
  var i;
  var n;
  if (!durations || typeof durations !== "object") return base;
  for (i = 0; i < keys.length; i++) {
    n = Number(durations[keys[i]]);
    if (!isFinite(n) || n <= 0 || n > 20 * 60) durations[keys[i]] = base[keys[i]];
    else durations[keys[i]] = Math.round(n);
  }
  return durations;
}

function startSettings() {
  return {
    fontSize: 14,
    sound: false,
    durations: timerTimes()
  };
}

function sortByOrder(list) {
  var i;
  var j;
  var temp;
  for (i = 0; i < list.length; i++) {
    for (j = i + 1; j < list.length; j++) {
      if (list[j].order < list[i].order || (list[j].order === list[i].order && list[j].id < list[i].id)) {
        temp = list[i];
        list[i] = list[j];
        list[j] = temp;
      }
    }
  }
  return list;
}

// NSDA dropped the old rebuttal flip: 1st constructive also speaks 1st rebuttal, summary, and FF.
// Bid tournaments that still swap rebuttal are not this file. Pro's sheet starts at Pro constr
// even if Con won the flip — Con constr lives on the Con case, not over here.
function speechOrder(firstSide) {
  var pairs = [
    ["pro-constructive", "con-constructive"],
    ["pro-rebuttal", "con-rebuttal"],
    ["pro-summary", "con-summary"],
    ["pro-final", "con-final"]
  ];
  var list = [];
  var i;
  for (i = 0; i < pairs.length; i++) {
    if (firstSide === "con") list.push(pairs[i][1], pairs[i][0]);
    else list.push(pairs[i][0], pairs[i][1]);
  }
  return list;
}

function speechesOnSide(round, caseSide) {
  var all;
  var start;
  if (round.isPreflow) return [caseSide + "-constructive"];
  all = speechOrder(round.firstSide);
  start = all.indexOf(caseSide + "-constructive");
  if (start < 0) return all.slice();
  return all.slice(start);
}

function speechName(id, full) {
  var info = SPEECHES[id];
  if (!info) return id;
  return full ? info.full : info.short;
}

function teamWord(side) {
  return side === "pro" ? "Pro" : "Con";
}

function timerSteps(firstSide, durations) {
  var first = firstSide === "con" ? "con" : "pro";
  var second = first === "pro" ? "con" : "pro";
  var times = durations || timerTimes();
  return [
    { id: "first-constructive", label: teamWord(first) + " Constructive", seconds: times.constructive },
    { id: "second-constructive", label: teamWord(second) + " Constructive", seconds: times.constructive },
    { id: "first-crossfire", label: "First crossfire", seconds: times.crossfire },
    { id: "first-rebuttal", label: teamWord(first) + " Rebuttal", seconds: times.rebuttal },
    { id: "second-rebuttal", label: teamWord(second) + " Rebuttal", seconds: times.rebuttal },
    { id: "second-crossfire", label: "Second crossfire", seconds: times.crossfire },
    { id: "first-summary", label: teamWord(first) + " Summary", seconds: times.summary },
    { id: "second-summary", label: teamWord(second) + " Summary", seconds: times.summary },
    { id: "grand-crossfire", label: "Grand crossfire", seconds: times.grand },
    { id: "first-final", label: teamWord(first) + " Final Focus", seconds: times.final },
    { id: "second-final", label: teamWord(second) + " Final Focus", seconds: times.final }
  ];
}

// First CX is the two first speakers, second CX the two second speakers, grand is all four.
// Reflections sit after the round and are not a timed speech.
function crossNotesFrom(notes) {
  notes = notes || {};
  return {
    firstCrossfire: notes.firstCrossfire || "",
    secondCrossfire: notes.secondCrossfire || "",
    grandCrossfire: notes.grandCrossfire || "",
    reflections: notes.reflections || ""
  };
}

function newTimer(firstSide, durations) {
  var plan = timerSteps(firstSide, durations);
  var allotted = {};
  var times = durations || timerTimes();
  var i;
  for (i = 0; i < plan.length; i++) allotted[plan[i].id] = plan[i].seconds;
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

function newGroup(name) {
  return {
    id: uid("cont"),
    name: name,
    collapsed: false,
    startingPointIds: []
  };
}

function newCase() {
  var contention = newGroup("Contention 1");
  return {
    contentionIds: [contention.id],
    contention: contention
  };
}

function newRound(fields, settings) {
  var pro = newCase();
  var con = newCase();
  var times = (settings && settings.durations) || timerTimes();
  var groups = {};
  groups[pro.contention.id] = pro.contention;
  groups[con.contention.id] = con.contention;
  return {
    id: uid("round"),
    title: fields.title || "Untitled round",
    topic: fields.topic || "",
    tournament: fields.tournament || "",
    roundLabel: fields.roundLabel || "",
    opponent: fields.opponent || "",
    yourSide: fields.yourSide || "pro",
    firstSide: fields.firstSide === "con" ? "con" : "pro",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cases: {
      pro: { contentionIds: pro.contentionIds },
      con: { contentionIds: con.contentionIds }
    },
    contentions: groups,
    notes: {},
    evidence: {},
    crossNotes: crossNotesFrom(),
    timers: newTimer(fields.firstSide === "con" ? "con" : "pro", times),
    columnFocus: {
      pro: { count: null, start: 0 },
      con: { count: null, start: 0 }
    },
    scroll: { pro: 0, con: 0 }
  };
}

function newOpening(fields) {
  var side = fields.side === "con" ? "con" : "pro";
  var contention = newGroup("Contention 1");
  var groups = {};
  groups[contention.id] = contention;
  return {
    id: uid("preflow"),
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

function openingAsRound(preflow) {
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
    crossNotes: crossNotesFrom(),
    timers: newTimer(preflow.side, timerTimes()),
    columnFocus: {
      pro: { count: null, start: 0 },
      con: { count: null, start: 0 }
    },
    scroll: { pro: 0, con: 0 }
  };
}

function whoseCont(round, contentionId) {
  if (round.cases.pro.contentionIds.indexOf(contentionId) !== -1) return "pro";
  if (round.cases.con.contentionIds.indexOf(contentionId) !== -1) return "con";
  return null;
}

function cardsOn(round, contentionId) {
  var names = Object.keys(round.notes);
  var list = [];
  var i;
  for (i = 0; i < names.length; i++) {
    if (round.notes[names[i]].contentionId === contentionId) list.push(round.notes[names[i]]);
  }
  return list;
}

function replyNotes(round, parentId, speechId) {
  var notes = cardsOn(round, round.notes[parentId].contentionId);
  var list = [];
  var i;
  for (i = 0; i < notes.length; i++) {
    if (notes[i].parentId === parentId && notes[i].speechId === speechId) list.push(notes[i]);
  }
  return sortByOrder(list);
}

function speechesAfter(round, caseSide, speechId) {
  var list = speechesOnSide(round, caseSide);
  var index = list.indexOf(speechId);
  if (index < 0) return [];
  return list.slice(index + 1);
}

function nextNumber(list) {
  var max = 0;
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].order >= max) max = list[i].order + 1;
  }
  return max;
}

function newPoint(contentionId, speechId, parentId, order, text) {
  return {
    id: uid("note"),
    contentionId: contentionId,
    speechId: speechId,
    parentId: parentId || null,
    order: order,
    text: text || "",
    marker: "",
    evidenceId: null
  };
}

function addShell(round, contentionId, speechId, text, afterId) {
  var contention = round.contentions[contentionId];
  var note = newPoint(contentionId, speechId, null, contention.startingPointIds.length, text);
  var index = contention.startingPointIds.length;
  if (afterId) {
    index = contention.startingPointIds.indexOf(afterId) + 1;
    if (index <= 0) index = contention.startingPointIds.length;
  }
  contention.startingPointIds.splice(index, 0, note.id);
  round.notes[note.id] = note;
  return note;
}

function addAns(round, parentId, speechId, text, afterId) {
  var parent = round.notes[parentId];
  var siblings = replyNotes(round, parentId, speechId);
  var note = newPoint(parent.contentionId, speechId, parentId, nextNumber(siblings), text);
  if (afterId && round.notes[afterId]) note.order = round.notes[afterId].order + 0.5;
  round.notes[note.id] = note;
  return note;
}

function underLine(round, noteId, list) {
  var names = Object.keys(round.notes);
  var i;
  list.push(noteId);
  for (i = 0; i < names.length; i++) {
    if (round.notes[names[i]].parentId === noteId) underLine(round, names[i], list);
  }
  return list;
}

// Empty string means the link is legal. Anything else is the reason to show on the menu
// and not move the card. Order matters: a self-link and a cross-contention link fail
// for different reasons than "that's a later speech".
function whyNotLink(round, noteId, parentId) {
  var note = round.notes[noteId];
  var parent = round.notes[parentId];
  var under;
  var side;
  var cols;
  var parentCol;
  var cardCol;
  if (!note || !parent) return "That card isn't on this flow anymore.";
  if (noteId === parentId) return "A card can't answer itself.";
  if (note.contentionId !== parent.contentionId) return "Stay on this contention. Another contention is a different sheet.";
  under = underLine(round, noteId, []);
  if (under.indexOf(parentId) !== -1) return "That loops the line — the extension would be answering itself.";
  side = whoseCont(round, note.contentionId);
  cols = speechesOnSide(round, side);
  parentCol = cols.indexOf(parent.speechId);
  cardCol = cols.indexOf(note.speechId);
  if (parentCol < 0 || cardCol < 0 || parentCol >= cardCol) {
    return "Answers go in a later column. A constructive shell can't hang under rebuttal.";
  }
  return "";
}

function canConnect(round, noteId, parentId) {
  return whyNotLink(round, noteId, parentId) === "";
}

// The labels are yours. These only catch the ones that don't mean what they say on a PF flow.
function markerWarn(round, note, markerId) {
  var info;
  var side;
  if (!note || !markerId) return "";
  info = SPEECHES[note.speechId];
  side = whoseCont(round, note.contentionId);
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

function dropId(list, id) {
  var kept = [];
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i] !== id) kept.push(list[i]);
  }
  return kept;
}

function connectPoint(round, noteId, parentId) {
  var note = round.notes[noteId];
  var contention;
  var siblings;
  if (!note) return false;
  if (note.parentId === null) {
    contention = round.contentions[note.contentionId];
    contention.startingPointIds = dropId(contention.startingPointIds, noteId);
  }
  if (!parentId) {
    note.parentId = null;
    contention = round.contentions[note.contentionId];
    if (contention.startingPointIds.indexOf(noteId) === -1) contention.startingPointIds.push(noteId);
    return true;
  }
  if (!canConnect(round, noteId, parentId)) return false;
  note.parentId = parentId;
  siblings = [];
  var family = replyNotes(round, parentId, note.speechId);
  var i;
  for (i = 0; i < family.length; i++) {
    if (family[i].id !== noteId) siblings.push(family[i]);
  }
  note.order = nextNumber(siblings);
  return true;
}

function cutCard(round, noteId) {
  var note = round.notes[noteId];
  var names;
  var children;
  var contention;
  var index;
  var i;
  var child;
  if (!note) return;
  names = Object.keys(round.notes);
  children = [];
  for (i = 0; i < names.length; i++) {
    child = round.notes[names[i]];
    if (child.parentId === noteId) children.push(child);
  }
  for (i = 0; i < children.length; i++) {
    for (var j = i + 1; j < children.length; j++) {
      if (children[j].order < children[i].order) {
        child = children[i];
        children[i] = children[j];
        children[j] = child;
      }
    }
  }
  if (note.evidenceId && round.evidence[note.evidenceId]) delete round.evidence[note.evidenceId];
  // Strike this card, keep the extension. The next speech's answer stays on the
  // same line instead of vanishing with the response you deleted.
  if (note.parentId) {
    for (i = 0; i < children.length; i++) {
      children[i].parentId = note.parentId;
      children[i].order = note.order + (i + 1) / (children.length + 2);
    }
  } else {
    contention = round.contentions[note.contentionId];
    index = contention.startingPointIds.indexOf(noteId);
    contention.startingPointIds = dropId(contention.startingPointIds, noteId);
    for (i = 0; i < children.length; i++) {
      children[i].parentId = null;
      if (contention.startingPointIds.indexOf(children[i].id) === -1) {
        contention.startingPointIds.splice(index + i, 0, children[i].id);
      }
    }
  }
  delete round.notes[noteId];
}

function dupeCard(round, noteId) {
  var note = round.notes[noteId];
  var copy;
  var evidence;
  if (!note) return null;
  if (note.parentId) copy = addAns(round, note.parentId, note.speechId, note.text, noteId);
  else copy = addShell(round, note.contentionId, note.speechId, note.text, noteId);
  copy.marker = note.marker;
  if (note.evidenceId && round.evidence[note.evidenceId]) {
    evidence = round.evidence[note.evidenceId];
    copy.evidenceId = uid("ev");
    round.evidence[copy.evidenceId] = {
      id: copy.evidenceId,
      noteId: copy.id,
      html: evidence.html,
      plain: evidence.plain
    };
  }
  return copy;
}

function nudgeCard(round, noteId, direction) {
  var note = round.notes[noteId];
  var list;
  var index;
  var swap;
  var ids;
  var i;
  var temp;
  var order;
  if (!note) return;
  if (note.parentId) list = replyNotes(round, note.parentId, note.speechId);
  else {
    ids = round.contentions[note.contentionId].startingPointIds;
    list = [];
    for (i = 0; i < ids.length; i++) {
      if (round.notes[ids[i]]) list.push(round.notes[ids[i]]);
    }
  }
  index = -1;
  for (i = 0; i < list.length; i++) {
    if (list[i].id === noteId) index = i;
  }
  swap = index + direction;
  if (index < 0 || swap < 0 || swap >= list.length) return;
  if (!note.parentId) {
    ids = round.contentions[note.contentionId].startingPointIds;
    temp = ids[index];
    ids[index] = ids[swap];
    ids[swap] = temp;
    return;
  }
  order = list[index].order;
  list[index].order = list[swap].order;
  list[swap].order = order;
}

function roundHasWords(round) {
  var names = Object.keys(round.notes);
  var i;
  for (i = 0; i < names.length; i++) {
    if (round.notes[names[i]].text || round.notes[names[i]].evidenceId) return true;
  }
  return Object.keys(round.evidence).length > 0;
}

function addCont(round, caseSide) {
  var ids = round.cases[caseSide].contentionIds;
  var n = 1;
  var i;
  var name;
  var num;
  var contention;
  for (i = 0; i < ids.length; i++) {
    name = round.contentions[ids[i]] ? round.contentions[ids[i]].name : "";
    num = /^Contention (\d+)$/.exec(name || "");
    if (num && Number(num[1]) >= n) n = Number(num[1]) + 1;
  }
  contention = newGroup("Contention " + n);
  round.contentions[contention.id] = contention;
  round.cases[caseSide].contentionIds.push(contention.id);
  return contention;
}

function cutCont(round, contentionId) {
  var caseSide = whoseCont(round, contentionId);
  var notes;
  var ids;
  var kept;
  var i;
  if (!caseSide) return false;
  notes = cardsOn(round, contentionId);
  for (i = 0; i < notes.length; i++) {
    if (notes[i].evidenceId) delete round.evidence[notes[i].evidenceId];
    delete round.notes[notes[i].id];
  }
  delete round.contentions[contentionId];
  ids = round.cases[caseSide].contentionIds;
  kept = [];
  for (i = 0; i < ids.length; i++) {
    if (ids[i] !== contentionId) kept.push(ids[i]);
  }
  round.cases[caseSide].contentionIds = kept;
  return true;
}

function bumpCont(round, contentionId, direction) {
  var caseSide = whoseCont(round, contentionId);
  var ids;
  var index;
  var temp;
  if (!caseSide) return;
  ids = round.cases[caseSide].contentionIds;
  index = ids.indexOf(contentionId);
  if (index < 0 || index + direction < 0 || index + direction >= ids.length) return;
  temp = ids[index];
  ids[index] = ids[index + direction];
  ids[index + direction] = temp;
}

function groupHasWords(round, contentionId) {
  var notes = cardsOn(round, contentionId);
  var i;
  for (i = 0; i < notes.length; i++) {
    if (notes[i].text || notes[i].evidenceId) return true;
  }
  return false;
}

function shownSpeeches(round, caseSide) {
  var all = speechesOnSide(round, caseSide);
  var focus = round.columnFocus[caseSide] || { count: null, start: 0 };
  var count = focus.count;
  var start = focus.start || 0;
  if (!count || count >= all.length) {
    return { all: all, visible: all.slice(), start: 0, count: all.length };
  }
  if (start < 0) start = 0;
  if (start + count > all.length) start = Math.max(0, all.length - count);
  return {
    all: all,
    visible: all.slice(start, start + count),
    start: start,
    count: count
  };
}

function freshId(map, oldId) {
  if (!oldId) return null;
  if (!map[oldId]) map[oldId] = uid("id");
  return map[oldId];
}

function copyParts(source) {
  var map = {};
  var groups = {};
  var notes = {};
  var evidence = {};
  var names;
  var i;
  var oldId;
  var next;
  var group;
  var note;
  var item;
  var oldStarts;
  var newStarts;
  var n;
  names = Object.keys(source.contentions);
  for (i = 0; i < names.length; i++) {
    oldId = names[i];
    next = freshId(map, oldId);
    group = source.contentions[oldId];
    oldStarts = group.startingPointIds;
    newStarts = [];
    for (n = 0; n < oldStarts.length; n++) newStarts.push(freshId(map, oldStarts[n]));
    groups[next] = {
      id: next,
      name: group.name,
      collapsed: false,
      startingPointIds: newStarts
    };
  }
  names = Object.keys(source.notes);
  for (i = 0; i < names.length; i++) {
    oldId = names[i];
    note = source.notes[oldId];
    next = freshId(map, oldId);
    notes[next] = {
      id: next,
      contentionId: freshId(map, note.contentionId),
      speechId: note.speechId,
      parentId: note.parentId ? freshId(map, note.parentId) : null,
      order: note.order,
      text: note.text,
      marker: note.marker || "",
      evidenceId: note.evidenceId ? freshId(map, note.evidenceId) : null
    };
  }
  names = Object.keys(source.evidence || {});
  for (i = 0; i < names.length; i++) {
    oldId = names[i];
    item = source.evidence[oldId];
    next = freshId(map, oldId);
    evidence[next] = {
      id: next,
      noteId: freshId(map, item.noteId),
      html: item.html,
      plain: item.plain
    };
  }
  return { map: map, contentions: groups, notes: notes, evidence: evidence };
}

function copyIdList(ids, map) {
  var list = [];
  var i;
  for (i = 0; i < ids.length; i++) list.push(map[ids[i]]);
  return list;
}

function copyRound(round, settings) {
  var cloned = copyParts(round);
  var copy = newRound({
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
  copy.crossNotes = crossNotesFrom(round.crossNotes);
  copy.columnFocus = {
    pro: { count: round.columnFocus.pro.count, start: round.columnFocus.pro.start },
    con: { count: round.columnFocus.con.count, start: round.columnFocus.con.start }
  };
  return copy;
}

// A preflow is the case you actually read. Practice answers in later columns
// stay in the preflow; the round only takes constructive shells and their cards.
function useOpening(round, preflow) {
  var cloned = copyParts({
    contentions: preflow.contentions,
    notes: preflow.notes,
    evidence: preflow.evidence
  });
  var side = preflow.side;
  var kept = [];
  var names;
  var i;
  var note;
  var oldIds;
  var newIds;
  var n;
  names = Object.keys(cloned.notes);
  for (i = 0; i < names.length; i++) {
    note = cloned.notes[names[i]];
    if (note.speechId !== side + "-constructive" || note.parentId) {
      if (note.evidenceId) delete cloned.evidence[note.evidenceId];
      delete cloned.notes[names[i]];
      continue;
    }
    kept.push(names[i]);
  }
  names = Object.keys(cloned.contentions);
  for (i = 0; i < names.length; i++) {
    oldIds = cloned.contentions[names[i]].startingPointIds;
    newIds = [];
    for (n = 0; n < oldIds.length; n++) {
      if (kept.indexOf(oldIds[n]) !== -1) newIds.push(oldIds[n]);
    }
    cloned.contentions[names[i]].startingPointIds = newIds;
  }
  oldIds = round.cases[side].contentionIds.slice();
  for (i = 0; i < oldIds.length; i++) cutCont(round, oldIds[i]);
  round.cases[side].contentionIds = copyIdList(preflow.contentionIds, cloned.map);
  names = Object.keys(cloned.contentions);
  for (i = 0; i < names.length; i++) round.contentions[names[i]] = cloned.contentions[names[i]];
  names = Object.keys(cloned.notes);
  for (i = 0; i < names.length; i++) round.notes[names[i]] = cloned.notes[names[i]];
  names = Object.keys(cloned.evidence);
  for (i = 0; i < names.length; i++) round.evidence[names[i]] = cloned.evidence[names[i]];
}

// Only the constructive column becomes a reusable case. Rebuttal ink from the
// round is not the shell you want on the next ballot.
function caseToOpening(round, caseSide, title) {
  var preflow = newOpening({ title: title, topic: round.topic, side: caseSide });
  var speech = caseSide + "-constructive";
  var groupIds;
  var i;
  var source;
  var contention;
  var starts;
  var n;
  var note;
  var copy;
  var blank;
  delete preflow.contentions[preflow.contentionIds[0]];
  preflow.contentionIds = [];
  groupIds = round.cases[caseSide].contentionIds;
  for (i = 0; i < groupIds.length; i++) {
    source = round.contentions[groupIds[i]];
    contention = newGroup(source.name);
    preflow.contentions[contention.id] = contention;
    preflow.contentionIds.push(contention.id);
    starts = source.startingPointIds;
    for (n = 0; n < starts.length; n++) {
      note = round.notes[starts[n]];
      if (!note || note.speechId !== speech) continue;
      copy = newPoint(contention.id, speech, null, contention.startingPointIds.length, note.text);
      copy.marker = note.marker;
      contention.startingPointIds.push(copy.id);
      preflow.notes[copy.id] = copy;
      if (note.evidenceId && round.evidence[note.evidenceId]) {
        copy.evidenceId = uid("ev");
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
    blank = newGroup("Contention 1");
    preflow.contentions[blank.id] = blank;
    preflow.contentionIds.push(blank.id);
  }
  return preflow;
}

function parkOnShell(round, note) {
  var cont = round.contentions[note.contentionId];
  note.parentId = null;
  if (cont && cont.startingPointIds.indexOf(note.id) === -1) cont.startingPointIds.push(note.id);
}

// Old saves and a half-written localStorage blob can come back missing a case,
// with a reply pointing at a deleted card, or with a parent loop. A case with
// no contention has nowhere to flow the constructive, so a blank one is put back.
function mendRound(round) {
  var sides;
  var s;
  var ids;
  var kept;
  var seen;
  var i;
  var id;
  var cont;
  var starts;
  var n;
  var note;
  var names;
  var parent;
  var order;
  var side;
  var ev;
  if (!round || typeof round !== "object") return;
  if (round.yourSide !== "con" && round.yourSide !== "observer") round.yourSide = "pro";
  if (round.firstSide !== "con") round.firstSide = "pro";
  if (!round.cases) round.cases = {};
  if (!round.cases.pro) round.cases.pro = { contentionIds: [] };
  if (!round.cases.con) round.cases.con = { contentionIds: [] };
  if (!round.cases.pro.contentionIds) round.cases.pro.contentionIds = [];
  if (!round.cases.con.contentionIds) round.cases.con.contentionIds = [];
  if (!round.contentions) round.contentions = {};
  if (!round.notes) round.notes = {};
  if (!round.evidence) round.evidence = {};
  round.crossNotes = crossNotesFrom(round.crossNotes);
  if (!round.columnFocus) round.columnFocus = {};
  if (!round.columnFocus.pro) round.columnFocus.pro = { count: null, start: 0 };
  if (!round.columnFocus.con) round.columnFocus.con = { count: null, start: 0 };
  if (!round.scroll) round.scroll = { pro: 0, con: 0 };
  if (typeof round.scroll.pro !== "number") round.scroll.pro = 0;
  if (typeof round.scroll.con !== "number") round.scroll.con = 0;
  if (!round.timers || !round.timers.prepLeft) round.timers = newTimer(round.firstSide, timerTimes());
  else {
    if (round.timers.prepLeft.pro == null || round.timers.prepLeft.pro < 0) round.timers.prepLeft.pro = 0;
    if (round.timers.prepLeft.con == null || round.timers.prepLeft.con < 0) round.timers.prepLeft.con = 0;
    if (!round.timers.allotted) round.timers.allotted = {};
  }

  sides = ["pro", "con"];
  for (s = 0; s < sides.length; s++) {
    ids = round.cases[sides[s]].contentionIds;
    kept = [];
    seen = {};
    for (i = 0; i < ids.length; i++) {
      id = ids[i];
      if (seen[id]) continue;
      cont = round.contentions[id];
      if (!cont) continue;
      seen[id] = true;
      if (!cont.name) cont.name = "Contention " + (kept.length + 1);
      if (!cont.startingPointIds) cont.startingPointIds = [];
      starts = [];
      for (n = 0; n < cont.startingPointIds.length; n++) {
        note = round.notes[cont.startingPointIds[n]];
        if (!note || note.contentionId !== id || note.parentId) continue;
        starts.push(note.id);
      }
      cont.startingPointIds = starts;
      kept.push(id);
    }
    if (!kept.length) {
      cont = newGroup("Contention 1");
      round.contentions[cont.id] = cont;
      kept.push(cont.id);
    }
    round.cases[sides[s]].contentionIds = kept;
  }

  names = Object.keys(round.notes);
  for (i = 0; i < names.length; i++) {
    note = round.notes[names[i]];
    if (!note || !round.contentions[note.contentionId]) {
      if (note && note.evidenceId && round.evidence[note.evidenceId]) delete round.evidence[note.evidenceId];
      delete round.notes[names[i]];
      continue;
    }
    if (!SPEECHES[note.speechId]) {
      side = whoseCont(round, note.contentionId) || "pro";
      note.speechId = side + "-constructive";
    }
    if (!note.marker) note.marker = "";
  }

  names = Object.keys(round.notes);
  for (i = 0; i < names.length; i++) {
    note = round.notes[names[i]];
    if (!note) continue;
    seen = {};
    id = note.id;
    n = 0;
    while (id && n < 40) {
      if (seen[id]) {
        parkOnShell(round, note);
        break;
      }
      seen[id] = true;
      parent = round.notes[id];
      id = parent && parent.parentId;
      n++;
    }
    if (note.parentId && !round.notes[note.parentId]) {
      parkOnShell(round, note);
      continue;
    }
    if (!note.parentId) continue;
    parent = round.notes[note.parentId];
    if (parent.contentionId !== note.contentionId) {
      parkOnShell(round, note);
      continue;
    }
    side = whoseCont(round, note.contentionId);
    order = speechesOnSide(round, side);
    // An answer that sits in an earlier speech than its parent was linked backwards.
    if (order.indexOf(parent.speechId) < 0 || order.indexOf(note.speechId) < 0 || order.indexOf(parent.speechId) >= order.indexOf(note.speechId)) {
      parkOnShell(round, note);
    }
  }

  names = Object.keys(round.notes);
  for (i = 0; i < names.length; i++) {
    note = round.notes[names[i]];
    if (!note || note.parentId) continue;
    cont = round.contentions[note.contentionId];
    if (cont && cont.startingPointIds.indexOf(note.id) === -1) cont.startingPointIds.push(note.id);
  }

  names = Object.keys(round.evidence);
  for (i = 0; i < names.length; i++) {
    ev = round.evidence[names[i]];
    if (!ev || !ev.noteId || !round.notes[ev.noteId]) {
      delete round.evidence[names[i]];
      continue;
    }
    round.notes[ev.noteId].evidenceId = names[i];
  }
}

function mendPreflow(pre) {
  var kept = [];
  var seen = {};
  var i;
  var id;
  var cont;
  var starts;
  var n;
  var note;
  var names;
  if (!pre || typeof pre !== "object") return;
  if (pre.side !== "con") pre.side = "pro";
  if (!pre.contentions) pre.contentions = {};
  if (!pre.notes) pre.notes = {};
  if (!pre.evidence) pre.evidence = {};
  if (!pre.contentionIds) pre.contentionIds = [];
  for (i = 0; i < pre.contentionIds.length; i++) {
    id = pre.contentionIds[i];
    if (seen[id] || !pre.contentions[id]) continue;
    seen[id] = true;
    cont = pre.contentions[id];
    if (!cont.name) cont.name = "Contention " + (kept.length + 1);
    if (!cont.startingPointIds) cont.startingPointIds = [];
    starts = [];
    for (n = 0; n < cont.startingPointIds.length; n++) {
      note = pre.notes[cont.startingPointIds[n]];
      if (note && note.contentionId === id && !note.parentId) starts.push(note.id);
    }
    cont.startingPointIds = starts;
    kept.push(id);
  }
  if (!kept.length) {
    cont = newGroup("Contention 1");
    pre.contentions[cont.id] = cont;
    kept.push(cont.id);
  }
  pre.contentionIds = kept;
  names = Object.keys(pre.notes);
  for (i = 0; i < names.length; i++) {
    note = pre.notes[names[i]];
    if (!note || !pre.contentions[note.contentionId]) {
      if (note && note.evidenceId) delete pre.evidence[note.evidenceId];
      delete pre.notes[names[i]];
    }
  }
  names = Object.keys(pre.evidence);
  for (i = 0; i < names.length; i++) {
    if (!pre.evidence[names[i]] || !pre.notes[pre.evidence[names[i]].noteId]) delete pre.evidence[names[i]];
  }
}

// Prep and speech clocks are a deadline. If the laptop slept between flights,
// don't keep burning time that already passed — freeze whatever was left.
function stopTimerOnOpen(round) {
  var left;
  if (!round.timers || !round.timers.running || !round.timers.deadline) return;
  left = round.timers.deadline - Date.now();
  if (left < 0) left = 0;
  if (round.timers.mode === "prep" && round.timers.prepSide) round.timers.prepLeft[round.timers.prepSide] = left;
  else round.timers.remainingMs = left;
  round.timers.running = false;
  round.timers.mode = null;
  round.timers.deadline = null;
  round.timers.timeUp = left === 0;
}
