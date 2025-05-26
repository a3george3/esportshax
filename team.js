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

  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
  });

  async function fetchTeamsData() {
    try {
      const response = await fetch("teams.json");
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

  // Apelează funcția pentru a popula tabelul
  populateLeagueTable();

  const params = new URLSearchParams(window.location.search);
  const teamName = params.get("teamName");

  if (!teamName) {
    document.getElementById("teamName").innerText = "Team not specified.";
    return;
  }

  fetch(`/team/${encodeURIComponent(teamName)}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error fetching team details.");
      }
      return response.json();
    })
    .then((data) => {
      const team = data.team;
      const players = data.players;

      const teamNameElement = document.getElementById("teamName");
      const logoElement = document.getElementById("logo");
      const foundedSeasonElement = document.getElementById("foundedSeason");
      const topScorerElement = document.getElementById("topScorer");
      const topAssisterElement = document.getElementById("topAssister");
      const mostMatchesElement = document.getElementById("mostMatches");
      const topCleanSheetsElement = document.getElementById("topCleanSheets");
      const playersListElement = document.getElementById("playersList");

      if (
        !teamNameElement ||
        !logoElement ||
        !foundedSeasonElement ||
        !topScorerElement ||
        !topAssisterElement ||
        !mostMatchesElement ||
        !topCleanSheetsElement ||
        !playersListElement
      ) {
        throw new Error("One or more required elements are missing.");
      }

      teamNameElement.innerText = team.team_name;
      logoElement.src = team.logo;
      foundedSeasonElement.querySelector(
        ".stat-value"
      ).innerText = `FOUNDED IN ${team.founded_season}`;

      // Clear any existing players
      playersListElement.innerHTML = "";

      // Create the table with a single thead
      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
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

      // Initialize variables for top performers
      let topScorer = { name: null, flag: null, url: null };
      let topAssister = { name: null, flag: null, url: null };
      let mostMatches = { name: null, flag: null, url: null };
      let topCleanSheets = { name: null, flag: null, url: null };
      let maxGoals = -1;
      let maxAssists = -1;
      let maxMatches = -1;
      let maxCleanSheets = -1;

      players.forEach((player) => {
        const careerGoals = player.careerStats.reduce(
          (acc, curr) => acc + curr.goals,
          0
        );
        const totalGoals = player.goals + careerGoals;

        const careerAssists = player.careerStats.reduce(
          (acc, curr) => acc + curr.assists,
          0
        );
        const totalAssists = player.assists + careerAssists;

        const careerMatches = player.careerStats.reduce(
          (acc, curr) => acc + curr.matches_played,
          0
        );
        const totalMatches = player.matches_played + careerMatches;

        const careerCleanSheets = player.careerStats.reduce(
          (acc, curr) => acc + curr.cleansheets,
          0
        );
        const totalCleanSheets = player.cleansheets + careerCleanSheets;

        // Update Top Scorer
        if (totalGoals > maxGoals) {
          maxGoals = totalGoals;
          topScorer = {
            name: player.name,
            flag: player.flag_name,
            url: `/profile.html?id=${player.id}`,
          };
        }

        // Update Top Assister
        if (totalAssists > maxAssists) {
          maxAssists = totalAssists;
          topAssister = {
            name: player.name,
            flag: player.flag_name,
            url: `/profile.html?id=${player.id}`,
          };
        }

        // Update Most Matches Played
        if (totalMatches > maxMatches) {
          maxMatches = totalMatches;
          mostMatches = {
            name: player.name,
            flag: player.flag_name,
            url: `/profile.html?id=${player.id}`,
          };
        }

        // Update Top Clean Sheets
        if (totalCleanSheets > maxCleanSheets) {
          maxCleanSheets = totalCleanSheets;
          topCleanSheets = {
            name: player.name,
            flag: player.flag_name,
            url: `/profile.html?id=${player.id}`,
          };
        }

        const row = document.createElement("tr");

        row.innerHTML = `
          <td>
            <a href="/profile.html?id=${player.id}">
              <div class="playerDiv">
                <img src="${player.flag_name}" alt="${player.country_name}" class="flag-icon" />
                <p>${player.name}</p>
              </div>
            </a>
          </td>
          <td>${player.matches_played}</td>
          <td>${player.goals}</td>
          <td>${player.assists}</td>
          <td>${player.cleansheets}</td>
        `;

        tbody.appendChild(row);
      });

      // Display the Top Scorer, Top Assister, Most Matches Played, and Top Clean Sheets
      topScorerElement.innerHTML = `
        Top Scorer: <a href="${topScorer.url}">
          <div class="playerDiv">
            <img src="${topScorer.flag}" alt="Flag" class="flag" />
            <span>${topScorer.name} (${maxGoals})</span>
          </div>
        </a>
      `;
      topAssisterElement.innerHTML = `
        Top Assister: <a href="${topAssister.url}">
          <div class="playerDiv">
            <img src="${topAssister.flag}" alt="Flag" class="flag" />
            <span>${topAssister.name} (${maxAssists})</span>
          </div>
        </a>
      `;
      mostMatchesElement.innerHTML = `
        Most Matches: <a href="${mostMatches.url}">
          <div class="playerDiv">
            <img src="${mostMatches.flag}" alt="Flag" class="flag" />
            <span>${mostMatches.name} (${maxMatches})</span>
          </div>
        </a>
      `;
      topCleanSheetsElement.innerHTML = `
        Top Clean Sheets: <a href="${topCleanSheets.url}">
          <div class="playerDiv">
            <img src="${topCleanSheets.flag}" alt="Flag" class="flag" />
            <span>${topCleanSheets.name} (${maxCleanSheets})</span>
          </div>
        </a>
      `;

      // Append the table to the playersListElement
      playersListElement.appendChild(table);

      const trophies = data.trophies; // Extragem trofeele din data

      // Restul codului tău...

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
      document.getElementById("teamName").innerText =
        "Error loading team details.";
    });

  const viewPlayersButton = document.getElementById("viewPlayersButton");

  if (viewPlayersButton) {
    viewPlayersButton.addEventListener("click", () => {
      const teamName = params.get("teamName");
      if (teamName) {
        window.location.href = `/players.html?teamName=${encodeURIComponent(
          teamName
        )}`;
      }
    });
  }
});
