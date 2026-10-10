function cloneTpl(id) {
  return document.getElementById(id).firstElementChild.cloneNode(true);
}

function unhide(node) {
  if (node) node.classList.remove("hide");
}

function foldAway(node) {
  if (node) node.classList.add("hide");
}

function clearNode(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

function setLine(node, text) {
  if (!node) return;
  node.textContent = text || "";
  if (text) unhide(node);
  else foldAway(node);
}

function objList(box) {
  var list = [];
  var k;
  if (!box) return list;
  for (k in box) {
    if (Object.prototype.hasOwnProperty.call(box, k)) list.push(box[k]);
  }
  return list;
}

function joinSkipEmpty(parts, gap) {
  var out = "";
  var i;
  for (i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    out = out ? out + gap + parts[i] : String(parts[i]);
  }
  return out;
}

// home + preflow lists. ISO dates sort as text, so this is enough.
function sortRecent(list) {
  return list.sort(function (a, b) {
    var x = a.updatedAt || "";
    var y = b.updatedAt || "";
    if (y > x) return 1;
    if (y < x) return -1;
    return 0;
  });
}
