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

    function toggleTheme() {
        const currentTheme = root.getAttribute("data-theme") === DARK_THEME ? DARK_THEME : "light";
        const nextTheme = currentTheme === DARK_THEME ? "light" : DARK_THEME;
        applyTheme(nextTheme);
        localStorage.setItem(STORAGE_KEY, nextTheme);
    }

    function initializeTheme() {
        applyTheme(getSavedTheme());
    }

    function initializeThemeToggle() {
        const toggleButton = document.getElementById("themeToggle");
        if (!toggleButton) return;
        toggleButton.addEventListener("click", toggleTheme);
    }

    function initializeNavToggle() {
        const toggle = document.getElementById("navToggle");
        const header = document.getElementById("siteHeader");
        if (!toggle || !header) return;

        function close() {
            header.classList.remove("nav-open");
            toggle.setAttribute("aria-expanded", "false");
        }

        toggle.addEventListener("click", function (e) {
            e.stopPropagation();
            const isOpen = header.classList.toggle("nav-open");
            toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });

        // Close on any nav link click (handles SPA-style navigation)
        document.querySelectorAll(".main-nav a").forEach(function (link) {
            link.addEventListener("click", close);
        });

        // Close when clicking outside the header
        document.addEventListener("click", function (e) {
            if (!header.contains(e.target)) close();
        });

        // Close on Escape key
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") close();
        });
    }

    initializeTheme();
    document.addEventListener("DOMContentLoaded", function () {
        initializeThemeToggle();
        initializeNavToggle();
    });
})();