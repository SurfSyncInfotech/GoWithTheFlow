function loadPreflowDropdown() {
  var select = document.getElementById("new-opening");
  if (!select) return;

  var preflowIds = Object.keys(db.preflows);
  while (select.options.length > 1) {
    select.remove(1);
  }

  for (var i = 0; i < preflowIds.length; i++) {
    var option = cloneTemplate("opt-sample");
    option.value = preflowIds[i];
    option.textContent = db.preflows[preflowIds[i]].title;
    select.appendChild(option);
  }
}

function openNewRoundModal() {
  document.getElementById("new-title").value = "Untitled round";
  document.getElementById("new-topic").value = "";
  document.getElementById("new-tournament").value = "";
  document.getElementById("new-round-label").value = "";
  document.getElementById("new-opponent").value = "";
  document.getElementById("new-side").value = "pro";
  document.getElementById("new-first").value = "pro";
  loadPreflowDropdown();
  showElement(document.getElementById("new-round-box"));
}

function createRoundFromForm() {
  var title = document.getElementById("new-title").value.trim() || "Untitled round";
  var topic = document.getElementById("new-topic").value.trim();
  var tournament = document.getElementById("new-tournament").value.trim();
  var roundLabel = document.getElementById("new-round-label").value.trim();
  var opponent = document.getElementById("new-opponent").value.trim();
  var yourSide = document.getElementById("new-side").value;
  var firstSide = document.getElementById("new-first").value;

  var round = createNewRound({
    title: title,
    topic: topic,
    tournament: tournament,
    roundLabel: roundLabel,
    opponent: opponent,
    yourSide: yourSide,
    firstSide: firstSide
  }, db.settings);

  var preflowId = document.getElementById("new-opening").value;
  var preflow = preflowId && db.preflows[preflowId];
  var errorElement = document.getElementById("new-round-error");

  if (preflow && (preflow.side === "pro" || preflow.side === "con")) {
    applyPreflowToRound(round, preflow);
  }

  db.rounds[round.id] = round;
  var saveError = saveToLocalStorage(db);
  if (saveError) {
    delete db.rounds[round.id];
    if (errorElement) {
      errorElement.textContent = saveError;
    }
    return;
  }

  if (errorElement) {
    errorElement.textContent = "";
  }
  openRound(round.id);
}

function openRenameModal(roundId) {
  var box = document.getElementById("rename-box");
  box.dataset.id = roundId;
  document.getElementById("rename-title").value = db.rounds[roundId].title;
  showElement(box);
}

function displayRoundsList() {
  var banner = document.getElementById("recovered-banner");
  if (banner) {
    if (db.recovered) {
      showElement(banner);
    } else {
      hideElement(banner);
    }
  }

  var allRounds = objectValuesToList(db.rounds);
  var searchText = state.query.trim().toLowerCase();
  var matchedRounds = [];

  for (var i = 0; i < allRounds.length; i++) {
    var roundData = allRounds[i];
    var combinedText = [
      roundData.title,
      roundData.topic,
      roundData.tournament,
      roundData.opponent
    ].join(" ").toLowerCase();

    if (!searchText || combinedText.indexOf(searchText) !== -1) {
      matchedRounds.push(roundData);
    }
  }

  var sortedRounds = sortByRecentDate(matchedRounds);
  var emptyState = document.getElementById("empty-home");
  var browserSection = document.getElementById("round-browser");

  if (sortedRounds.length === 0 && !searchText) {
    showElement(emptyState);
    hideElement(browserSection);
    return;
  }

  hideElement(emptyState);
  showElement(browserSection);

  var countBadge = document.getElementById("round-count");
  if (countBadge) {
    countBadge.textContent = sortedRounds.length + (sortedRounds.length === 1 ? " round" : " rounds") + " in this browser";
  }

  var searchInput = document.querySelector("[data-field='search-box']");
  if (searchInput && document.activeElement !== searchInput) {
    searchInput.value = state.query;
  }

  var cardList = document.getElementById("card-list");
  clearElement(cardList);

  var noMatchElement = document.getElementById("no-match");
  if (sortedRounds.length === 0) {
    showElement(noMatchElement);
  } else {
    hideElement(noMatchElement);
  }

  for (var j = 0; j < sortedRounds.length; j++) {
    var singleRound = sortedRounds[j];
    var card = cloneTemplate("sample-round");

    card.querySelector(".card-name").textContent = singleRound.title;

    var sideTag = card.querySelector(".side-tag");
    sideTag.textContent = formatSideName(singleRound.yourSide) || "Pro";
    sideTag.classList.remove("pro-tag", "con-tag", "obs-tag");
    if (singleRound.yourSide === "con") {
      sideTag.classList.add("con-tag");
    } else if (singleRound.yourSide === "observer") {
      sideTag.classList.add("obs-tag");
    } else {
      sideTag.classList.add("pro-tag");
    }

    var detailsText = joinNonEmptyText([singleRound.tournament, singleRound.roundLabel], " · ");
    setElementText(card.querySelector(".card-line"), detailsText);
    setElementText(card.querySelector(".card-topic"), singleRound.topic || "");
    card.querySelector(".card-time").textContent = "Edited " + new Date(singleRound.updatedAt).toLocaleString();

    var buttons = card.querySelectorAll("button");
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].dataset.id = singleRound.id;
    }

    cardList.appendChild(card);
  }
}

window.renderCurrentPage = function () {
  displayRoundsList();
};

document.addEventListener("click", function (event) {
  var trigger = event.target.closest("[data-action]");
  if (!trigger) return;

  var action = trigger.dataset.action;
  var id = trigger.dataset.id;

  if (action === "new-round") {
    openNewRoundModal();
  } else if (action === "open-round") {
    openRound(id);
  } else if (action === "create-round") {
    createRoundFromForm();
  } else if (action === "rename-round") {
    openRenameModal(id);
  } else if (action === "save-rename") {
    var renameId = document.getElementById("rename-box").dataset.id;
    var existingRound = db.rounds[renameId];
    if (existingRound) {
      existingRound.title = document.getElementById("rename-title").value.trim() || "Untitled round";
      existingRound.updatedAt = new Date().toISOString();
      saveToLocalStorage(db);
    }
    closePopups();
    render();
  } else if (action === "duplicate-round") {
    var copy = cloneRound(db.rounds[id], db.settings);
    db.rounds[copy.id] = copy;
    saveToLocalStorage(db);
    render();
  } else if (action === "delete-round") {
    askConfirm("Delete this round?", "This removes the round from this browser.", "Delete", function () {
      delete db.rounds[id];
      saveToLocalStorage(db);
      render();
    });
  } else if (action === "export-round") {
    downloadRoundAsJson(db.rounds[id]);
  }
});

document.addEventListener("input", function (event) {
  if (event.target.dataset.field === "search-box") {
    state.query = event.target.value;
    displayRoundsList();
  }
});
