function renderCrossfireNotes() {
  if (!state.round) return;

  updateTopBarAndSidebar();

  var textAreas = document.querySelectorAll("textarea.note-box");
  for (var i = 0; i < textAreas.length; i++) {
    var area = textAreas[i];
    var fieldKey = area.dataset.cross;
    var savedText = "";
    if (state.round.crossNotes && state.round.crossNotes[fieldKey]) {
      savedText = state.round.crossNotes[fieldKey];
    }
    if (document.activeElement !== area) {
      area.value = savedText;
    }
  }

  var focusCrossKey = sessionStorage.getItem("focusCross");
  if (focusCrossKey) {
    sessionStorage.removeItem("focusCross");
    var targetArea = document.querySelector('[data-cross="' + focusCrossKey + '"]');
    if (targetArea) {
      targetArea.focus();
    }
  }
}

window.renderCurrentPage = function () {
  renderCrossfireNotes();
};

document.addEventListener("input", function (event) {
  var target = event.target;
  if (!state.round || !target) return;

  if (target.dataset.field === "title-input") {
    state.round.title = target.value;
    saveSoon(false);
    return;
  }

  if (target.dataset.cross) {
    beginTyping();
    if (!state.round.crossNotes) {
      state.round.crossNotes = {};
    }
    state.round.crossNotes[target.dataset.cross] = target.value;
    saveSoon(false);
  }
});
