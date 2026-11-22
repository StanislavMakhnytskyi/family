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

// Pure connectors -- "тарас і софія" and "тарас софія" name the same two
// people, so a stated connector word shouldn't be required to match, and
// its absence in a shorter user answer shouldn't fail the check either.
const ANSWER_STOPWORDS = new Set(["і", "та", "й", "and", "or"]);

/**
 * Splits an answer into its significant words: normalized, punctuation
 * (spaces, slashes, dashes, commas -- however a multi-word variant like
 * "тарас / софія" happens to separate its words) stripped out, stopword
 * connectors dropped.
 */
function tokenizeAnswer(value: string): string[] {
  return normalizeAnswer(value)
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !ANSWER_STOPWORDS.has(word));
}

/**
 * Whether a submitted gate answer matches one correct answer/variant.
 *
 * A single-word correct answer ("полтава") still requires an exact match --
 * unchanged from before. A multi-word correct answer ("тарас і софія",
 * "тарас / софія") instead requires every one of its significant words to
 * appear somewhere in what the user typed, in any order, alongside any
 * other words they added ("тарас і сестра софія" still matches "тарас і
 * софія"). This is deliberately lenient: the family gate is a
 * shared-knowledge check, not a security boundary, and an exact-string
 * requirement punished ordinary ways of phrasing an answer naming more
 * than one person/thing.
 */
export function isAnswerMatch(userAnswer: string, correctAnswer: string): boolean {
  const requiredWords = tokenizeAnswer(correctAnswer);
  if (requiredWords.length === 0) return false;
  if (requiredWords.length === 1) {
    return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
  }
  const userWords = new Set(tokenizeAnswer(userAnswer));
  return requiredWords.every((word) => userWords.has(word));
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
  showFullDates = false,
): string {
  const formatDate = (date: string | undefined) => {
    if (!date) return undefined;
    if (!showFullDates) return date.slice(0, 4);
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : date;
  };
  const birth = formatDate(birthDate);
  const death = formatDate(deathDate);
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return `${labels.born} ${birth}`;
  if (death) return `${labels.died} ${death}`;
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
