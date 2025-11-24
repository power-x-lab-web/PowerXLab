function loadJoinSection(elementId, sourcePath) {
  const target = document.getElementById(elementId);
  if (!target) return;

  fetch(sourcePath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.text();
    })
    .then((text) => {
      const content = text.trim();
      target.textContent = content || "Details coming soon.";
    })
    .catch(() => {
      target.textContent = "Unable to load details right now.";
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const sections = [
    { id: "postdoc-content", path: "../Resources/JoinUS/postdoc_info.txt" },
    { id: "graduate-content", path: "../Resources/JoinUS/graduate_info.txt" },
    { id: "bachelor-content", path: "../Resources/JoinUS/bachelor_info.txt" },
  ];

  sections.forEach(({ id, path }) => loadJoinSection(id, path));
});
