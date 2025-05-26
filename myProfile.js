document.addEventListener("DOMContentLoaded", async () => {
  function getToken() {
    return localStorage.getItem("token");
  }

  // Funcție pentru a obține informațiile profilului
  async function fetchProfile() {
    const token = getToken();
    const response = await fetch("/myProfile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const userProfile = await response.json();

      // Preluăm și convertim valorile în numere pentru a face calcule
      const currentGoals = Number(userProfile.goals) || 0;
      const currentAssists = Number(userProfile.assists) || 0;
      const currentMatchesPlayed = Number(userProfile.matches_played) || 0;
      const currentCleansheets = Number(userProfile.cleansheets) || 0;

      const totalGoals = Number(userProfile.totalGoals) || 0;
      const totalAssists = Number(userProfile.totalAssists) || 0;
      const totalMatchesPlayed = Number(userProfile.totalMatchesPlayed) || 0;
      const totalCleansheets = Number(userProfile.totalCleansheets) || 0;

      // Afișăm valorile
      document.getElementById("name").textContent = `Nume: ${userProfile.name}`;
      document.getElementById(
        "email"
      ).textContent = `Email: ${userProfile.email}`;
      document.getElementById("goals").textContent = `Goluri: ${currentGoals}`;
      document.getElementById(
        "assists"
      ).textContent = `Asisturi: ${currentAssists}`;
      document.getElementById(
        "matches-played"
      ).textContent = `Meciuri Jucate: ${currentMatchesPlayed}`;
      document.getElementById(
        "cleansheets"
      ).textContent = `CleanSheets: ${currentCleansheets}`;
      document.getElementById("team-name").textContent = `Echipa: ${
        userProfile.team_name || "N/A"
      }`;
      document.getElementById("profile-pic").src =
        userProfile.profilePic || "default-profile.png";

      // Calculăm statisticile all-time ca sumă matematică
      const allTimeGoals = currentGoals + totalGoals;
      const allTimeAssists = currentAssists + totalAssists;
      const allTimeMatchesPlayed = currentMatchesPlayed + totalMatchesPlayed;
      const allTimeCleansheets = currentCleansheets + totalCleansheets;

      // Afișăm statisticile all-time
      document.getElementById(
        "total-goals"
      ).textContent = `Goluri All-Time: ${allTimeGoals}`;
      document.getElementById(
        "total-assists"
      ).textContent = `Asisturi All-Time: ${allTimeAssists}`;
      document.getElementById(
        "total-matches-played"
      ).textContent = `Meciuri Jucate All-Time: ${allTimeMatchesPlayed}`;
      document.getElementById(
        "total-cleansheets"
      ).textContent = `CleanSheets All-Time: ${allTimeCleansheets}`;

      // Afișează istoricul carierei
      const careerHistoryList = document.getElementById("career-history-list");
      userProfile.careerHistory.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = `Echipa: ${item.team_name}, Goluri: ${item.goals}, Asisturi: ${item.assists}, Meciuri Jucate: ${item.matches_played}, CleanSheets: ${item.cleansheets}`;
        careerHistoryList.appendChild(li);
      });
    } else {
      console.error("Eroare la obținerea profilului:", response.statusText);
    }
  }

  // Funcție pentru deconectare
  document.getElementById("logout").addEventListener("click", () => {
    localStorage.removeItem("token"); // Șterge token-ul din stocare
    window.location.href = "/login.html"; // Redirect la pagina de logare
  });

  // Apelează funcția pentru a obține informațiile profilului la încărcarea paginii
  window.onload = fetchProfile;
});
