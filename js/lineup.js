function cardHeight(note, heights) {
  var value = heights && heights[note.id];
  var lines;
  var visual;
  var i;
  if (value && value >= 40) return value;
  lines = String(note.text || "").split("\n");
  visual = 0;
  for (i = 0; i < lines.length; i++) {
    visual += Math.max(1, Math.ceil((lines[i].length || 1) / 32));
  }
  if (!visual) visual = 1;
  return Math.max(40, visual * 22 + 16);
}

function repliesInColumn(round, parentId, speechId) {
  var parent = round.notes[parentId];
  var names;
  var list;
  var i;
  var note;
  if (!parent) return [];
  names = Object.keys(round.notes);
  list = [];
  for (i = 0; i < names.length; i++) {
    note = round.notes[names[i]];
    if (note.parentId === parentId && note.speechId === speechId && note.contentionId === parent.contentionId) {
      list.push(note);
    }
  }
  return sortByOrder(list);
}

function spaceForPoint(round, note, caseSide, heights, saved) {
  var own;
  var later;
  var maxStack;
  var s;
  var siblings;
  var stack;
  var i;
  if (saved[note.id]) return saved[note.id];
  own = cardHeight(note, heights);
  later = speechesAfter(round, caseSide, note.speechId);
  maxStack = 0;
  for (s = 0; s < later.length; s++) {
    siblings = repliesInColumn(round, note.id, later[s]);
    if (!siblings.length) continue;
    stack = 0;
    for (i = 0; i < siblings.length; i++) {
      stack += spaceForPoint(round, siblings[i], caseSide, heights, saved);
      if (i < siblings.length - 1) stack += 8;
    }
    if (stack > maxStack) maxStack = stack;
  }
  saved[note.id] = Math.max(own, maxStack);
  return saved[note.id];
}

function placePoint(round, note, top, caseSide, heights, saved, positions) {
  var own = cardHeight(note, heights);
  var later = speechesAfter(round, caseSide, note.speechId);
  var s;
  var siblings;
  var y;
  var i;
  positions[note.id] = {
    top: top,
    height: own,
    reserved: saved[note.id],
    speechId: note.speechId
  };
  for (s = 0; s < later.length; s++) {
    siblings = repliesInColumn(round, note.id, later[s]);
    y = top;
    for (i = 0; i < siblings.length; i++) {
      placePoint(round, siblings[i], y, caseSide, heights, saved, positions);
      y += saved[siblings[i].id] + 8;
    }
  }
}

function hasEarlierReply(round, noteId, speechId, caseSide) {
  var list = speechesOnSide(round, caseSide);
  var limit = list.indexOf(speechId);
  var s;
  if (limit < 0) return false;
  for (s = 0; s < limit; s++) {
    if (repliesInColumn(round, noteId, list[s]).length) return true;
  }
  return false;
}

function lineUpGroup(round, contention, caseSide, heights) {
  var saved = {};
  var positions = {};
  var slots = [];
  var y = 0;
  var i;
  var id;
  var note;
  var threadSpace;
  var names;
  var item;
  var later;
  var speechId;
  var siblings;
  var bottom;
  var slot;
  positions._threads = [];

  for (i = 0; i < contention.startingPointIds.length; i++) {
    id = contention.startingPointIds[i];
    note = round.notes[id];
    if (!note) continue;
    spaceForPoint(round, note, caseSide, heights, saved);
    placePoint(round, note, y, caseSide, heights, saved, positions);
    threadSpace = saved[note.id];
    positions._threads.push({ id: note.id, top: y, reserved: threadSpace });
    y += threadSpace + 8;
  }

  names = Object.keys(positions);
  for (i = 0; i < names.length; i++) {
    if (names[i] === "_threads") continue;
    item = positions[names[i]];
    later = speechesAfter(round, caseSide, item.speechId);
    for (var s = 0; s < later.length; s++) {
      speechId = later[s];
      siblings = repliesInColumn(round, names[i], speechId);
      if (siblings.length || hasEarlierReply(round, names[i], speechId, caseSide)) continue;
      slots.push({
        parentId: names[i],
        speechId: speechId,
        top: item.top
      });
    }
  }

  bottom = y;
  for (i = 0; i < slots.length; i++) {
    slot = slots[i];
    if (slot.top + 48 > bottom) bottom = slot.top + 48;
  }

  return {
    positions: positions,
    slots: slots,
    height: Math.max(bottom, 48)
  };
}
