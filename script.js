const form = document.getElementById("lyricsForm");
const artistInput = document.getElementById("artistInput");
const titleInput = document.getElementById("titleInput");
const status = document.getElementById("status");
const lyricsOutput = document.getElementById("lyricsOutput");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const artist = artistInput.value.trim();
  const title = titleInput.value.trim();

  if (!artist || !title) {
    status.textContent = "Both artist and title are required.";
    return;
  }

  status.textContent = "Fetching lyrics...";
  lyricsOutput.textContent = "";

  try {
    const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (!response.ok) {
      throw new Error("Lyrics not found.");
    }

    const data = await response.json();
    if (!data.lyrics) {
      throw new Error("No lyrics returned.");
    }

    lyricsOutput.textContent = data.lyrics.trim();
    status.textContent = `Lyrics loaded for "${title}" by ${artist}.`;
  } catch (error) {
    status.textContent = error.message || "Unable to load lyrics.";
    lyricsOutput.textContent = "";
  }
});
