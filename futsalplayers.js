document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.getElementById("mobile-menu");
  const navLinks = document.getElementById("nav-links");
  menuToggle.addEventListener("click", function () {
    navLinks.classList.toggle("show");
  });

  const playerSearchInput = document.getElementById("playerSearch");
  const searchSuggestions = document.getElementById("searchSuggestions");

  playerSearchInput.addEventListener("input", async () => {
    const nameInput = playerSearchInput.value.trim();

    if (nameInput.length > 0) {
      try {
        const response = await fetch(`/searchPlayer?name=${nameInput}`);
        const suggestions = await response.json();

        searchSuggestions.innerHTML = "";

        if (suggestions.length > 0) {
          suggestions.forEach((suggestion) => {
            const li = document.createElement("li");
            li.textContent = suggestion.name;
            li.addEventListener("click", () => {
              const userId = suggestion.id;
              const profileUrl = `/profile.html?id=${userId}`;
              window.location.href = profileUrl;
            });
            searchSuggestions.appendChild(li);
          });
        }
      } catch (error) {
        console.error("Eroare la obținerea sugestiilor:", error);
      }
    } else {
      searchSuggestions.innerHTML = "";
    }
  });

  // Oprește submit-ul formularului de căutare
  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
  });

  async function fetchTeamsData() {
    try {
      const response = await fetch("/futsalseasons/teams1futsal.json");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching the teams data:", error);
    }
  }

  async function populateLeagueTable() {
    const teams = await fetchTeamsData();
    if (teams) {
      // Calculează diferența de goluri pentru fiecare echipă
      teams.forEach((team) => {
        team.goalDifference = team.goalsScored - team.goalsConceded;
      });

      // Sortează echipele după puncte, iar în caz de egalitate, după diferența de goluri
      teams.sort((a, b) => {
        if (b.points === a.points) {
          return b.goalDifference - a.goalDifference;
        }
        return b.points - a.points;
      });

      // Golirea tabelului înainte de populare
      const tableBody = document.getElementById("leagueTableBody1");
      tableBody.innerHTML = ""; // Clear existing rows

      // Populează tabelul cu datele echipelor
      teams.forEach((team, index) => {
        const row = document.createElement("tr");

        const goalDifference =
          team.goalDifference > 0
            ? `+${team.goalDifference}`
            : team.goalDifference;

        row.innerHTML = `
        <td>${index + 1}</td>
        <td>
        <a href="${team.url}">
          <div class="club1">
              <img src="${team.logo}" alt="${team.name} Logo" />
              <span>${team.name}</span>
          </div>
          </a>
        </td>
        <td>${team.points}</td>
        <td>${team.played}</td>
        <td>${goalDifference}</td>
      `;

        tableBody.appendChild(row);
      });
    }
  }

  async function fetchTeamsDataD2() {
    try {
      const response = await fetch("/futsalseasons/teams1futsald2.json");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching the D2 teams data:", error);
    }
  }

  async function populateLeagueTableD2() {
    const teams = await fetchTeamsDataD2();
    if (teams) {
      // Calculează diferența de goluri pentru fiecare echipă
      teams.forEach((team) => {
        team.goalDifference = team.goalsScored - team.goalsConceded;
      });

      // Sortează echipele după puncte, iar în caz de egalitate, după diferența de goluri
      teams.sort((a, b) => {
        if (b.points === a.points) {
          return b.goalDifference - a.goalDifference;
        }
        return b.points - a.points;
      });

      // Golirea tabelului înainte de populare
      const tableBodyD2 = document.getElementById("leagueTableBody2");
      tableBodyD2.innerHTML = ""; // Clear existing rows

      // Populează tabelul cu datele echipelor
      teams.forEach((team, index) => {
        const row = document.createElement("tr");

        const goalDifference =
          team.goalDifference > 0
            ? `+${team.goalDifference}`
            : team.goalDifference;

        row.innerHTML = `
        <td>${index + 1}</td>
        <td>
        <a href="${team.url}">
          <div class="club1">
              <img src="${team.logo}" alt="${team.name} Logo" />
              <span>${team.name}</span>
          </div>
          </a>
        </td>
        <td>${team.points}</td>
        <td>${team.played}</td>
        <td>${goalDifference}</td>
      `;

        tableBodyD2.appendChild(row);
      });
    }
  }
  populateLeagueTableD2();

  // Apelează funcția pentru a popula tabelul
  populateLeagueTable();

  const params = new URLSearchParams(window.location.search);
  const teamName = params.get("teamName");

  if (!teamName) {
    document.getElementById("teamName").innerText = "Team not specified.";
    return;
  }

  fetch(`/futsalteam/${encodeURIComponent(teamName)}/players`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error fetching players.");
      }
      return response.json();
    })
    .then((data) => {
      const team = data.team; // Obține detaliile echipei
      const players = data.players;

      const teamNameElement = document.getElementById("teamName");
      const teamLogoElement = document.getElementById("teamLogo");
      const teamSeasonElement = document.getElementById("teamSeason");
      const playersListElement = document.getElementById("playersList");

      if (
        !teamNameElement ||
        !playersListElement ||
        !teamLogoElement ||
        !teamSeasonElement
      ) {
        throw new Error("One or more required elements are missing.");
      }

      // Actualizează detaliile echipei
      teamNameElement.innerText = `${team.futsal_team_name} ALL-TIME`;
      teamLogoElement.src = team.futsal_logo; // Setează src-ul pentru logo
      teamLogoElement.alt = `Logo of ${team.futsal_team_name}`;
      teamSeasonElement.innerText = `Founded in ${team.futsal_founded_season}`;

      // Găsește cei mai buni jucători în diferite categorii
      const topScorer = players.reduce(
        (max, player) => (player.totalGoals > max.totalGoals ? player : max),
        players[0]
      );
      const topAssister = players.reduce(
        (max, player) =>
          player.totalAssists > max.totalAssists ? player : max,
        players[0]
      );
      const mostMatches = players.reduce(
        (max, player) =>
          player.totalMatches > max.totalMatches ? player : max,
        players[0]
      );
      const topCleanSheets = players.reduce(
        (max, player) =>
          player.totalCleanSheets > max.totalCleanSheets ? player : max,
        players[0]
      );

      document
        .getElementById("topScorer")
        .querySelector(".stat-value").innerHTML = `
          <a href="/futsalprofile.html?id=${topScorer.id}" class="playerLink">
           <div class="playerDiv">  
            <img src="${topScorer.flag_name}" alt="${topScorer.country_id}" class="flag-icon" />
            <span>${topScorer.name} (${topScorer.totalGoals})</span>
          </div>
         </a>
      `;

      document
        .getElementById("topAssister")
        .querySelector(".stat-value").innerHTML = `
          <a href="/futsalprofile.html?id=${topAssister.id}" class="playerLink">
            <div class="playerDiv">
                <img src="${topAssister.flag_name}" alt="${topAssister.country_id}" class="flag-icon" />
                <span>${topAssister.name} (${topAssister.totalAssists})</span>
            </div>
          </a>
      `;

      document
        .getElementById("mostMatches")
        .querySelector(".stat-value").innerHTML = `
          <a href="/futsalprofile.html?id=${mostMatches.id}" class="playerLink">
            <div class="playerDiv">
                <img src="${mostMatches.flag_name}" alt="${mostMatches.country_id}" class="flag-icon" />
                <span>${mostMatches.name} (${mostMatches.totalMatches})</span>
            </div>
          </a>
      `;

      document
        .getElementById("topCleanSheets")
        .querySelector(".stat-value").innerHTML = `
          <a href="/futsalprofile.html?id=${topCleanSheets.id}" class="playerLink">
          <div class="playerDiv"> 
            <img src="${topCleanSheets.flag_name}" alt="${topCleanSheets.country_id}" class="flag-icon" />
            <span>${topCleanSheets.name} (${topCleanSheets.totalCleanSheets})</span>
         </div>
        </a>
      `;

      // Crează și adaugă tabelul cu jucători
      const table = document.createElement("table");
      table.innerHTML = `
        <thead class="thead2">
          <tr>
            <th>Player</th>
            <th>Matches</th>
            <th>Goals</th>
            <th>Assists</th>
            <th>CS</th>
          </tr>
        </thead>
        <tbody id="playersTableBody"></tbody>
      `;

      const tbody = table.querySelector("#playersTableBody");

      players.forEach((player) => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>
            <a href="/futsalprofile.html?id=${player.id}">
              <div class="playerDiv">
                <img src="${player.flag_name}" alt="${player.country_id}" class="flag-icon" />
                <p>${player.name}</p>
              </div>
            </a>
          </td>
          <td>${player.totalMatches}</td>
          <td>${player.totalGoals}</td>
          <td>${player.totalAssists}</td>
          <td>${player.totalCleanSheets}</td>
        `;

        tbody.appendChild(row);
      });

      playersListElement.appendChild(table);

      const trophies = data.trophies; // Extragem trofeele din data

      // Fetch and display trophies for a team
      const trophiesList = document.getElementById("trophiesList");
      trophiesList.innerHTML = ""; // Clear previous trophies

      if (trophies && trophies.length > 0) {
        // Iterate over trophies only if they exist and are not empty
        trophies.forEach((trophy) => {
          const li = document.createElement("li");
          li.innerHTML = `
        <img src="${trophy.trophy_image}" alt="${trophy.trophy_name}" class="trophy-image" />
      `;
          trophiesList.appendChild(li);
        });
      } else {
        trophiesList.innerHTML = "<li>No trophies available.</li>"; // Display message if no trophies
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      document.getElementById("teamName").innerText = "Error loading players.";
    });

  const viewPlayersButton = document.getElementById("viewPlayersButton");

  if (viewPlayersButton) {
    viewPlayersButton.addEventListener("click", () => {
      const teamName = params.get("teamName");
      if (teamName) {
        window.location.href = `/futsalteam.html?teamName=${encodeURIComponent(
          teamName
        )}`;
      }
    });
  }
});
