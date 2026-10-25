with open('explanations/index.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace openRenameModal
idx_modal_start = text.find('function openRenameModal(roundId) {')
idx_modal_end = text.find('function displayRoundsList()')

new_modal = """function openRenameModal(roundId) {
This is the openRenameModal function. It opens the Edit round details box for one round.

  var box = document.getElementById("rename-box");
Find the Edit round details box (id rename-box) and save it as box.

  var round = db.rounds[roundId];
Look up this round in saved rounds by roundId.

  if (!box || !round) return;
If the popup box or the round data is missing, stop here.

  box.dataset.id = roundId;
Set box.dataset.id to roundId so we know which round is being edited.

  document.getElementById("rename-title").value = round.title || "";
Find the Title input box (id rename-title) and set it to round.title or empty string.

  document.getElementById("rename-tournament").value = round.tournament || "";
Find the Tournament input box (id rename-tournament) and set it to round.tournament.

  document.getElementById("rename-round-label").value = round.roundLabel || "";
Find the Round Number input box (id rename-round-label) and set it to round.roundLabel.

  document.getElementById("rename-opponent").value = round.opponent || "";
Find the Opponent input box (id rename-opponent) and set it to round.opponent.

  document.getElementById("rename-side").value = round.yourSide || "pro";
Set the Your side dropdown (id rename-side) to round.yourSide or default to pro.

  document.getElementById("rename-first").value = round.firstSide || "pro";
Set the First speaking side dropdown (id rename-first) to round.firstSide or default to pro.

  loadPreflowDropdown("rename-opening");
Populate the Starting preflow dropdown in the edit modal with current preflows.

  document.getElementById("rename-opening").value = "";
Reset the Starting preflow selection to blank by default.

  var errorElement = document.getElementById("rename-round-error");
Find the error message placeholder element.

  if (errorElement) {
If the error element exists, do the next lines.

    errorElement.textContent = "";
Clear any previous error message text.

  }
  showElement(box);
Show the Edit round details popup box.

}

"""

text = text[:idx_modal_start] + new_modal + text[idx_modal_end:]

# Replace rename-round and save-rename
idx_click_start = text.find('} else if (action === "rename-round") {')
idx_click_end = text.find('} else if (action === "duplicate-round") {')

new_click = """} else if (action === "rename-round" || action === "edit-round") {
Otherwise, if the clicked action is "rename-round" or "edit-round", do the next lines.

    openRenameModal(id);
Open the Edit round details box for id.

  } else if (action === "save-rename") {
Otherwise, if the clicked action is "save-rename", do the next lines.

    var renameId = document.getElementById("rename-box").dataset.id;
Make renameId and set it to document.getElementById("rename-box").dataset.id.

    var existingRound = db.rounds[renameId];
Make existingRound and set it to db.rounds[renameId].

    if (existingRound) {
If existingRound, do the next lines.

      var nextTitle = document.getElementById("rename-title").value.trim();
Read the Title box (id rename-title), trim the spaces, and save it as nextTitle.

      if (!nextTitle) {
If nextTitle is empty or missing, do the next lines.

        nextTitle = existingRound.topic || "Untitled round";
Set nextTitle to existingRound.topic or default to Untitled round.

      }
      existingRound.title = nextTitle;
Set existingRound.title to nextTitle.

      existingRound.tournament = document.getElementById("rename-tournament").value.trim();
Read and save the tournament name.

      existingRound.roundLabel = document.getElementById("rename-round-label").value.trim();
Read and save the round number/label.

      existingRound.opponent = document.getElementById("rename-opponent").value.trim();
Read and save the opponent team name.

      var nextSide = document.getElementById("rename-side").value;
Read the chosen side value from the dropdown.

      if (nextSide !== "pro" && nextSide !== "con" && nextSide !== "observer") {
If the side value is not a valid side, do the next lines.

        nextSide = "pro";
Default the side to pro (Aff).

      }
      existingRound.yourSide = nextSide;
Set existingRound.yourSide to nextSide.

      var nextFirst = document.getElementById("rename-first").value;
Read the chosen first speaking side from the dropdown.

      if (nextFirst !== "con") {
If first speaking side is not con, do the next lines.

        nextFirst = "pro";
Default first speaking side to pro (Aff).

      }
      if (existingRound.firstSide !== nextFirst) {
If the first speaking side changed, do the next lines.

        existingRound.firstSide = nextFirst;
Update existingRound.firstSide to nextFirst.

        if (typeof createNewTimer === "function" && db.settings) {
If the createNewTimer function exists and settings are loaded, do the next lines.

          existingRound.timers = createNewTimer(existingRound.firstSide, db.settings.durations);
Recreate timers for the new speech sequence.

        }
      }
      var preflowId = document.getElementById("rename-opening").value;
Read the selected starting preflow id from the dropdown.

      if (preflowId && db.preflows[preflowId]) {
If a valid preflow was selected, do the next lines.

        var preflow = db.preflows[preflowId];
Look up the preflow data.

        if (preflow && (preflow.side === "pro" || preflow.side === "con")) {
If the preflow has a valid debate side, do the next lines.

          applyPreflowToRound(existingRound, preflow);
Apply the preflow contentions and notes to this round.

        }
      }
      existingRound.updatedAt = new Date().toISOString();
Set existingRound.updatedAt to new Date().toISOString().

      var saveError = saveToLocalStorage(db);
Save the updated round data to local storage.

      if (saveError) {
If saving returned an error message, do the next lines.

        var errorElement = document.getElementById("rename-round-error");
Find the error display element.

        if (errorElement) {
If errorElement exists, do the next lines.

          errorElement.textContent = saveError;
Display the save error to the user.

        }
        return;
Stop here so the modal stays open for correction.

      }
    }
    closePopups();
Close the open dialogs.

    render();
Draw the page again.

  """

text = text[:idx_click_start] + new_click + text[idx_click_end:]

with open('explanations/index.txt', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated index.txt')
