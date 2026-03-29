import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  useEffect(() => {
    let keySequence = "";
    let sequenceTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore tracking completely if user is typing dynamically natively inside inputs/textareas
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape") {
          e.target.blur();
        }
        return;
      }

      // Show modal generic intercept
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      // Generic Close Escape bounds
      if (e.key === "Escape") {
        setShowShortcutsModal(false);
        return;
      }

      // Global Navigation Sequence Mapping (Tracking 'g' + literal route)
      keySequence += e.key.toLowerCase();

      if (keySequence === "gd") { navigate("/dashboard"); keySequence = ""; }
      else if (keySequence === "gf") { navigate("/food-tracking"); keySequence = ""; }
      else if (keySequence === "gw") { navigate("/workouts"); keySequence = ""; }
      else if (keySequence === "gm") { navigate("/meal-suggestions"); keySequence = ""; }
      else if (keySequence === "gp") { navigate("/profile"); keySequence = ""; }

      // Clear memory array string dynamically
      clearTimeout(sequenceTimeout);
      sequenceTimeout = setTimeout(() => {
        keySequence = "";
      }, 1000);

      // Unique absolute Search context mapping
      if (e.key === "/" && window.location.pathname.includes("/food-tracking")) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement || document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return { showShortcutsModal, setShowShortcutsModal };
};
