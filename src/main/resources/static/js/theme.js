(function () {
    const STORAGE_KEY = "theme";
    const DARK_THEME = "dark";
    const root = document.documentElement;

    function applyTheme(theme) {
        if (theme === DARK_THEME) {
            root.setAttribute("data-theme", DARK_THEME);
        } else {
            root.removeAttribute("data-theme");
        }
    }

    function getSavedTheme() {
        return localStorage.getItem(STORAGE_KEY) || "light";
    }

    function getToggleLabel(theme) {
        return theme === DARK_THEME ? "Light Mode" : "Dark Mode";
    }

    function updateToggleButton() {
        const toggleButton = document.getElementById("themeToggle");
        if (!toggleButton) {
            return;
        }

        const currentTheme = root.getAttribute("data-theme") === DARK_THEME ? DARK_THEME : "light";
        toggleButton.textContent = getToggleLabel(currentTheme);
    }

    function toggleTheme() {
        const currentTheme = root.getAttribute("data-theme") === DARK_THEME ? DARK_THEME : "light";
        const nextTheme = currentTheme === DARK_THEME ? "light" : DARK_THEME;

        applyTheme(nextTheme);
        localStorage.setItem(STORAGE_KEY, nextTheme);
        updateToggleButton();
    }

    function initializeTheme() {
        const savedTheme = getSavedTheme();
        applyTheme(savedTheme);
    }

    function initializeThemeToggle() {
        const toggleButton = document.getElementById("themeToggle");
        if (!toggleButton) {
            return;
        }

        updateToggleButton();
        toggleButton.addEventListener("click", toggleTheme);
    }

    initializeTheme();
    document.addEventListener("DOMContentLoaded", initializeThemeToggle);
})();