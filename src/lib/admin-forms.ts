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
