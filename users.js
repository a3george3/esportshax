document.addEventListener("DOMContentLoaded", () => {
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
  async function fetchUsers() {
    const response = await fetch("/users");
    const users = await response.json();
    const userList = document.getElementById("userList");

    users.forEach((user) => {
      const li = document.createElement("li");
      li.classList.add("user-item");

      // Creăm un element pentru poza de profil
      const img = document.createElement("img");
      img.src = user.profilePic; // Calea pozei de profil
      img.alt = `${user.name}'s profile picture`;
      img.classList.add("profile-pic");

      const name = document.createElement("span");
      name.textContent = user.name;

      // Creăm un element pentru logo-ul echipei
      const logoImg = document.createElement("img");
      logoImg.src = user.logo || "path/to/default-logo.png"; // Calea logo-ului echipei sau o imagine implicită
      logoImg.alt = `${user.team_name} logo`;
      logoImg.classList.add("team-logo"); // Adăugăm o clasă pentru a stiliza imaginea logo-ului

      // Adăugăm elementele în lista
      li.appendChild(img);
      li.appendChild(name);
      li.appendChild(logoImg); // Adăugăm logo-ul echipei

      li.addEventListener("click", () => {
        window.location.href = `/profile.html?id=${user.id}`;
      });

      userList.appendChild(li);
    });
  }

  const menuToggle = document.getElementById("mobile-menu");
  const navLinks = document.getElementById("nav-links");
  menuToggle.addEventListener("click", function () {
    navLinks.classList.toggle("show");
  });

  fetchUsers();
});
