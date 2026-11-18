import { useEffect } from "react";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

export type UserPreferences = {
  units: "metric" | "imperial";
  appLanguage: "en" | "fr";
  aiLanguage: "auto" | "en" | "fr";
  aiConfirmBeforeLog: boolean;
};

export const savePreferences = async (changes: Partial<UserPreferences>) => {
  const id = getStoredUser()?.id;
  if (!id) return null;
  const { data } = await api.put<{ preferences?: UserPreferences }>(`/api/profile/${id}`, { preferences: changes });
  return data.preferences ?? null;
};

const SYNCED_LANGUAGE_KEY = "syncedAppLanguage";

const currentAppLanguage = (): "en" | "fr" =>
  (localStorage.getItem("language") || "en").startsWith("fr") ? "fr" : "en";

/**
 * Keeps the server's copy of the app language in sync, so FuelBot and the other
 * AI features can answer in the language the app is shown in.
 */
export const useSyncAppLanguage = () => {
  useEffect(() => {
    const sync = () => {
      const language = currentAppLanguage();
      if (localStorage.getItem(SYNCED_LANGUAGE_KEY) === language || !getStoredUser()?.id) return;
      void savePreferences({ appLanguage: language })
        .then(() => localStorage.setItem(SYNCED_LANGUAGE_KEY, language))
        .catch(() => undefined);
    };

    sync();
    window.addEventListener("languagechange", sync);
    return () => window.removeEventListener("languagechange", sync);
  }, []);
};
