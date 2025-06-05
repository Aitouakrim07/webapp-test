"use client";

import { IconMoon } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export default function DarkModeIcon() {
  const [darkMode, setDarkMode] = useState(false);

  // Initialize dark mode based on localStorage
  // This will run only once when the component mounts
  // and will set the initial state based on the stored value
  // If no value is stored, it defaults to false (light mode)
  useEffect(() => {
    const initialMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(initialMode);
  }, []);

  // Update the document's data attribute and localStorage whenever darkMode changes
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-bs-theme",
      darkMode ? "dark" : "light"
    );
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  return (
    <div className="nav-item me-2">
      <button onClick={() => setDarkMode(!darkMode)} className="nav-link px-0">
        <IconMoon size={24} />
      </button>
    </div>
  );
}
