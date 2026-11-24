import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const stored = localStorage.getItem("usef_tse_theme");
      if (stored === "light" || stored === "dark") return stored;
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersLight && !prefersDark) return "light";
    } catch {}
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    const themeColorMeta = document.getElementById("theme-color-meta");
    if (theme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      if (themeColorMeta) themeColorMeta.setAttribute("content", "#090a10");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      if (themeColorMeta) themeColorMeta.setAttribute("content", "#edf2f6");
    }
    try {
      localStorage.setItem("usef_tse_theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
