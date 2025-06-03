function showSection(section) {
  document.getElementById("groups").style.display =
    section === "groups" ? "block" : "none";
  document.getElementById("ko").style.display =
    section === "ko" ? "block" : "none";
}

// Show group stage by default
window.onload = function () {
  showSection("groups");
};

function toggleMatches(button) {
  const matchesSection = button.nextElementSibling;
  const isVisible = matchesSection.style.display === "block";
  matchesSection.style.display = isVisible ? "none" : "block";
  button.textContent = isVisible ? "Show Group Matches" : "Hide Group Matches";
}
