function renderPreflowsList() {
  var list = document.getElementById("preflow-list");
  if (!list) return;

  var preflows = sortByRecentDate(getListFromObject(db.preflows));

  clearElement(list);

  for (var i = 0; i < preflows.length; i++) {
    var singlePreflow = preflows[i];
    var card = cloneTemplate("sample-pf");

    var cardName = singlePreflow.topic;

    if (!cardName) {
      cardName = singlePreflow.title;
    }

    if (!cardName) {
      cardName = "Untitled preflow";
    }

    var cardTitle = card.querySelector(".card-name");
    cardTitle.textContent = cardName;
    cardTitle.dataset.id = singlePreflow.id;
    card.querySelector(".card-extra").textContent = formatSideName(singlePreflow.side);

    var buttons = card.querySelectorAll("button");

    for (var b = 0; b < buttons.length; b++) {
      buttons[b].dataset.id = singlePreflow.id;
    }

    list.appendChild(card);
  }
}

window.renderCurrentPage = function () {
  renderPreflowsList();
};

document.addEventListener("click", function (event) {
  var trigger = event.target.closest("[data-action]");
  if (!trigger) return;

  var action = trigger.dataset.action;
  var id = trigger.dataset.id;

  if (action === "open-opening") {
    openOpening(id);

  } else if (action === "edit-preflow") {
    var preflow = db.preflows[id];
    if (!preflow) return;
    var editBox = document.getElementById("edit-preflow-box");
    editBox.dataset.id = id;
    document.getElementById("edit-preflow-topic").value = preflow.topic || preflow.title || "";
    document.getElementById("edit-preflow-side").value = preflow.side || "pro";
    showElement(editBox);

  } else if (action === "save-preflow-details") {
    var box = document.getElementById("edit-preflow-box");
    var preflowId = box.dataset.id;
    var targetPreflow = db.preflows[preflowId];

    if (targetPreflow) {
      var nextTopic = document.getElementById("edit-preflow-topic").value.trim();
      var nextSide = document.getElementById("edit-preflow-side").value;
      if (nextSide !== "con") {
        nextSide = "pro";
      }

      var oldSide = targetPreflow.side;
      targetPreflow.topic = nextTopic;
      targetPreflow.title = nextTopic || "Untitled preflow";

      if (oldSide !== nextSide) {
        targetPreflow.side = nextSide;
        if (targetPreflow.notes) {
          var noteKeys = Object.keys(targetPreflow.notes);
          for (var nk = 0; nk < noteKeys.length; nk++) {
            var nItem = targetPreflow.notes[noteKeys[nk]];
            if (nItem.speechId === oldSide + "-constructive") {
              nItem.speechId = nextSide + "-constructive";
            }
          }
        }
      }

      targetPreflow.updatedAt = new Date().toISOString();
      saveToLocalStorage(db);
    }

    closePopups();
    render();

  } else if (action === "new-opening") {
    document.getElementById("preflow-topic").value = "";
    document.getElementById("preflow-side").value = "pro";
    showElement(document.getElementById("new-opening-box"));

  } else if (action === "make-opening") {
    var topic = document.getElementById("preflow-topic").value.trim();
    var side = document.getElementById("preflow-side").value;

    var preflowTitle = topic;

    if (!preflowTitle) {
      preflowTitle = "Untitled preflow";
    }

    var made = createNewPreflow({
      title: preflowTitle,
      topic: topic,
      side: side
    });

    db.preflows[made.id] = made;
    saveToLocalStorage(db);
    closePopups();
    render();

  } else if (action === "delete-opening") {
    askConfirm(
      "Delete this preflow?",
      "Rounds already created from it stay as they are.",
      "Delete",
      function () {
        delete db.preflows[id];

        saveToLocalStorage(db);
        render();
      }
    );
  }
});
