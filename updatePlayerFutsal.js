document.addEventListener("DOMContentLoaded", () => {
  const playerNameInput = document.getElementById("playerName");
  const teamSelect = document.getElementById("teamName");
  const seasonSelect = document.getElementById("seasonName");

  // Populare lista de sugestii pentru jucători
  playerNameInput.addEventListener("input", async () => {
    const nameInput = playerNameInput.value;
    const response = await fetch(`/searchPlayer?name=${nameInput}`);
    const suggestions = await response.json();

    const suggestionsList = document.getElementById("suggestions");
    suggestionsList.innerHTML = "";

    if (suggestions.length > 0) {
      suggestions.forEach((suggestion) => {
        const li = document.createElement("li");
        li.textContent = suggestion.name;
        li.addEventListener("click", () => {
          playerNameInput.value = suggestion.name;
          suggestionsList.innerHTML = ""; // Clear suggestions
          loadPlayerDetails(suggestion.name); // Încarcă detaliile jucătorului
          loadAllTimeStats(suggestion.name); // Încarcă statisticile all-time
        });
        suggestionsList.appendChild(li);
      });
    }
  });

  // Funcție pentru a încărca echipele și a popula dropdown-ul
  async function loadTeams() {
    const response = await fetch("/futsalteams");
    const teams = await response.json();

    teams.forEach((team) => {
      const option = document.createElement("option");
      option.value = team.futsal_team_name; // Corectează aici
      option.textContent = team.futsal_team_name; // Corectează aici
      teamSelect.appendChild(option);
    });
  }

  // Funcție pentru a încărca sezoanele și a popula dropdown-ul
  async function loadSeasons() {
    const response = await fetch("/futsalseasons");
    const seasons = await response.json();

    seasons.forEach((season) => {
      const option = document.createElement("option");
      option.value = season.season_name; // Asigură-te că folosești numele sezonului
      option.textContent = season.season_name;
      seasonSelect.appendChild(option);
    });
  }

  // Încărcăm echipele și sezoanele la încărcarea paginii
  loadTeams();
  loadSeasons();

  // Funcție pentru a încărca detaliile jucătorului
  async function loadPlayerDetails(playerName) {
    const response = await fetch(`/playerDetails/${playerName}`);
    if (response.ok) {
      const playerDetails = await response.json();
      document.getElementById("currentGoals").textContent = playerDetails.goals;
      document.getElementById("currentAssists").textContent =
        playerDetails.assists;
      document.getElementById("currentMatchesPlayed").textContent =
        playerDetails.matches_played;
      document.getElementById("currentCleansheets").textContent =
        playerDetails.cleansheets;
      teamSelect.value = playerDetails.team_name || ""; // Setează echipa curentă
      seasonSelect.value = playerDetails.season_name || ""; // Setează sezonul curent
    } else {
      console.error("Eroare la încărcarea detaliilor jucătorului.");
    }
  }

  // Funcție pentru a încărca statisticile all-time
  async function loadAllTimeStats(playerName) {
    const response = await fetch(`/allTimeStats/${playerName}`);
    if (response.ok) {
      const stats = await response.json();
      document.getElementById("totalGoals").textContent = stats.totalGoals;
      document.getElementById("totalAssists").textContent = stats.totalAssists;
      document.getElementById("totalMatchesPlayed").textContent =
        stats.totalMatchesPlayed;
      document.getElementById("totalCleansheets").textContent =
        stats.totalCleansheets;
    } else {
      console.error("Eroare la încărcarea statisticilor all-time.");
    }
  }

  // Eveniment de submit pentru actualizarea statisticilor și echipei
  document
    .getElementById("updateForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const playerName = playerNameInput.value; // Asigură-te că playerNameInput este definit corect
      const goals = parseInt(document.getElementById("goals").value) || 0; // Adaugă 0 ca fallback
      const assists = parseInt(document.getElementById("assists").value) || 0; // Adaugă 0 ca fallback
      const matchesPlayed =
        parseInt(document.getElementById("matchesPlayed").value) || 0; // Adaugă 0 ca fallback
      const cleansheets =
        parseInt(document.getElementById("cleansheets").value) || 0; // Adaugă 0 ca fallback
      const teamName = teamSelect.value; // Obține echipa selectată
      const seasonName = seasonSelect.value; // Obține sezonul selectat

      const response = await fetch(`/updateFutsalPlayer/${playerName}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          futsal_goals: goals, // Actualizează numele câmpului pentru a corespunde cu backend-ul
          futsal_assists: assists, // Actualizează numele câmpului pentru a corespunde cu backend-ul
          futsal_matches_played: matchesPlayed, // Actualizează numele câmpului pentru a corespunde cu backend-ul
          futsal_cleansheets: cleansheets, // Actualizează numele câmpului pentru a corespunde cu backend-ul
          futsal_team_name: teamName, // Actualizează numele câmpului pentru a corespunde cu backend-ul
          futsal_season_name: seasonName, // Actualizează numele câmpului pentru a corespunde cu backend-ul
        }),
      });

      const messageDiv = document.getElementById("message");

      if (response.ok) {
        messageDiv.textContent =
          "Statistici, echipă și sezon actualizate cu succes!";
        messageDiv.style.color = "green";
        loadAllTimeStats(playerName); // Actualizează statisticile all-time după actualizare
      } else {
        messageDiv.textContent =
          "Eroare la actualizarea statisticilor, echipei și sezonului.";
        messageDiv.style.color = "red";
      }
    });
});
