const form = document.getElementById("lyricsForm");
const artistInput = document.getElementById("artistInput");
const titleInput = document.getElementById("titleInput");
const artistSuggestionsList = document.getElementById("artistSuggestions");
const titleSuggestionsList = document.getElementById("titleSuggestions");
const status = document.getElementById("status");
const lyricsOutput = document.getElementById("lyricsOutput");

const artistCache = new Map();
const titleCache = new Map();
const fallbackArtists = [
  "Adele",
  "Taylor Swift",
  "The Beatles",
  "Drake",
  "Billie Eilish",
  "Ed Sheeran",
  "Beyoncé",
  "Queen",
  "Coldplay",
  "Elton John",
];
const fallbackSongs = [
  "Hello",
  "Shape of You",
  "Blinding Lights",
  "Bad Guy",
  "Bohemian Rhapsody",
  "Someone Like You",
  "Rolling in the Deep",
  "Yellow",
  "Halo",
  "Thinking Out Loud",
];
const minQueryLength = 2;

function debounce(fn, delay = 250) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function clearSuggestions(listEl, inputEl) {
  listEl.innerHTML = "";
  listEl.hidden = true;
  inputEl.setAttribute("aria-expanded", "false");
  inputEl.removeAttribute("aria-activedescendant");
}

function setActiveSuggestion(listEl, activeIndex, inputEl) {
  const items = Array.from(listEl.querySelectorAll(".suggestion-item"));
  if (!items.length) {
    inputEl.removeAttribute("aria-activedescendant");
    return;
  }

  items.forEach((item, index) => {
    const selected = index === activeIndex;
    item.setAttribute("aria-selected", selected ? "true" : "false");
    if (selected) {
      inputEl.setAttribute("aria-activedescendant", item.id);
      item.scrollIntoView({ block: "nearest" });
    }
  });
}

function renderSuggestions(listEl, suggestions, inputEl, type) {
  if (!suggestions.length) {
    clearSuggestions(listEl, inputEl);
    return;
  }

  listEl.innerHTML = suggestions
    .map((item, index) => {
      const safeId = `${type}-suggestion-${index}`;
      return `<li id="${safeId}" class="suggestion-item" role="option" tabindex="-1">${item}</li>`;
    })
    .join("");

  listEl.hidden = false;
  inputEl.setAttribute("aria-expanded", "true");
  setActiveSuggestion(listEl, -1, inputEl);
}

function selectSuggestion(value, inputEl, listEl) {
  inputEl.value = value;
  clearSuggestions(listEl, inputEl);
}

function filterFallback(items, query) {
  const lowerQuery = query.toLowerCase();
  const matches = items.filter((item) => item.toLowerCase().includes(lowerQuery));
  return matches.length ? matches.slice(0, 10) : items.slice(0, 10);
}

async function fetchSuggestions(type, query) {
  const encoded = encodeURIComponent(query);
  const url = type === "artist"
    ? `https://itunes.apple.com/search?term=${encoded}&entity=musicArtist&attribute=artistTerm&limit=10`
    : `https://itunes.apple.com/search?term=${encoded}&entity=musicTrack&attribute=songTerm&limit=12`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Suggestion fetch failed.");
  }

  const data = await response.json();
  const items = type === "artist"
    ? [...new Set(data.results.map((result) => result.artistName).filter(Boolean))]
    : [...new Set(data.results.map((result) => result.trackName).filter(Boolean))];

  return items.slice(0, 10);
}

async function getSuggestions(type, query) {
  const cache = type === "artist" ? artistCache : titleCache;
  const normalized = query.toLowerCase();
  if (cache.has(normalized)) {
    return cache.get(normalized);
  }

  try {
    const suggestions = await fetchSuggestions(type, query);
    const result = suggestions.length ? suggestions : filterFallback(type === "artist" ? fallbackArtists : fallbackSongs, query);
    cache.set(normalized, result);
    return result;
  } catch {
    const result = filterFallback(type === "artist" ? fallbackArtists : fallbackSongs, query);
    cache.set(normalized, result);
    return result;
  }
}

function attachAutocomplete(inputEl, listEl, type) {
  inputEl.addEventListener("input", debounce(async (event) => {
    const query = event.target.value.trim();
    if (query.length < minQueryLength) {
      clearSuggestions(listEl, inputEl);
      return;
    }

    const suggestions = await getSuggestions(type, query);
    renderSuggestions(listEl, suggestions, inputEl, type);
  }, 250));

  inputEl.addEventListener("keydown", (event) => {
    if (listEl.hidden) {
      return;
    }

    const items = Array.from(listEl.querySelectorAll(".suggestion-item"));
    if (!items.length) {
      return;
    }

    const activeIndex = items.findIndex((item) => item.getAttribute("aria-selected") === "true");
    let nextIndex = activeIndex;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
      setActiveSuggestion(listEl, nextIndex, inputEl);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      nextIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
      setActiveSuggestion(listEl, nextIndex, inputEl);
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(items[activeIndex].textContent, inputEl, listEl);
    }

    if (event.key === "Escape") {
      clearSuggestions(listEl, inputEl);
    }
  });

  listEl.addEventListener("mousedown", (event) => {
    const option = event.target.closest(".suggestion-item");
    if (!option) {
      return;
    }

    selectSuggestion(option.textContent, inputEl, listEl);
  });

  inputEl.addEventListener("blur", () => {
    setTimeout(() => clearSuggestions(listEl, inputEl), 120);
  });
}

attachAutocomplete(artistInput, artistSuggestionsList, "artist");
attachAutocomplete(titleInput, titleSuggestionsList, "title");

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
