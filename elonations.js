document.addEventListener("DOMContentLoaded", function () {
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
  /* TOGGLE NAVBAR */
  const menuToggle = document.getElementById("mobile-menu");
  const navLinks = document.getElementById("nav-links");

  menuToggle.addEventListener("click", function () {
    navLinks.classList.toggle("show");
  });

  const dropdownButtons = document.querySelectorAll(".team-item");
  dropdownButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const column = this.closest(".column"); // Find the parent .column
      const info = column.querySelector(".additional-text"); // Find the corresponding .additional-text within the .column
      const dropdownImg = this.querySelector(".dropdown-img");
      if (info.style.display === "block") {
        info.style.display = "none";
        dropdownImg.src = "images/down-arrow.png";
      } else {
        info.style.display = "block";
        dropdownImg.src = "images/up-arrow.png";
      }
    });
  });

  const h1rank = document.getElementById("h1rank");
  const dropdownContent = document.getElementById("dropdownContent");

  h1rank.addEventListener("click", function () {
    dropdownContent.style.display =
      dropdownContent.style.display === "block" ? "none" : "block";
  });

  // Close the dropdown if the user clicks outside of it
  window.addEventListener("click", function (event) {
    if (
      !h1rank.contains(event.target) &&
      !dropdownContent.contains(event.target)
    ) {
      dropdownContent.style.display = "none";
    }
  });

  //     const nationsbtn = document.getElementById("nations-ranking");
  //     nationsbtn.addEventListener("click", function () {
  //       nationsbtn.innerHTML = "dsds";
  //     });

  populateEloTable();
  setupEventListeners();
});

let currentPage = 1;
let totalPages = 0;

async function fetchEloPoints() {
  const response = await fetch("players.json");
  const data = await response.json();
  return data;
}

async function populateEloTable(page = 1) {
  const eloPlPoints = await fetchEloPoints();
  if (eloPlPoints) {
    // Aggregate Elo points by national team
    const teamPoints = {};
    eloPlPoints.forEach((player) => {
      const team = player["national-team"];
      const points = parseInt(player.elopoints, 10);
      if (teamPoints[team]) {
        teamPoints[team].points += points;
        teamPoints[team].players.push(player);
      } else {
        teamPoints[team] = { points: points, players: [player] };
      }
    });

    // Convert the teamPoints object to an array and sort by total points
    const sortedTeams = Object.keys(teamPoints)
      .map((team) => ({
        team: team,
        flag: teamPoints[team].players[0].national,
        points: teamPoints[team].points,
        players: teamPoints[team].players,
      }))
      .sort((a, b) => b.points - a.points);

    // Pagination logic
    const teamsPerPage = 10;
    totalPages = Math.ceil(sortedTeams.length / teamsPerPage);

    const playersCard = document.getElementById("player-item");
    playersCard.innerHTML = "";

    const start = (page - 1) * teamsPerPage;
    const end = start + teamsPerPage;
    const teamsToDisplay = sortedTeams.slice(start, end);

    // Display the sorted teams
    teamsToDisplay.forEach((teamData, index) => {
      const sortedPlayers = teamData.players.sort(
        (a, b) => b.elopoints - a.elopoints
      );
      const div = document.createElement("div");
      div.classList.add("team");
      div.innerHTML = `
        <div class="teamStats">
            <div class="teamStyleStats">
            <img src="./images/down-arrow.png" class="arrow-down" alt="arrow-down">
              <p>${start + index + 1}</p> <img src="${
        teamData.flag
      }" class="flag" alt="flag"> 
              <span class="teamName">${teamData.team}</span> 
            </div>
            <span class="team-points">${teamData.points} points</span>
        </div>
        <div class="player-list">
          ${sortedPlayers
            .map(
              (player) => `
            <div class="player">
              <div class="pStats">
    <img src="${player.national}" alt="img"> 
    <span class="pName">
      <a href="${player.profileLink}" style="text-decoration: none; color: inherit;">${player.name}</a>
    </span>
  </div>
  <p class="pPoints">${player.elopoints}</p>
            </div>
          `
            )
            .join("")}
        </div>
      `;
      playersCard.appendChild(div);

      // Add event listener to the teamStats div
      div.querySelector(".teamStats").addEventListener("click", () => {
        const playerList = div.querySelector(".player-list");
        playerList.style.display =
          playerList.style.display === "block" ? "none" : "block";
      });
    });

    updatePaginationControls();
  }
}

function updatePaginationControls() {
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");

  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;
}

function setupEventListeners() {
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");

  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      populateEloTable(currentPage);
    }
  });

  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      populateEloTable(currentPage);
    }
  });
}
