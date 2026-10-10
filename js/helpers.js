function copyBox(id) {
  var sample = document.getElementById(id);
  return sample.firstElementChild.cloneNode(true);
}

function show(node) {
  if (node) node.classList.remove("hide");
}

function hide(node) {
  if (node) node.classList.add("hide");
}   

function emptyBox(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

function showText(node, text) {
  if (!node) return;
  node.textContent = text || "";
  if (text) show(node);
  else hide(node);
}

function valuesOf(box) {
  var names = Object.keys(box || {});
  var list = [];
  var i;
  for (i = 0; i < names.length; i++) {
    list.push(box[names[i]]);
  }
  return list;
}

function joinFilled(parts, gap) {
  var kept = [];
  var i;
  for (i = 0; i < parts.length; i++) {
    if (parts[i]) kept.push(parts[i]);
  }
  return kept.join(gap);
}

function newestFirst(list) {
  var i;
  var j;
  var temp;
  for (i = 0; i < list.length; i++) {
    for (j = i + 1; j < list.length; j++) {
      if ((list[j].updatedAt || "") > (list[i].updatedAt || "")) {
        temp = list[i];
        list[i] = list[j];
        list[j] = temp;
      }
    }
  }
  return list;
}
