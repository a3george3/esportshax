document.addEventListener("DOMContentLoaded", async function () {
  /* TOGGLE NAVBAR */
  const menuToggle = document.getElementById("mobile-menu");
  const navLinks = document.getElementById("nav-links");
  const authLink = document.getElementById("auth-link");
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  if (token && userId) {
    authLink.innerHTML = `<a href="profile.html?id=${userId}">My Profile</a>`;
  }
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

  // Obține numărul total de utilizatori și actualizează div-ul
  try {
    const response = await fetch("/totalUsers");
    const data = await response.json();

    // Afișează numărul de utilizatori în div-ul dorit
    const registeredUsersDiv = document.querySelector(".registered");
    registeredUsersDiv.textContent = `Accounts created: ${data.total}`;
  } catch (error) {
    console.error("Eroare la obținerea numărului de utilizatori:", error);
  }

  menuToggle.addEventListener("click", function () {
    navLinks.classList.toggle("show");

    // const authLink = document.getElementById("auth-link");

    // // Verifică dacă există un token în localStorage
    // const token = localStorage.getItem("token");

    // if (token) {
    //   // Dacă utilizatorul este conectat, schimbă link-ul în "Logout"
    //   authLink.innerHTML = `<a href="#" class="logout-button">Logout</a>`;

    //   // Adaugă un event listener pentru logout
    //   const logoutButton = authLink.querySelector(".logout-button");
    //   logoutButton.addEventListener("click", async () => {
    //     // Aici ar trebui să adaugi logica pentru a deconecta utilizatorul, de obicei prin a apela un endpoint de logout
    //     localStorage.removeItem("token"); // Șterge token-ul
    //     alert("Deconectare reușită!"); // Afișează un mesaj de confirmare
    //     window.location.reload(); // Reîncarcă pagina pentru a actualiza starea
    //   });
    // }
  });

  // SWIPE STATS

  const container = document.querySelector(".cards-container");

  let isDown = false;
  let startX;
  let scrollLeft;

  container.addEventListener("mousedown", (e) => {
    isDown = true;
    container.classList.add("active");
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  container.addEventListener("mouseleave", () => {
    isDown = false;
    container.classList.remove("active");
  });

  container.addEventListener("mouseup", () => {
    isDown = false;
    container.classList.remove("active");
  });

  container.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 3;
    container.scrollLeft = scrollLeft - walk;
  });

  populateLeagueTable();
  populateGoalsStats();
  populateAssistsStats();
  populateCSStats();
  populateGoalsTeamStats();
});

/* LEAGUE TABLE */

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
        // Dacă punctele sunt egale, sortează după diferența de goluri
        return b.goalDifference - a.goalDifference;
      }
      // În caz contrar, sortează după puncte
      return b.points - a.points;
    });

    // Golirea tabelului înainte de populare
    const tableBody = document.getElementById("leagueTableBody");
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

// PLAYER STATS

async function fetchPlayerStats() {
  try {
    const response = await fetch("/season3Statistics");
    const data = await response.json();
    console.log(data); // Verifică datele obținute
    return data;
  } catch (error) {
    console.error("Error fetching the players data:", error);
  }
}
async function populateGoalsStats() {
  const playersStats = await fetchPlayerStats();
  if (playersStats) {
    console.log(playersStats); // Verifică datele obținute
    playersStats.sort((a, b) => b.totalGoals - a.totalGoals); // Sortează jucătorii după goluri
    const topStats = playersStats.slice(0, 5);
    const playersCard = document.getElementById("playersStatsCard");
    playersCard.innerHTML = ""; // Curăță conținutul existent

    topStats.forEach((player, index) => {
      console.log(player); // Verifică datele pentru fiecare jucător

      const div = document.createElement("div");
      div.classList.add("player");

      if (index === 0) {
        div.classList.add("change-background");
      }

      div.innerHTML = `
        <div class="pStats${index === 0 ? "1st" : ""}">
          ${index + 1} 
          <img src="${player.teamLogo}" alt="${player.teamLogo} Logo" />
          <a href="/profile.html?id=${player.id}" class="pName${
        index === 0 ? "1st" : ""
      }">
            ${player.name}
          </a>
          <img src="${player.countryFlag}" alt="${
        player.countryName
      } Flag" class="countryFlag"/>
        </div>
        <p class="pGoals${index === 0 ? "1st" : ""}">${player.totalGoals}</p>
      `;

      playersCard.appendChild(div);
    });

    const viewFullListButton = document.createElement("button");
    viewFullListButton.textContent = "See all statistics";
    viewFullListButton.classList.add("statistics-button");
    viewFullListButton.addEventListener("click", () => {
      window.location.href = "statistics.html";
    });
    playersCard.appendChild(viewFullListButton);
  }
}

// Call the function to fetch and display players' goals stats

async function populateAssistsStats() {
  const playersAssists = await fetchPlayerStats(); // Asigură-te că fetchPlayerStats obține datele corecte de la server
  if (playersAssists) {
    console.log(playersAssists); // Verifică datele obținute
    playersAssists.sort((a, b) => b.totalAssists - a.totalAssists); // Sortează jucătorii după asisturi
    const topAssists = playersAssists.slice(0, 5);
    const playersCard1 = document.getElementById("playersAssistsCard");
    console.log(playersCard1);
    playersCard1.innerHTML = ""; // Curăță conținutul existent

    topAssists.forEach((playerAssist, index) => {
      console.log(playerAssist); // Verifică datele pentru fiecare jucător

      const div = document.createElement("div");
      div.classList.add("player");

      if (index === 0) {
        div.classList.add("change-background");
        div.innerHTML = `
          <div class="pStats1st">
            ${index + 1} 
            <img src="${playerAssist.teamLogo}" alt="${
          playerAssist.teamName
        } Logo" />
            <a href="/profile.html?id=${
              playerAssist.id
            }" class="pName1st" style="text-decoration: none; color: inherit;">
              ${playerAssist.name}
            </a>
            <img src="${playerAssist.countryFlag}" alt="${
          playerAssist.countryName
        } Flag" class="countryFlag"/>
          </div>
          <p class="pGoals1st">${playerAssist.totalAssists}</p>
        `;
      } else {
        div.innerHTML = `
          <div class="pStats">
            ${index + 1} 
            <img src="${playerAssist.teamLogo}" alt="${
          playerAssist.teamName
        } Logo" />
            <a href="/profile.html?id=${
              playerAssist.id
            }" class="pName" style="text-decoration: none; color: inherit;">
              ${playerAssist.name}
            </a>
            <img src="${playerAssist.countryFlag}" alt="${
          playerAssist.countryName
        } Flag" class="countryFlag"/>
          </div>
          <p class="pGoals">${playerAssist.totalAssists}</p>
        `;
      }
      playersCard1.appendChild(div);
    });

    const viewFullListButton = document.createElement("button");
    viewFullListButton.textContent = "See all statistics";
    viewFullListButton.classList.add("statistics-button");
    viewFullListButton.addEventListener("click", () => {
      window.location.href = "statistics.html";
    });
    playersCard1.appendChild(viewFullListButton);
  }
}

// CLEAN SHEETS

async function populateCSStats() {
  const playersCS = await fetchPlayerStats(); // Asigură-te că fetchPlayerStats obține datele corecte de la server
  if (playersCS) {
    console.log(playersCS); // Verifică datele obținute
    playersCS.sort((a, b) => b.totalCleanSheets - a.totalCleanSheets); // Sortează jucătorii după clean sheets
    const topCS = playersCS.slice(0, 5);
    const playersCard2 = document.getElementById("playersCSCard");
    console.log(playersCard2);
    playersCard2.innerHTML = ""; // Curăță conținutul existent

    topCS.forEach((playerCS, index) => {
      console.log(playerCS); // Verifică datele pentru fiecare jucător

      const div = document.createElement("div");
      div.classList.add("player");

      if (index === 0) {
        div.classList.add("change-background");
        div.innerHTML = `
          <div class="pStats1st">
            ${index + 1} 
            <img src="${playerCS.teamLogo}" alt="${playerCS.teamName} Logo" />
            <a href="/profile.html?id=${
              playerCS.id
            }" class="pName1st" style="text-decoration: none; color: inherit;">
              ${playerCS.name}
            </a>
            <img src="${playerCS.countryFlag}" alt="${
          playerCS.countryName
        } Flag" class="countryFlag"/>
          </div>
          <p class="pGoals1st">${playerCS.totalCleanSheets}</p>
        `;
      } else {
        div.innerHTML = `
          <div class="pStats">
            ${index + 1} 
            <img src="${playerCS.teamLogo}" alt="${playerCS.teamName} Logo" />
            <a href="/profile.html?id=${
              playerCS.id
            }" class="pName" style="text-decoration: none; color: inherit;">
              ${playerCS.name}
            </a>
            <img src="${playerCS.countryFlag}" alt="${
          playerCS.countryName
        } Flag" class="countryFlag"/>
          </div>
          <p class="pGoals">${playerCS.totalCleanSheets}</p>
        `;
      }
      playersCard2.appendChild(div);
    });

    const viewFullListButton = document.createElement("button");
    viewFullListButton.textContent = "See all statistics";
    viewFullListButton.classList.add("statistics-button");
    viewFullListButton.addEventListener("click", () => {
      window.location.href = "statistics.html";
    });
    playersCard2.appendChild(viewFullListButton);
  }
}

// GOALS SCORED BY TEAMS

async function populateGoalsTeamStats() {
  const teamsGoals = await fetchTeamsData();
  if (teamsGoals) {
    teamsGoals.sort((a, b) => b.goalsScored - a.goalsScored); // Sort teams by goals scored
    const topTeams = teamsGoals.slice(0, 5); // Get the top 5 teams
    const teamsGoalsCard = document.getElementById("teamsGoalsCard");
    teamsGoalsCard.innerHTML = ""; // Clear existing content

    topTeams.forEach((team, index) => {
      const div = document.createElement("div");
      div.classList.add("player");
      if (index === 0) {
        div.classList.add("change-background");
        div.innerHTML = `
          <div class="pStats1st">${index + 1} <img src="${team.logo}" alt="${
          team.name
        } Logo" /><span class="pName1st">${team.name}</span></div>
          <p class="pGoals1st">${team.goalsScored}</p>
        `;
      } else {
        div.innerHTML = `
          <div class="pStats">${index + 1} <img src="${team.logo}" alt="${
          team.name
        } Logo" /><span class="pName">${team.name}</span></div>
          <p class="pGoals">${team.goalsScored}</p>
        `;
      }
      teamsGoalsCard.appendChild(div);
    });

    const viewFullListButton = document.createElement("button");
    viewFullListButton.textContent = "See all statistics";
    viewFullListButton.classList.add("statistics-button");
    viewFullListButton.addEventListener("click", () => {
      // Handle the click event
      // Example: Redirect to another page with full list
      window.location.href = "statistics.html";
    });
    teamsGoalsCard.appendChild(viewFullListButton);
  }
}

// Call the function to fetch and display team goals stats

// async function fetchLeaderboardData() {
//   try {
//     const response = await fetch(
//       "https://www.neatqueue.com/leaderboard/1120686602176442470/1155646661348032542"
//     ); // Replace 'API_URL' with the actual API endpoint
//     const data = await response.json();
//     console.log(data);

//     // data.forEach((player) => {
//     //   console.log(
//     //     `Name: ${player.name}, MMR: ${player.mmr}, Win-Loss: ${player.winLoss}`
//     //   );
//     // });
//   } catch (error) {
//     console.error("Error fetching the leaderboard data:", error);
//   }
// }

// fetchLeaderboardData();
