document.addEventListener("DOMContentLoaded", async function () {
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

  /* LEAGUE TABLE */

  async function fetchTeamsData() {
    try {
      const response = await fetch("teams1futsald2.json");
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
          // Dacă punctele sunt egale, sortează după diferența de goluri
          return b.goalDifference - a.goalDifference;
        }
        // În caz contrar, sortează după puncte
        return b.points - a.points;
      });

      // Golirea tabelului înainte de populare
      const tableBody = document.getElementById("seasonTableBody");
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
              <div class="club">
                <img src="/${team.logo}" alt="${team.name} Logo" />
                <span>${team.name}</span>
              </div>
            </a>
          </td>
          <td>${team.points}</td>
          <td>${team.played}</td>
          <td>${team.wins}</td> <!-- Wins -->
          <td>${team.draws}</td> <!-- Draws -->
          <td>${team.losts}</td> <!-- Losses -->
          <td class="hide-on-small">${
            team.goalsScored
          }</td> <!-- Goals Scored -->
          <td class="hide-on-small">${
            team.goalsConceded
          }</td> <!-- Goals Conceded -->
          <td>${goalDifference}</td>
      `;

        tableBody.appendChild(row);
      });
    }
  }

  // Populează tabelul când DOM-ul este încărcat
  populateLeagueTable();
});
