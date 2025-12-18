// Placeholder for client-side scripts (countdown, etc.)

// ===============================================
// SEARCH AUTOCOMPLETE
// ===============================================
(function initSearchAutocomplete() {
  const searchInput = document.getElementById("searchInput");
  const suggestionsBox = document.getElementById("searchSuggestions");

  console.log("🔍 Autocomplete initialized");
  console.log("searchInput:", searchInput);
  console.log("suggestionsBox:", suggestionsBox);

  if (!searchInput || !suggestionsBox) {
    console.warn("❌ Search elements not found!");
    return;
  }

  let debounceTimer;
  let currentFocus = -1;

  // Debounce function để tránh gọi API quá nhiều
  function debounce(func, delay) {
    return function (...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Fetch suggestions từ API
  async function fetchSuggestions(query) {
    console.log("🔎 Fetching suggestions for:", query);

    if (query.length < 1) {
      hideSuggestions();
      return;
    }

    try {
      const response = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      console.log("📦 API response:", data);

      if (data.success && data.suggestions && data.suggestions.length > 0) {
        displaySuggestions(data.suggestions);
      } else {
        console.log("❌ No suggestions found");
        hideSuggestions();
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      hideSuggestions();
    }
  }

  // Hiển thị suggestions
  function displaySuggestions(suggestions) {
    currentFocus = -1;

    const html = suggestions
      .map(
        (item, index) => `
      <a 
        href="${item.url}" 
        class="suggestion-item flex items-start gap-3 px-4 py-3 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-b-0"
        data-index="${index}"
      >
        <span class="text-teal-500 text-lg">🔍</span>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 truncate">
            ${highlightMatch(item.title, searchInput.value)}
          </div>
          ${
            item.category
              ? `<div class="text-xs text-gray-500 mt-0.5">📁 ${item.category}</div>`
              : ""
          }
        </div>
      </a>
    `
      )
      .join("");

    suggestionsBox.innerHTML = html;
    suggestionsBox.classList.remove("hidden");

    // Add event listeners to suggestions
    const suggestionItems = suggestionsBox.querySelectorAll(".suggestion-item");
    suggestionItems.forEach((item, index) => {
      item.addEventListener("mouseenter", () => {
        removeActiveClass();
        currentFocus = index;
        addActiveClass();
      });
    });
  }

  // Highlight matched text
  function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
    return text.replace(regex, '<span class="bg-yellow-200">$1</span>');
  }

  // Escape regex special characters
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Ẩn suggestions
  function hideSuggestions() {
    suggestionsBox.classList.add("hidden");
    suggestionsBox.innerHTML = "";
    currentFocus = -1;
  }

  // Add active class to current suggestion
  function addActiveClass() {
    const items = suggestionsBox.querySelectorAll(".suggestion-item");
    if (currentFocus >= 0 && currentFocus < items.length) {
      items[currentFocus].classList.add("bg-teal-100");
    }
  }

  // Remove active class from all suggestions
  function removeActiveClass() {
    const items = suggestionsBox.querySelectorAll(".suggestion-item");
    items.forEach((item) => item.classList.remove("bg-teal-100"));
  }

  // Event listeners
  searchInput.addEventListener(
    "input",
    debounce(function (e) {
      fetchSuggestions(e.target.value.trim());
    }, 300)
  );

  // Keyboard navigation (Arrow Up, Arrow Down, Enter, Escape)
  searchInput.addEventListener("keydown", function (e) {
    const items = suggestionsBox.querySelectorAll(".suggestion-item");

    if (e.key === "ArrowDown") {
      e.preventDefault();
      currentFocus++;
      if (currentFocus >= items.length) currentFocus = 0;
      removeActiveClass();
      addActiveClass();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      currentFocus--;
      if (currentFocus < 0) currentFocus = items.length - 1;
      removeActiveClass();
      addActiveClass();
    } else if (e.key === "Enter") {
      if (currentFocus > -1 && items[currentFocus]) {
        e.preventDefault();
        items[currentFocus].click();
      }
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  });

  // Click outside to close
  document.addEventListener("click", function (e) {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      hideSuggestions();
    }
  });

  // Focus to show suggestions again
  searchInput.addEventListener("focus", function () {
    if (this.value.trim().length >= 1) {
      fetchSuggestions(this.value.trim());
    }
  });
})();
