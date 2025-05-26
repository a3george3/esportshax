document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const authLink = document.getElementById("auth-link");
  const errorMessageElement = document.getElementById("error-message");

  // Verifică dacă există un token în localStorage
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const userId = localStorage.getItem("userId");

  if (token) {
    // Dacă utilizatorul este conectat, afișează "My Profile" și "Logout"
    if (authLink) {
      authLink.innerHTML = `
        <a href="profile.html?id=${userId}">My Profile</a>
        <a href="#" class="logout-button">Log-out, ${username}</a>
      `;

      // Adaugă un event listener pentru logout
      const logoutButton = authLink.querySelector(".logout-button");
      if (logoutButton) {
        logoutButton.addEventListener("click", (event) => {
          event.preventDefault();
          // Șterge token-ul și numele utilizatorului
          localStorage.removeItem("token");
          localStorage.removeItem("username");
          localStorage.removeItem("userId");
          alert("Deconectare reușită!"); // Afișează un mesaj de confirmare
          window.location.reload(); // Reîncarcă pagina pentru a actualiza starea
        });
      }
    }
  } else if (loginForm) {
    // Gestionează formularul de login
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = document.getElementById("name").value;
      const password = document.getElementById("password").value;

      try {
        // Trimite cererea de autentificare către server
        const response = await fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, password }),
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("token", data.token); // Stochează token-ul
          localStorage.setItem("username", data.name); // Stochează numele utilizatorului
          localStorage.setItem("userId", data.userId); // Stochează ID-ul utilizatorului

          console.log("Autentificare reușită. Redirecționează..."); // Debugging

          // Redirecționează utilizatorul către index.html
          window.location.href = "index.html"; // Redirecționează utilizatorul
        } else {
          const errorMessage = await response.text();
          errorMessageElement.textContent =
            errorMessage || "A apărut o eroare."; // Afișează mesajul de eroare
        }
      } catch (error) {
        console.error("Eroare la cererea de login:", error);
        errorMessageElement.textContent =
          "A apărut o eroare la cererea de login."; // Afișează mesajul de eroare
      }
    });
  }
});
