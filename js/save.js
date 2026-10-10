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
    // A truncated write (laptop died mid-round) is not a usable file. Try the spare.
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
  data.settings.durations = mendClocks(data.settings.durations);
  names = Object.keys(data.rounds);
  for (i = 0; i < names.length; i++) {
    mendRound(data.rounds[names[i]]);
    stopTimerOnOpen(data.rounds[names[i]]);
  }
  names = Object.keys(data.preflows);
  for (i = 0; i < names.length; i++) mendPreflow(data.preflows[names[i]]);
  return data;
}

function storageFull(error) {
  if (!error) return false;
  if (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  return error.code === 22 || error.code === 1014;
}

function writeSave(store) {
  var copy = {
    rounds: store.rounds,
    preflows: store.preflows,
    settings: store.settings,
    lastRoundId: store.lastRoundId || null
  };
  var json;
  try {
    json = JSON.stringify(copy);
  } catch (error) {
    return "This round couldn't be written. Copy the cards out before you close the tab.";
  }
  try {
    localStorage.setItem(STORE_KEY, json);
  } catch (error) {
    if (storageFull(error)) return "Browser storage is full. Export this round, then delete an old one.";
    return "Could not save — export a copy";
  }
  try {
    // The spare copy is optional. If only the backup doesn't fit, the round itself is already in.
    localStorage.setItem(BACKUP_KEY, json);
  } catch (error) {
    return "";
  }
  return "";
}
