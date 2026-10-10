// Verbatim/Docs cards: keep the highlight and the underline, flatten a table or a screenshot
// down to the quote. A <font color> from Word becomes a span. script/iframe never makes it in.

var SAFE_TAGS = {
  B: true, STRONG: true, I: true, EM: true, U: true, S: true, STRIKE: true, DEL: true,
  BR: true, P: true, DIV: true, SPAN: true, UL: true, OL: true, LI: true, A: true,
  MARK: true, SUB: true, SUP: true, BLOCKQUOTE: true, H1: true, H2: true, H3: true, FONT: true
};

var SAFE_STYLES = ["color", "background-color", "font-size", "font-family", "font-weight", "font-style", "text-decoration", "text-align"];

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
  var i;
  var value;
  if (!style) return "";
  for (i = 0; i < SAFE_STYLES.length; i++) {
    value = style.getPropertyValue(SAFE_STYLES[i]);
    if (!value) continue;
    if (!styleIsSafe(value)) continue;
    out.push(SAFE_STYLES[i] + ":" + value);
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
  var next;
  var cleaned;
  while (child) {
    next = child.nextSibling;
    cleaned = cleanTag(child, notice);
    if (cleaned) fragment.appendChild(cleaned);
    child = next;
  }
}

function cleanTag(node, notice) {
  var copy;
  var style;
  var href;
  var text;
  var plain;
  if (node.nodeType === 3) return document.createTextNode(node.textContent);
  if (node.nodeType !== 1) return null;
  if (node.tagName === "TABLE" || node.tagName === "IMG" || node.tagName === "IMAGE") {
    if (notice.indexOf("simplified") === -1) notice.push("simplified");
    text = node.tagName === "IMG" ? "" : (node.textContent || "");
    return text ? document.createTextNode(text) : null;
  }
  // A citation link is fine. A script or embedded frame from a messy Docs paste is not a card.
  if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.tagName === "IFRAME" || node.tagName === "OBJECT") {
    return null;
  }
  if (!SAFE_TAGS[node.tagName]) {
    copy = document.createDocumentFragment();
    cleanInside(node, notice, copy);
    return copy;
  }
  if (node.tagName === "FONT") copy = document.createElement("span");
  else if (node.tagName === "H1" || node.tagName === "H2" || node.tagName === "H3") copy = document.createElement("p");
  else copy = document.createElement(node.tagName.toLowerCase());
  style = keepStyle(node.style);
  if (node.tagName === "FONT") {
    if (node.color) style = (style ? style + ";" : "") + "color:" + node.color;
    if (node.size) style = (style ? style + ";" : "") + "font-size:" + (Number(node.size) * 4 + 8) + "px";
  }
  if (style) copy.setAttribute("style", style);
  if (copy.tagName === "A") {
    href = keepLink(node.getAttribute("href"));
    if (!href) {
      plain = document.createDocumentFragment();
      cleanInside(node, notice, plain);
      return plain;
    }
    copy.setAttribute("href", href);
  }
  if (copy.tagName !== "BR") cleanInside(node, notice, copy);
  return copy;
}

function cleanHtml(html) {
  var notice = [];
  var parsed = new DOMParser().parseFromString("<div>" + String(html || "") + "</div>", "text/html");
  var source = parsed.body.firstChild;
  var wrap = document.createElement("div");
  if (source) cleanInside(source, notice, wrap);
  return {
    html: wrap.innerHTML,
    plain: wrap.textContent || "",
    notice: notice.length ? "Some pasted content was simplified so it stays readable." : ""
  };
}

function linesToHtml(text) {
  var lines = String(text || "").split("\n");
  var parts = [];
  var i;
  var lineBox;
  for (i = 0; i < lines.length; i++) {
    lineBox = document.createElement("div");
    lineBox.textContent = lines[i];
    parts.push(lineBox.innerHTML);
  }
  return parts.join("<br>");
}

function putHtmlHere(html) {
  var selection;
  var range;
  var node;
  var parsed;
  var fragment;
  var holder;
  if (!html) return;
  selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  range = selection.getRangeAt(0);
  range.deleteContents();
  parsed = new DOMParser().parseFromString("<div>" + html + "</div>", "text/html");
  fragment = document.createDocumentFragment();
  holder = parsed.body.firstChild;
  while (holder && holder.firstChild) fragment.appendChild(holder.firstChild);
  node = fragment.lastChild;
  range.insertNode(fragment);
  if (node) {
    range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
