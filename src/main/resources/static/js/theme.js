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

        function closeAllDropdowns() {
            header.querySelectorAll(".nav-dropdown.open").forEach(function (dd) {
                dd.classList.remove("open");
                const btn = dd.querySelector(".nav-dropdown-trigger");
                if (btn) btn.setAttribute("aria-expanded", "false");
            });
        }

        function closeNav() {
            header.classList.remove("nav-open");
            toggle.setAttribute("aria-expanded", "false");
            closeAllDropdowns();
        }

        function isMobileNav() {
            return window.getComputedStyle(toggle).display !== "none";
        }

        toggle.addEventListener("click", function (e) {
            e.stopPropagation();
            const isOpen = header.classList.toggle("nav-open");
            toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
            if (!isOpen) closeAllDropdowns();
        });

        // Dropdown trigger clicks — handle both mobile (accordion) and desktop (click-to-toggle)
        header.querySelectorAll(".nav-dropdown-trigger").forEach(function (btn) {
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                const dd = btn.closest(".nav-dropdown");

                if (isMobileNav()) {
                    // Mobile: accordion — close siblings, toggle this one
                    const isOpen = dd.classList.contains("open");
                    closeAllDropdowns();
                    if (!isOpen) {
                        dd.classList.add("open");
                        btn.setAttribute("aria-expanded", "true");
                    }
                } else {
                    // Desktop: CSS hover handles visuals; JS tracks aria state only
                    const isOpen = dd.classList.contains("open");
                    closeAllDropdowns();
                    if (!isOpen) {
                        dd.classList.add("open");
                        btn.setAttribute("aria-expanded", "true");
                    }
                }
            });
        });

        // Close on any nav link click
        header.querySelectorAll(".main-nav a").forEach(function (link) {
            link.addEventListener("click", closeNav);
        });

        // Close when clicking outside the header
        document.addEventListener("click", function (e) {
            if (!header.contains(e.target)) {
                closeNav();
            }
        });

        // Close on Escape key
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeNav();
        });

        // On desktop mouse-leave from a dropdown, clear the JS open class
        header.querySelectorAll(".nav-dropdown").forEach(function (dd) {
            dd.addEventListener("mouseleave", function () {
                if (!isMobileNav()) {
                    dd.classList.remove("open");
                    const btn = dd.querySelector(".nav-dropdown-trigger");
                    if (btn) btn.setAttribute("aria-expanded", "false");
                }
            });
        });
    }

    initializeTheme();
    document.addEventListener("DOMContentLoaded", function () {
        initializeThemeToggle();
        initializeNavToggle();
    });
})();