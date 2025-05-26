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
  const seasonSelect = document.getElementById("season-select");

  seasonSelect.addEventListener("change", async function () {
    const selectedSeason = seasonSelect.value;
    await loadStatistics(selectedSeason);
  });

  // Încarcă statistici pentru sezonul implicit (de exemplu, sezonul 1)
  loadStatistics("1"); // Asigură-te că folosești valoarea numerică corectă pentru sezon
});

async function loadStatistics(season) {
  try {
    let url = `/futsalseason${season}Statistics`;

    // Modifică URL-ul pentru Season 1 D2
    if (season === "2") {
      url = `/futsalseason1D2Statistics`; // URL corect pentru Season 1 D2
    } else if (season === "all-time") {
      url = `/allTimeFutsalStatistics`;
    } else if (season === "all-time-d1") {
      url = `/allTimeFutsalStatisticsD1`;
    } else if (season === "all-time-d2") {
      url = `/allTimeFutsalStatisticsD2`;
    }

    const statisticsResponse = await fetch(url);
    const statisticsData = await statisticsResponse.json();

    // Populează tabelele
    populateTable("goals-table", statisticsData, "totalGoals");
    populateTable("assists-table", statisticsData, "totalAssists");
    populateTable("clean-sheets-table", statisticsData, "totalCleanSheets");
  } catch (error) {
    console.error("Eroare la obținerea statisticilor:", error);
  }
}

function populateTable(tableId, data, statType) {
  const tableBody = document
    .getElementById(tableId)
    .getElementsByTagName("tbody")[0];
  tableBody.innerHTML = ""; // Curăță tabelul

  // Filtrare date: doar jucătorii care au statistici > 0
  const filteredData = data.filter((player) => player[statType] > 0);

  // Verifică dacă datele sunt disponibile
  if (filteredData.length === 0) {
    const row = tableBody.insertRow();
    const messageCell = row.insertCell(0);
    messageCell.colSpan =
      tableId === "goals-table" ? 4 : tableId === "assists-table" ? 4 : 4; // Ajustează colSpan
    messageCell.textContent = `Nu există statistici disponibile pentru ${statType}.`;
    return;
  }

  // Sortează datele
  filteredData.sort((a, b) => b[statType] - a[statType]);

  filteredData.forEach((player, index) => {
    const row = tableBody.insertRow();
    const indexCell = row.insertCell(0);
    indexCell.textContent = index + 1;

    const infoCell = row.insertCell(1);
    const playerInfo = document.createElement("div");
    playerInfo.classList.add("player-info");

    const logoImg = document.createElement("img");
    logoImg.src = player.teamLogo;
    logoImg.alt = `${player.teamName} Logo`;
    logoImg.classList.add("logo");
    playerInfo.appendChild(logoImg);

    // Creează un link pentru numele jucătorului
    const nameLink = document.createElement("a");
    nameLink.href = `/profile.html?id=${player.id}`;
    nameLink.textContent = player.name;
    nameLink.classList.add("player-name");
    playerInfo.appendChild(nameLink);

    const flagImg = document.createElement("img");
    flagImg.src = player.countryFlag;
    flagImg.alt = `${player.countryName} Flag`;
    flagImg.classList.add("flag");
    playerInfo.appendChild(flagImg);

    infoCell.appendChild(playerInfo);

    if (statType === "totalGoals") {
      const gamesPlayedCell = row.insertCell(2);
      gamesPlayedCell.classList.add("center-align");
      gamesPlayedCell.textContent = player.totalMatchesPlayed || 0;

      const goalsCell = row.insertCell(3);
      goalsCell.classList.add("center-align");
      goalsCell.textContent = player.totalGoals || 0;
    } else if (statType === "totalAssists") {
      const gamesPlayedCell = row.insertCell(2);
      gamesPlayedCell.classList.add("center-align");
      gamesPlayedCell.textContent = player.totalMatchesPlayed || 0;

      const assistsCell = row.insertCell(3);
      assistsCell.classList.add("center-align");
      assistsCell.textContent = player.totalAssists || 0;
    } else if (statType === "totalCleanSheets") {
      const gamesPlayedCell = row.insertCell(2);
      gamesPlayedCell.classList.add("center-align");
      gamesPlayedCell.textContent = player.totalMatchesPlayed || 0;

      const cleanSheetsCell = row.insertCell(3);
      cleanSheetsCell.classList.add("center-align");
      cleanSheetsCell.textContent = player.totalCleanSheets || 0;
    }
  });
}
