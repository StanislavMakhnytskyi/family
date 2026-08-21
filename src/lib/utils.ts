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

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}.${lastName.charAt(0)}.`.toUpperCase();
}

export function pickRandomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function lifespan(birthDate: string, deathDate?: string): string {
  const birthYear = birthDate.slice(0, 4);
  if (!deathDate) return `нар. ${birthYear}`;
  return `${birthYear} – ${deathDate.slice(0, 4)}`;
}

export function formatCoords(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;
}
