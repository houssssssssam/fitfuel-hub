import { useEffect, useState } from "react";

/**
 * Display units. Everything is stored in metric (kg, cm); this only changes
 * what the user sees and types.
 */
export type UnitSystem = "metric" | "imperial";

const STORAGE_KEY = "units";
const CHANGE_EVENT = "unitschange";
const KG_PER_LB = 0.45359237;
const CM_PER_INCH = 2.54;

export const getUnitSystem = (): UnitSystem => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
};

export const setUnitSystem = (system: UnitSystem) => {
  try {
    localStorage.setItem(STORAGE_KEY, system);
  } catch {
    // Storage can be unavailable (private mode); the in-memory event still updates open pages.
  }
  window.dispatchEvent(new CustomEvent<UnitSystem>(CHANGE_EVENT, { detail: system }));
};

export const useUnits = () => {
  const [system, setSystem] = useState<UnitSystem>(getUnitSystem);

  useEffect(() => {
    const handleChange = () => setSystem(getUnitSystem());
    window.addEventListener(CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  return system;
};

const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const weightUnit = (system: UnitSystem) => (system === "imperial" ? "lbs" : "kg");

/** kg -> number in the user's unit. */
export const toDisplayWeight = (kg: number, system: UnitSystem, decimals = 1) =>
  roundTo(system === "imperial" ? kg / KG_PER_LB : kg, decimals);

/** Number typed in the user's unit -> kg. */
export const fromDisplayWeight = (value: number, system: UnitSystem) =>
  system === "imperial" ? value * KG_PER_LB : value;

export const formatWeight = (kg: number, system: UnitSystem, decimals = 1) =>
  `${toDisplayWeight(kg, system, decimals).toLocaleString()} ${weightUnit(system)}`;

/** Large totals such as training volume: 12,345 kg -> "12.3K kg". */
export const formatVolume = (kg: number, system: UnitSystem) => {
  const value = toDisplayWeight(kg, system, 0);
  const text = value >= 1000 ? `${roundTo(value / 1000, 1)}K` : value.toLocaleString();
  return `${text} ${weightUnit(system)}`;
};

export const cmToFeetInches = (cm: number) => {
  const totalInches = cm / CM_PER_INCH;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
};

export const feetInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * CM_PER_INCH;

export const formatHeight = (cm: number, system: UnitSystem) => {
  if (system === "metric") return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
};
