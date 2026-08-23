import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replaceAll("є", "е")
    .replaceAll("ї", "і");
}

export function initials(firstName: string, lastName?: string): string {
  return [firstName, lastName]
    .filter((part): part is string => !!part)
    .map((part) => `${part.charAt(0)}.`)
    .join("")
    .toUpperCase();
}

export function pickRandomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function lifespan(
  birthDate: string | undefined,
  deathDate: string | undefined,
  labels: { born: string; died: string },
): string {
  const birthYear = birthDate?.slice(0, 4);
  const deathYear = deathDate?.slice(0, 4);
  if (birthYear && deathYear) return `${birthYear} – ${deathYear}`;
  if (birthYear) return `${labels.born} ${birthYear}`;
  if (deathYear) return `${labels.died} ${deathYear}`;
  return "";
}

export function formatCoords(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;
}

// 0.3 kept the tree from ever fitting a whole large/wide family on a narrow
// mobile viewport, since fit-to-screen couldn't zoom out past this floor.
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 2;

export function clampZoom(
  scale: number,
  min: number = ZOOM_MIN,
  max: number = ZOOM_MAX,
): number {
  return Math.min(max, Math.max(min, scale));
}
