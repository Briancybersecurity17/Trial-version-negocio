import { createContext, useContext, useState, useEffect } from "react";

export const THEMES = {
  naranja: {
    label: "Naranja",
    from: "#f97316",
    to: "#fbbf24",
    mid: "#fb923c",
    vars: {
      "--primary": "25 95% 53%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "25 95% 53%",
      "--sidebar-background": "22 40% 10%",
      "--sidebar-primary": "25 95% 53%",
      "--sidebar-accent": "25 30% 18%",
      "--sidebar-border": "25 25% 18%",
      "--sidebar-ring": "25 95% 53%",
      "--theme-from": "249 115 22",
      "--theme-to": "251 191 36",
    },
    sidebarBg: "linear-gradient(160deg, hsl(22 40% 10%) 0%, hsl(18 45% 7%) 50%, hsl(15 40% 5%) 100%)",
    heroGradient: "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)",
    glowColor: "rgba(249, 115, 22, 0.25)",
  },
  rosa: {
    label: "Rosa",
    from: "#ec4899",
    to: "#f0abfc",
    mid: "#f472b6",
    vars: {
      "--primary": "330 81% 60%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "330 81% 60%",
      "--sidebar-background": "330 40% 10%",
      "--sidebar-primary": "330 81% 60%",
      "--sidebar-accent": "330 30% 18%",
      "--sidebar-border": "330 25% 18%",
      "--sidebar-ring": "330 81% 60%",
      "--theme-from": "236 72 153",
      "--theme-to": "240 171 252",
    },
    sidebarBg: "linear-gradient(160deg, hsl(330 40% 10%) 0%, hsl(320 45% 7%) 50%, hsl(310 40% 5%) 100%)",
    heroGradient: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)",
    glowColor: "rgba(236, 72, 153, 0.25)",
  },
  rojo: {
    label: "Rojo",
    from: "#ef4444",
    to: "#f97316",
    mid: "#f87171",
    vars: {
      "--primary": "0 84% 60%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "0 84% 60%",
      "--sidebar-background": "0 40% 9%",
      "--sidebar-primary": "0 84% 60%",
      "--sidebar-accent": "0 30% 17%",
      "--sidebar-border": "0 25% 17%",
      "--sidebar-ring": "0 84% 60%",
      "--theme-from": "239 68 68",
      "--theme-to": "249 115 22",
    },
    sidebarBg: "linear-gradient(160deg, hsl(0 40% 9%) 0%, hsl(355 45% 6%) 50%, hsl(350 40% 4%) 100%)",
    heroGradient: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
    glowColor: "rgba(239, 68, 68, 0.25)",
  },
  azul: {
    label: "Azul",
    from: "#3b82f6",
    to: "#818cf8",
    mid: "#60a5fa",
    vars: {
      "--primary": "217 91% 60%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "217 91% 60%",
      "--sidebar-background": "222 40% 10%",
      "--sidebar-primary": "217 91% 60%",
      "--sidebar-accent": "222 30% 18%",
      "--sidebar-border": "222 25% 18%",
      "--sidebar-ring": "217 91% 60%",
      "--theme-from": "59 130 246",
      "--theme-to": "129 140 248",
    },
    sidebarBg: "linear-gradient(160deg, hsl(222 40% 10%) 0%, hsl(228 45% 7%) 50%, hsl(232 40% 5%) 100%)",
    heroGradient: "linear-gradient(135deg, #3b82f6 0%, #818cf8 100%)",
    glowColor: "rgba(59, 130, 246, 0.25)",
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem("app-color-theme") || "naranja"
  );

  const applyTheme = (themeName) => {
    const t = THEMES[themeName];
    if (!t) return;
    const root = document.documentElement;

    // Remove old theme classes
    Object.keys(THEMES).forEach((k) => root.classList.remove(`theme-${k}`));
    root.classList.add(`theme-${themeName}`);

    // Apply CSS vars
    Object.entries(t.vars).forEach(([k, v]) => {
      root.style.setProperty(k, v);
    });
  };

  const setTheme = (themeName) => {
    setThemeState(themeName);
    localStorage.setItem("app-color-theme", themeName);
    applyTheme(themeName);
  };

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, currentTheme: THEMES[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}