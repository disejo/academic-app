import React, { useEffect, useState } from "react";
import Icon from '@mdi/react';
import { mdiWhiteBalanceSunny } from '@mdi/js';
import { mdiMoonWaxingCrescent } from '@mdi/js';


const THEME_KEY = "theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  // Prefer system theme if not set
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export default function ThemeToggleButton() {
  const [theme, setTheme] = useState(getInitialTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
      <button
        onClick={toggleTheme}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontSize: "1.8rem",
          color: theme === "dark" ? "#eee" : "#222",
        }}
        aria-label="Cambiar tema"
      >
        {theme === "dark" ? <Icon path={mdiMoonWaxingCrescent} size={1} />
 : <Icon path={mdiWhiteBalanceSunny} size={1} />}
      </button>
  );
}
