var STORE_KEY = "goWithTheFlow";
var BACKUP_KEY = "goWithTheFlowBackup";

function blankSave() {
  return {
    rounds: {},
    preflows: {},
    settings: startSettings(),
    lastRoundId: null
  };
}

function readSaved(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    var data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch (error) {
    return null;
  }
}

function openSave() {
  var data = readSaved(STORE_KEY);
  var backup = readSaved(BACKUP_KEY);
  var names;
  var i;
  if (!data) {
    if (backup) {
      data = backup;
      data.recovered = true;
    } else {
      data = blankSave();
    }
  }
  if (!data.rounds) data.rounds = {};
  if (!data.preflows) data.preflows = {};
  if (!data.settings) data.settings = startSettings();
  if (!data.settings.durations) data.settings.durations = timerTimes();
  names = Object.keys(data.rounds);
  for (i = 0; i < names.length; i++) {
    stopTimerOnOpen(data.rounds[names[i]]);
  }
  return data;
}

function writeSave(store) {
  var copy = {
    rounds: store.rounds,
    preflows: store.preflows,
    settings: store.settings,
    lastRoundId: store.lastRoundId || null
  };
  try {
    var json = JSON.stringify(copy);
    localStorage.setItem(STORE_KEY, json);
    localStorage.setItem(BACKUP_KEY, json);
    return "";
  } catch (error) {
    return "Could not save — export a copy";
  }
}
