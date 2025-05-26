document.addEventListener("DOMContentLoaded", () => {
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
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("id"); // Obține ID-ul utilizatorului din URL

  // Redirecționare la profilul "Big"
  document
    .getElementById("bigProfileButton")
    .addEventListener("click", function () {
      window.location.href = `profile.html?id=${userId}`; // Redirecționează la profilul utilizatorului
    });

  // Redirecționare la profilul "Futsal"
  document
    .getElementById("futsalProfileButton")
    .addEventListener("click", function () {
      window.location.href = `futsalprofile.html?id=${userId}`; // Redirecționează la profilul de futsal al utilizatorului
    });
  // Oprește submit-ul formularului de căutare
  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
  });

  async function fetchUserDetails() {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id");

    if (!userId) {
      console.error("ID utilizator lipsă în URL.");
      return;
    }

    try {
      const response = await fetch(`/futsalusers/${userId}`); // Modificăm endpoint-ul la /futsalusers
      if (!response.ok) {
        throw new Error(
          "Eroare la preluarea detaliilor utilizatorului de futsal."
        );
      }

      const user = await response.json();
      document.getElementById("userProfilePic").src = user.profilePic;
      document.getElementById("userName").textContent = `${user.name}`;

      // Setăm steagul utilizatorului
      document.getElementById("userFlag").src =
        user.flag_name || "default_flag.png"; // Default flag dacă nu există

      // Setăm datele specifice pentru futsal
      document.getElementById(
        "userGames"
      ).textContent = `${user.futsal_matches_played}`;
      document.getElementById("userGoals").textContent = `${user.futsal_goals}`;
      document.getElementById(
        "userAssists"
      ).textContent = `${user.futsal_assists}`;
      document.getElementById(
        "userCS"
      ).textContent = `${user.futsal_cleansheets}`;
      document.getElementById("teamName").textContent =
        user.futsal_team_name || "None";
      document.getElementById("teamLogo").src =
        user.futsal_team_logo || "default_logo.png";
      document.getElementById("currentSeason").textContent =
        user.futsal_season_name || "N/A";

      // Setăm link-ul echipei curente de futsal
      const teamLink = document.getElementById("teamLink");
      teamLink.href = `/futsalteam.html?teamName=${encodeURIComponent(
        user.futsal_team_name
      )}`;

      // Afișăm numele țării și steagul
      document.getElementById("countryName").textContent = user.country_name;
      document.getElementById("countryFlag").src = user.flag_name;
      // Fetch futsal career history
      const futsalCareerHistoryResponse = await fetch(
        `/futsalCareerHistory/${user.id}`
      );
      const futsalCareerHistory = await futsalCareerHistoryResponse.json();
      const careerHistoryList = document.getElementById("careerHistoryList");

      // Clear any previous rows
      careerHistoryList.innerHTML = "";

      // Populate futsal career history table
      futsalCareerHistory.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
    <td>
      <a href="/team.html?teamName=${encodeURIComponent(
        item.futsal_team_name
      )}">
        <img src="${
          item.futsal_team_logo || "default_logo.png"
        }" alt="Futsal Team Logo" class="team-logo" />
        ${item.futsal_team_name}
      </a>
    </td>
    <td class="hide-on-small">${item.futsal_season_name || "N/A"}</td>
    <td>${item.futsal_matches_played}</td>
    <td>${item.futsal_goals}</td>
    <td>${item.futsal_assists}</td>
    <td>${item.futsal_cleansheets}</td>
  `;
        careerHistoryList.appendChild(row);
      });

      // Setează statistici curente pentru futsal
      const currentFutsalStats = {
        season_name: user.futsal_season_name || "N/A", // Sezonul curent
        futsal_goals: user.futsal_goals,
        futsal_assists: user.futsal_assists,
        futsal_cleansheets: user.futsal_cleansheets,
      };

      const aggregatedFutsalCareerHistory =
        aggregateFutsalCareerStats(futsalCareerHistory);

      function aggregateFutsalCareerStats(futsalCareerHistory) {
        const aggregatedStats = {};

        futsalCareerHistory.forEach((entry) => {
          const season = entry.futsal_season_name;

          // Dacă sezonul nu există în obiect, îl creăm
          if (!aggregatedStats[season]) {
            aggregatedStats[season] = {
              goals: 0,
              assists: 0,
              cleansheets: 0,
            };
          }

          // Adunăm statisticile
          aggregatedStats[season].goals += entry.futsal_goals;
          aggregatedStats[season].assists += entry.futsal_assists;
          aggregatedStats[season].cleansheets += entry.futsal_cleansheets;
        });

        // Verificăm dacă sezonul curent se află în istoricul carierei
        const currentSeasonName = "Current Season"; // Poate fi modificat în funcție de cum numești sezonul curent
        if (currentFutsalStats.season_name) {
          // Verificăm dacă sezonul curent există deja în aggregatedStats
          if (!aggregatedStats[currentSeasonName]) {
            aggregatedStats[currentSeasonName] = {
              goals: 0,
              assists: 0,
              cleansheets: 0,
            };
          }

          // Adunăm statisticile curente
          aggregatedStats[currentSeasonName].goals +=
            currentFutsalStats.futsal_goals;
          aggregatedStats[currentSeasonName].assists +=
            currentFutsalStats.futsal_assists;
          aggregatedStats[currentSeasonName].cleansheets +=
            currentFutsalStats.futsal_cleansheets;
        }

        // Transformăm obiectul în array
        return Object.keys(aggregatedStats).map((season) => ({
          season_name: season,
          goals: aggregatedStats[season].goals,
          assists: aggregatedStats[season].assists,
          cleansheets: aggregatedStats[season].cleansheets,
        }));
      }
      function createFutsalStatsChart(futsalCareerHistory) {
        // Sortează careerHistory după season_name în ordine crescătoare
        futsalCareerHistory.sort((a, b) => {
          if (a.season_name === "Current Season") return 1; // Pune-l la sfârșit
          if (b.season_name === "Current Season") return -1;
          return a.season_name.localeCompare(b.season_name);
        });

        const ctx = document
          .getElementById("futsalStatsChart")
          .getContext("2d");

        // Extrage datele din istoricul carierei
        const seasons = futsalCareerHistory.map((item) => item.season_name);
        const goals = futsalCareerHistory.map((item) => item.goals);
        const assists = futsalCareerHistory.map((item) => item.assists);
        const cleansheets = futsalCareerHistory.map((item) => item.cleansheets);

        // Creează graficul cu Chart.js
        new Chart(ctx, {
          type: "line",
          data: {
            labels: seasons, // Sezoanele vor apărea pe axa X
            datasets: [
              {
                label: "Goals",
                data: goals,
                borderColor: "rgba(75, 192, 192, 1)",
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                fill: true,
                tension: 0.4,
              },
              {
                label: "Assists",
                data: assists,
                borderColor: "rgba(54, 162, 235, 1)",
                backgroundColor: "rgba(54, 162, 235, 0.2)",
                fill: true,
                tension: 0.4,
              },
              {
                label: "Clean Sheets",
                data: cleansheets,
                borderColor: "rgba(255, 206, 86, 1)",
                backgroundColor: "rgba(255, 206, 86, 0.2)",
                fill: true,
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                display: true,
              },
              tooltip: {
                enabled: true,
              },
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: "Season",
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Stats",
                },
                beginAtZero: true,
                ticks: {
                  stepSize: 5, // Afișează valorile din 5 în 5
                },
              },
            },
          },
        });
      }

      // Agregă statisticile de carieră futsal

      // Creează graficul pentru statistici futsal
      createFutsalStatsChart(aggregatedFutsalCareerHistory);

      // Fetch and display trophies
      const trophiesList = document.getElementById("trophiesList");
      trophiesList.innerHTML = ""; // Clear previous trophies

      user.trophies.forEach((trophy) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <img src="${trophy.trophy_image}" alt="${trophy.trophy_name}" class="trophy-image" />
        `;
        trophiesList.appendChild(li);
      });

      // Fetch futsal all-time stats
      const futsalStatsResponse = await fetch(
        `/futsalAllTimeStats/${user.name}`
      );
      const futsalStats = await futsalStatsResponse.json();
      document.getElementById("totalGames").textContent =
        futsalStats.totalFutsalMatchesPlayed || 0; // Modificat
      document.getElementById("totalGoals").textContent =
        futsalStats.totalFutsalGoals || 0; // Modificat
      document.getElementById("totalAssists").textContent =
        futsalStats.totalFutsalAssists || 0; // Modificat
      document.getElementById("totalCS").textContent =
        futsalStats.totalFutsalCleansheets || 0;
    } catch (error) {
      console.error("Eroare la obținerea detaliilor utilizatorului:", error);
    }
  }

  fetchUserDetails();
});
