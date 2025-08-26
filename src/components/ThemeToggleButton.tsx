import React, { useEffect, useState } from "react";
import Icon from '@mdi/react';
import { mdiWhiteBalanceSunny } from '@mdi/js';
import { mdiMoonWaxingCrescent } from '@mdi/js';

const THEME_KEY = "theme";

export default function ThemeToggleButton() {
  const [theme, setTheme] = useState("light"); // Estado inicial simple
  const [mounted, setMounted] = useState(false); // Para controlar la hidratación

  useEffect(() => {
    // Marcar como montado
    setMounted(true);
    
    // Obtener el tema inicial después del montaje
    const getInitialTheme = () => {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "dark" || stored === "light") return stored;
      
      // Preferir tema del sistema si no está configurado
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
      return "light";
    };

    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  useEffect(() => {
    // Solo ejecutar después del montaje inicial
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // No renderizar hasta que el componente esté montado
  if (!mounted) {
     return <div style={{ width: "1.8rem", height: "1.8rem" }}></div>;
  }

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
    {theme === "dark" ? 
      <Icon path={mdiMoonWaxingCrescent} size={1} /> : 
      <Icon path={mdiWhiteBalanceSunny} size={1} />
    }
    </button>
  );
}