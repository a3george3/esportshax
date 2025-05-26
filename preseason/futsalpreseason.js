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
  const buttons = document.querySelectorAll(".show-fixtures-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", function () {
      const fixtures = this.nextElementSibling;
      fixtures.style.display =
        fixtures.style.display === "none" ? "block" : "none";
      this.textContent =
        fixtures.style.display === "none"
          ? "+ SHOW FIXTURES"
          : "- HIDE FIXTURES";
    });
  });

  const allGroups = document.querySelectorAll(".group-teams");

  allGroups.forEach((tableBody) => {
    const rows = Array.from(tableBody.querySelectorAll("tr"));

    // Sortează rândurile după numărul de puncte (ultima coloană)
    rows.sort((a, b) => {
      const ptsA = parseInt(a.cells[6].textContent);
      const ptsB = parseInt(b.cells[6].textContent);
      return ptsB - ptsA; // Sortare descrescătoare
    });

    // Actualizează ordinea rândurilor și numerotează pozițiile
    rows.forEach((row, index) => {
      row.cells[0].textContent = index + 1; // Actualizează coloana de poziție
      tableBody.appendChild(row); // Adaugă rândul în tabel
    });
  });
});
