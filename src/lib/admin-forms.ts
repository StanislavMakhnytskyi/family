// Pure string<->array conversions shared by admin forms (textarea values on
// the way in, form-submitted strings on the way out) and their unit tests.

export function bioToTextareaValue(bio: string[] | undefined): string {
  return (bio ?? []).join("\n\n");
}

export function textareaValueToBio(value: string): string[] | undefined {
  const paragraphs = value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : undefined;
}

export function variantsToTextValue(variants: string[] | undefined): string {
  return (variants ?? []).join(", ");
}

export function textValueToVariants(value: string): string[] | undefined {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

// Person.birthDate/deathDate are stored as ISO ("1928-05-12") or a bare year
// ("1928") -- the public site's lifespan() relies on the stored value
// starting with the year (it slices the first 4 characters), so the stored
// format can't change. The admin form displays full dates as dd.mm.yyyy
// instead (the locally familiar format) purely at the UI boundary; a bare
// year passes through untouched either way.
export function isoDateToDisplayValue(stored: string): string {
  const match = stored.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return stored;
  const [, yyyy, mm, dd] = match;
  return `${dd}.${mm}.${yyyy}`;
}

export function displayValueToIsoDate(display: string): string {
  const trimmed = display.trim();
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return trimmed;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}
