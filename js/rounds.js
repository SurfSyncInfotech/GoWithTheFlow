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

function newId(prefix) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 100000).toString(36);
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
    id: newId("cont"),
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
    id: newId("round"),
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
    crossNotes: {
      firstCrossfire: "",
      secondCrossfire: "",
      grandCrossfire: "",
      reflections: ""
    },
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
    id: newId("preflow"),
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
    crossNotes: {
      firstCrossfire: "",
      secondCrossfire: "",
      grandCrossfire: "",
      reflections: ""
    },
    timers: newTimer(preflow.side, timerTimes()),
    columnFocus: {
      pro: { count: null, start: 0 },
      con: { count: null, start: 0 }
    },
    scroll: { pro: 0, con: 0 }
  };
}

function sideOfGroup(round, contentionId) {
  if (round.cases.pro.contentionIds.indexOf(contentionId) !== -1) return "pro";
  if (round.cases.con.contentionIds.indexOf(contentionId) !== -1) return "con";
  return null;
}

function notesInGroup(round, contentionId) {
  var names = Object.keys(round.notes);
  var list = [];
  var i;
  for (i = 0; i < names.length; i++) {
    if (round.notes[names[i]].contentionId === contentionId) list.push(round.notes[names[i]]);
  }
  return list;
}

function replyNotes(round, parentId, speechId) {
  var notes = notesInGroup(round, round.notes[parentId].contentionId);
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
    id: newId("note"),
    contentionId: contentionId,
    speechId: speechId,
    parentId: parentId || null,
    order: order,
    text: text || "",
    marker: "",
    evidenceId: null
  };
}

function addFirstPoint(round, contentionId, speechId, text, afterId) {
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

function addReply(round, parentId, speechId, text, afterId) {
  var parent = round.notes[parentId];
  var siblings = replyNotes(round, parentId, speechId);
  var note = newPoint(parent.contentionId, speechId, parentId, nextNumber(siblings), text);
  if (afterId && round.notes[afterId]) note.order = round.notes[afterId].order + 0.5;
  round.notes[note.id] = note;
  return note;
}

function pointAndReplies(round, noteId, list) {
  var names = Object.keys(round.notes);
  var i;
  list.push(noteId);
  for (i = 0; i < names.length; i++) {
    if (round.notes[names[i]].parentId === noteId) pointAndReplies(round, names[i], list);
  }
  return list;
}

function canConnect(round, noteId, parentId) {
  var note = round.notes[noteId];
  var parent = round.notes[parentId];
  var replies;
  var caseSide;
  var speeches;
  if (!note || !parent || noteId === parentId) return false;
  if (note.contentionId !== parent.contentionId) return false;
  replies = pointAndReplies(round, noteId, []);
  if (replies.indexOf(parentId) !== -1) return false;
  caseSide = sideOfGroup(round, note.contentionId);
  speeches = speechesOnSide(round, caseSide);
  return speeches.indexOf(parent.speechId) >= 0 && speeches.indexOf(parent.speechId) < speeches.indexOf(note.speechId);
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

function deletePoint(round, noteId) {
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

function copyPoint(round, noteId) {
  var note = round.notes[noteId];
  var copy;
  var evidence;
  if (!note) return null;
  if (note.parentId) copy = addReply(round, note.parentId, note.speechId, note.text, noteId);
  else copy = addFirstPoint(round, note.contentionId, note.speechId, note.text, noteId);
  copy.marker = note.marker;
  if (note.evidenceId && round.evidence[note.evidenceId]) {
    evidence = round.evidence[note.evidenceId];
    copy.evidenceId = newId("ev");
    round.evidence[copy.evidenceId] = {
      id: copy.evidenceId,
      noteId: copy.id,
      html: evidence.html,
      plain: evidence.plain
    };
  }
  return copy;
}

function movePoint(round, noteId, direction) {
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

function addGroup(round, caseSide) {
  var count = round.cases[caseSide].contentionIds.length + 1;
  var contention = newGroup("Contention " + count);
  round.contentions[contention.id] = contention;
  round.cases[caseSide].contentionIds.push(contention.id);
  return contention;
}

function deleteGroup(round, contentionId) {
  var caseSide = sideOfGroup(round, contentionId);
  var notes;
  var ids;
  var kept;
  var i;
  if (!caseSide) return;
  notes = notesInGroup(round, contentionId);
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
}

function moveGroup(round, contentionId, direction) {
  var caseSide = sideOfGroup(round, contentionId);
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
  var notes = notesInGroup(round, contentionId);
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
  if (!map[oldId]) map[oldId] = newId("id");
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
  copy.crossNotes = {
    firstCrossfire: round.crossNotes.firstCrossfire,
    secondCrossfire: round.crossNotes.secondCrossfire,
    grandCrossfire: round.crossNotes.grandCrossfire,
    reflections: round.crossNotes.reflections
  };
  copy.columnFocus = {
    pro: { count: round.columnFocus.pro.count, start: round.columnFocus.pro.start },
    con: { count: round.columnFocus.con.count, start: round.columnFocus.con.start }
  };
  return copy;
}

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
  for (i = 0; i < oldIds.length; i++) deleteGroup(round, oldIds[i]);
  round.cases[side].contentionIds = copyIdList(preflow.contentionIds, cloned.map);
  names = Object.keys(cloned.contentions);
  for (i = 0; i < names.length; i++) round.contentions[names[i]] = cloned.contentions[names[i]];
  names = Object.keys(cloned.notes);
  for (i = 0; i < names.length; i++) round.notes[names[i]] = cloned.notes[names[i]];
  names = Object.keys(cloned.evidence);
  for (i = 0; i < names.length; i++) round.evidence[names[i]] = cloned.evidence[names[i]];
}

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
        copy.evidenceId = newId("ev");
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
