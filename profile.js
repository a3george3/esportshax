document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("mobile-menu");
  const navLinks = document.getElementById("nav-links");
  menuToggle.addEventListener("click", function () {
    navLinks.classList.toggle("show");
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
  // document
  //   .getElementById("futsalProfileButton")
  //   .addEventListener("click", function () {
  //     window.location.href = `futsalprofile.html?id=${userId}`; // Redirecționează la profilul de futsal al utilizatorului
  //   });

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

  async function fetchUserDetails() {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id");

    if (!userId) {
      console.error("ID utilizator lipsă în URL.");
      return;
    }

    try {
      const response = await fetch(`/users/${userId}`);
      if (!response.ok) {
        throw new Error("Eroare la preluarea detaliilor utilizatorului.");
      }

      const user = await response.json();
      document.getElementById("userProfilePic").src = user.profilePic;
      document.getElementById("userName").textContent = `${user.name}`;

      // Adaugă această linie pentru a seta steagul utilizatorului
      document.getElementById("userFlag").src =
        user.flag_name || "default_flag.png"; // Aici poți adăuga un default flag dacă nu există

      document.getElementById(
        "userGames"
      ).textContent = `${user.matches_played}`;
      document.getElementById("userGoals").textContent = `${user.goals}`;
      document.getElementById("userAssists").textContent = `${user.assists}`;
      document.getElementById("userCS").textContent = `${user.cleansheets}`;
      document.getElementById("teamName").textContent =
        user.team_name || "None";
      document.getElementById("teamLogo").src =
        user.team_logo || "default_logo.png";
      document.getElementById("currentSeason").textContent =
        user.season_name || "N/A";

      // Setează link-ul echipei curente
      const teamLink = document.getElementById("teamLink");
      teamLink.href = `/team.html?teamName=${encodeURIComponent(
        user.team_name
      )}`;

      // Aici adaugăm numele țării și flag-ul
      document.getElementById("countryName").textContent = user.country_name;
      document.getElementById("countryFlag").src = user.flag_name;

      // Fetch career history
      const careerHistoryResponse = await fetch(`/careerHistory/${user.id}`);
      const careerHistory = await careerHistoryResponse.json();
      const careerHistoryList = document.getElementById("careerHistoryList");

      // Clear any previous rows
      careerHistoryList.innerHTML = "";

      // Populate career history table
      careerHistory.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>
            <a href="/team.html?teamName=${encodeURIComponent(item.team_name)}">
              <img src="${
                item.team_logo || "default_logo.png"
              }" alt="Team Logo" class="team-logo" />
              ${item.team_name}
            </a>
          </td>
          <td class="hide-on-small">${item.season_name || "N/A"}</td>
          <td>${item.matches_played}</td>
          <td>${item.goals}</td>
          <td>${item.assists}</td>
          <td>${item.cleansheets}</td>
        `;
        careerHistoryList.appendChild(row);
      });

      careerHistory.push({
        season_name: "Current Season",
        goals: user.goals,
        assists: user.assists,
        cleansheets: user.cleansheets,
      });
      const aggregatedCareerHistory = aggregateCareerStats(careerHistory);

      function aggregateCareerStats(careerHistory) {
        const aggregatedStats = {};

        careerHistory.forEach((entry) => {
          const season = entry.season_name;

          // Dacă sezonul nu există în obiect, îl creăm
          if (!aggregatedStats[season]) {
            aggregatedStats[season] = {
              goals: 0,
              assists: 0,
              cleansheets: 0,
            };
          }

          // Adunăm statisticile
          aggregatedStats[season].goals += entry.goals;
          aggregatedStats[season].assists += entry.assists;
          aggregatedStats[season].cleansheets += entry.cleansheets;
        });

        // Transformăm obiectul în array
        return Object.keys(aggregatedStats).map((season) => ({
          season_name: season,
          goals: aggregatedStats[season].goals,
          assists: aggregatedStats[season].assists,
          cleansheets: aggregatedStats[season].cleansheets,
        }));
      }

      function createPlayerStatsChart(careerHistory) {
        // Sortează careerHistory după season_name în ordine crescătoare
        careerHistory.sort((a, b) => {
          if (a.season_name === "Current Season") return 1; // Pune-l la sfârșit
          if (b.season_name === "Current Season") return -1;
          return a.season_name.localeCompare(b.season_name);
        });

        const ctx = document
          .getElementById("playerStatsChart")
          .getContext("2d");

        // Extrage datele din istoricul carierei
        const seasons = careerHistory.map((item) => item.season_name);
        const goals = careerHistory.map((item) => item.goals);
        const assists = careerHistory.map((item) => item.assists);
        const cleansheets = careerHistory.map((item) => item.cleansheets);

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

      createPlayerStatsChart(aggregatedCareerHistory);

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

      // Fetch all-time stats
      const allTimeStatsResponse = await fetch(`/allTimeStats/${user.name}`);
      const allTimeStats = await allTimeStatsResponse.json();
      document.getElementById("totalGames").textContent =
        allTimeStats.totalMatchesPlayed;
      document.getElementById("totalGoals").textContent =
        allTimeStats.totalGoals;
      document.getElementById("totalAssists").textContent =
        allTimeStats.totalAssists;
      document.getElementById("totalCS").textContent =
        allTimeStats.totalCleansheets;
    } catch (error) {
      console.error("Eroare la obținerea detaliilor utilizatorului:", error);
    }
  }

  fetchUserDetails();
});
