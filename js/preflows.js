function renderPreflowsList() {
  var list = document.getElementById("preflow-list");
  if (!list) return;

  var preflows = sortByRecentDate(objectValuesToList(db.preflows));
  clearElement(list);

  for (var i = 0; i < preflows.length; i++) {
    var singlePreflow = preflows[i];
    var card = cloneTemplate("sample-pf");

    card.querySelector(".card-name").textContent = singlePreflow.title;

    var extraText = formatSideName(singlePreflow.side);
    if (singlePreflow.topic) {
      extraText += " · " + singlePreflow.topic;
    }
    card.querySelector(".card-extra").textContent = extraText;

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
  } else if (action === "new-opening") {
    document.getElementById("preflow-title").value = "Untitled preflow";
    document.getElementById("preflow-topic").value = "";
    document.getElementById("preflow-side").value = "pro";
    showElement(document.getElementById("new-opening-box"));
  } else if (action === "make-opening") {
    var title = document.getElementById("preflow-title").value.trim();
    var topic = document.getElementById("preflow-topic").value.trim();
    var side = document.getElementById("preflow-side").value;

    var made = createNewPreflow({
      title: title,
      topic: topic,
      side: side
    });

    db.preflows[made.id] = made;
    saveToLocalStorage(db);
    openOpening(made.id);
  } else if (action === "delete-opening") {
    askConfirm("Delete this preflow?", "Rounds already created from it stay as they are.", "Delete", function () {
      delete db.preflows[id];
      saveToLocalStorage(db);
      render();
    });
  }
});
