// Ukrainian Cyrillic -> Latin transliteration for auto-generating person ids
// from firstName/lastName (e.g. "Іван Петров" -> "ivan-petrov"). Kept simple
// and consistent rather than matching the official multi-context transliteration
// standard (which varies the mapping by position in the word) — what matters
// here is that the same name always produces the same id.
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ie",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  э: "e",
  ь: "",
  ю: "iu",
  я: "ia",
  "'": "",
  "’": "",
};

// Combining diacritical marks (U+0300-U+036F), left behind by
// String.prototype.normalize("NFD") on accented Latin letters (e.g. "é" ->
// "e" + U+0301) so non-Cyrillic names with accents also slugify cleanly.
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function transliterate(text: string): string {
  const withLatinLetters = text
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");
  return withLatinLetters.normalize("NFD").replace(COMBINING_DIACRITICS, "");
}

function slugifyPart(text: string): string {
  return transliterate(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "Іван Петров" -> "ivan-petrov" */
export function slugifyName(firstName: string, lastName: string): string {
  return [slugifyPart(firstName), slugifyPart(lastName)]
    .filter(Boolean)
    .join("-");
}
