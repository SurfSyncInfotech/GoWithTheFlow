function loadSettingsForm() {
  var fontSizeNote = document.getElementById("font-size-note");
  if (fontSizeNote) {
    var currentSize = (db.settings && db.settings.fontSize) || 14;
    fontSizeNote.textContent = "Choose 12, 14, 16, or 18 px in the workspace toolbar. The current size is " + currentSize + " px.";
  }

  var inputs = document.querySelectorAll("[data-preset]");
  for (var i = 0; i < inputs.length; i++) {
    var presetKey = inputs[i].dataset.preset;
    inputs[i].value = db.settings.durations[presetKey];
  }

  var soundCheckbox = document.querySelector("[data-field='sound']");
  if (soundCheckbox) {
    soundCheckbox.checked = !!db.settings.sound;
  }
}

window.renderCurrentPage = function () {
  loadSettingsForm();
};

document.addEventListener("click", function (event) {
  var trigger = event.target.closest("[data-action]");
  if (!trigger) return;

  var action = trigger.dataset.action;

  if (action === "save-settings") {
    var inputs = document.querySelectorAll("[data-preset]");
    var parsedResults = [];
    var messageNotes = [];
    var hasError = false;
    var noteElement = document.getElementById("clock-note");
    var soundCheckbox = document.querySelector("[data-field='sound']");

    for (var i = 0; i < inputs.length; i++) {
      var presetKey = inputs[i].dataset.preset;
      var rawValue = inputs[i].value;
      var result = validateSpeechTime(presetKey, rawValue);

      parsedResults.push(result);
      if (!result.ok) {
        hasError = true;
      }
      if (result.message) {
        messageNotes.push(result.message);
      }
    }

    if (hasError) {
      if (noteElement) {
        noteElement.textContent = messageNotes.join(" ");
      }
      return;
    }

    for (var j = 0; j < inputs.length; j++) {
      var key = inputs[j].dataset.preset;
      db.settings.durations[key] = parsedResults[j].seconds;
      inputs[j].value = String(parsedResults[j].seconds);
    }

    if (soundCheckbox) {
      db.settings.sound = soundCheckbox.checked;
    }

    var saveError = saveToLocalStorage(db);
    if (saveError) {
      if (noteElement) {
        noteElement.textContent = saveError;
      }
      return;
    }

    if (messageNotes.length > 0) {
      if (noteElement) {
        noteElement.textContent = messageNotes.join(" ");
      }
      return;
    }

    window.location.href = "index.html";
  }
});
