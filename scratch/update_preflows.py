preflows_exp = """preflows.js
Preflows page. This file draws the preflow cards and handles New preflow, Edit details, and Delete.

Read it from top to bottom. Each code line is followed by what that line does.

function renderPreflowsList() {
This is the renderPreflowsList function. It draws the saved preflows.

  var list = document.getElementById("preflow-list");
Find the preflow list box (id preflow-list) and save it as list.

  if (!list) return;
If list is missing, stop here.

  var preflows = sortByRecentDate(getListFromObject(db.preflows));
Make preflows and set it to sortByRecentDate(getListFromObject(db.preflows)).

  clearElement(list);
Empty list.

  for (var i = 0; i < preflows.length; i++) {
Loop through preflows. i is the position, starting at 0.

    var singlePreflow = preflows[i];
Make singlePreflow and set it to preflows[i].

    var card = cloneTemplate("sample-pf");
Copy a hidden sample from the page and save it as card.

    var cardName = singlePreflow.topic;
Copy singlePreflow.topic into cardName.

    if (!cardName) {
If cardName is empty or missing, do the next lines.

      cardName = singlePreflow.title;
Set cardName to singlePreflow.title.

    }
    if (!cardName) {
If cardName is empty or missing, do the next lines.

      cardName = "Untitled preflow";
Set cardName to "Untitled preflow".

    }
    var cardTitle = card.querySelector(".card-name");
Find the card-name element inside the card and save it as cardTitle.

    cardTitle.textContent = cardName;
Set the text content of cardTitle to cardName.

    cardTitle.dataset.id = singlePreflow.id;
Attach the preflow id to cardTitle dataset so clicking it can open the preflow.

    card.querySelector(".card-extra").textContent = formatSideName(singlePreflow.side);
Format the side name (Aff or Neg) and put it into card-extra.

    var buttons = card.querySelectorAll("button");
Make buttons and set it to card.querySelectorAll("button").

    for (var b = 0; b < buttons.length; b++) {
Loop through buttons. b is the position, starting at 0.

      buttons[b].dataset.id = singlePreflow.id;
Set buttons[b].dataset.id to singlePreflow.id.

    }
    list.appendChild(card);
Put card inside this box.

  }
}

window.renderCurrentPage = function () {
This is the renderCurrentPage function for this page. The shared script calls it when the page should draw.

  renderPreflowsList();
Draw the preflow list again.

};
document.addEventListener("click", function (event) {
Listen on the page for a click. When it happens, run the steps below.

  var trigger = event.target.closest("[data-action]");
Make trigger and set it to event.target.closest("[data-action]").

  if (!trigger) return;
If trigger is missing, stop here.

  var action = trigger.dataset.action;
Copy trigger.dataset.action into action.

  var id = trigger.dataset.id;
Copy trigger.dataset.id into id.

  if (action === "open-opening") {
If the clicked action is "open-opening", do the next lines.

    openOpening(id);
Open the preflow id.

  } else if (action === "edit-preflow") {
Otherwise, if the clicked action is "edit-preflow", do the next lines.

    var preflow = db.preflows[id];
Look up this preflow in saved preflows by id.

    if (!preflow) return;
If preflow was not found, stop here.

    var editBox = document.getElementById("edit-preflow-box");
Find the Edit preflow details popup box.

    editBox.dataset.id = id;
Store the preflow id on the edit popup box.

    document.getElementById("edit-preflow-topic").value = preflow.topic || preflow.title || "";
Fill the topic input with the saved topic, title, or empty string.

    document.getElementById("edit-preflow-side").value = preflow.side || "pro";
Set the side dropdown to the saved side or default to pro.

    showElement(editBox);
Show the Edit preflow details popup box.

  } else if (action === "save-preflow-details") {
Otherwise, if the clicked action is "save-preflow-details", do the next lines.

    var box = document.getElementById("edit-preflow-box");
Find the Edit preflow details popup box.

    var preflowId = box.dataset.id;
Read the preflow id stored on the popup box.

    var targetPreflow = db.preflows[preflowId];
Look up the preflow being edited from database.

    if (targetPreflow) {
If the preflow exists in storage, do the next lines.

      var nextTopic = document.getElementById("edit-preflow-topic").value.trim();
Read the topic input and trim any whitespace.

      var nextSide = document.getElementById("edit-preflow-side").value;
Read the chosen side from the dropdown.

      if (nextSide !== "con") {
If the chosen side is not con, do the next lines.

        nextSide = "pro";
Default the side to pro.

      }
      var oldSide = targetPreflow.side;
Remember the previous side of the preflow.

      targetPreflow.topic = nextTopic;
Save the updated topic on the preflow.

      targetPreflow.title = nextTopic || "Untitled preflow";
Save the updated title or default to Untitled preflow.

      if (oldSide !== nextSide) {
If the side was changed between Aff and Neg, do the next lines.

        targetPreflow.side = nextSide;
Update the side to the newly chosen side.

        if (targetPreflow.notes) {
If the preflow has existing notes, do the next lines.

          var noteKeys = Object.keys(targetPreflow.notes);
Get the list of all note IDs.

          for (var nk = 0; nk < noteKeys.length; nk++) {
Loop through note IDs to update speech associations.

            var nItem = targetPreflow.notes[noteKeys[nk]];
Get the individual note object.

            if (nItem.speechId === oldSide + "-constructive") {
If this note belongs to the old constructive speech, do the next lines.

              nItem.speechId = nextSide + "-constructive";
Switch the speechId to the new constructive speech.

            }
          }
        }
      }
      targetPreflow.updatedAt = new Date().toISOString();
Record the current timestamp as the update time.

      saveToLocalStorage(db);
Save the updated database to browser local storage.

    }
    closePopups();
Close the open popup box.

    render();
Redraw the page with the updated preflow details.

  } else if (action === "new-opening") {
Otherwise, if the clicked action is "new-opening", do the next lines.

    document.getElementById("preflow-topic").value = "";
Find the Preflow topic box (id preflow-topic) and empty it.

    document.getElementById("preflow-side").value = "pro";
Find the Preflow side box (id preflow-side) and set it to pro.

    showElement(document.getElementById("new-opening-box"));
Show the New preflow box (id new-opening-box).

  } else if (action === "make-opening") {
Otherwise, if the clicked action is "make-opening", do the next lines.

    var topic = document.getElementById("preflow-topic").value.trim();
Read the Preflow topic box (id preflow-topic), trim the spaces, and save it as topic.

    var side = document.getElementById("preflow-side").value;
Read the Preflow side box (id preflow-side) and save it as side.

    var preflowTitle = topic;
Copy topic into preflowTitle.

    if (!preflowTitle) {
If preflowTitle is empty or missing, do the next lines.

      preflowTitle = "Untitled preflow";
Set preflowTitle to "Untitled preflow".

    }
    var made = createNewPreflow({
This line continues the step above.

      title: preflowTitle,
On this object, title is preflowTitle.

      topic: topic,
On this object, topic is topic.

      side: side
On this object, side is side.

    });
    db.preflows[made.id] = made;
Set db.preflows[made.id] to made.

    saveToLocalStorage(db);
Save the data in this browser.

    closePopups();
Close the new preflow modal.

    render();
Redraw the preflow list on this page so the new preflow appears immediately.

  } else if (action === "delete-opening") {
Otherwise, if the clicked action is "delete-opening", do the next lines.

    askConfirm(
This line continues the step above.

      "Delete this preflow?",
Keep this pasted style: Delete this preflow?.

      "Rounds already created from it stay as they are.",
Keep this pasted style: Rounds already created from it stay as they are..

      "Delete",
Keep this pasted style: Delete.

      function () {
This line continues the step above.

        delete db.preflows[id];
This line continues the step above.

        saveToLocalStorage(db);
Save the data in this browser.

        render();
Draw the page again.

      }
    );
This line continues the step above.

  }
});
"""

with open('explanations/preflows.txt', 'w', encoding='utf-8') as f:
    f.write(preflows_exp.strip() + '\n')

print('Wrote preflows.txt')
