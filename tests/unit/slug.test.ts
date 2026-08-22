import { describe, expect, it } from "vitest";
import { slugifyName } from "@/lib/slug";

describe("slugifyName", () => {
  it("transliterates Ukrainian names to a Latin slug", () => {
    expect(slugifyName("Іван", "Петров")).toBe("ivan-petrov");
    expect(slugifyName("Іван", "Сідоров")).toBe("ivan-sidorov");
    expect(slugifyName("Ганна", "Ковальська")).toBe("hanna-kovalska");
    expect(slugifyName("Софія", "Ковальська")).toBe("sofiia-kovalska");
  });

  it("lowercases and strips apostrophes", () => {
    expect(slugifyName("В'ячеслав", "Кулик")).toBe("viacheslav-kulyk");
  });

  it("strips accents from Latin-script names", () => {
    expect(slugifyName("José", "Muñoz")).toBe("jose-munoz");
  });

  it("collapses whitespace and punctuation into single hyphens", () => {
    expect(slugifyName("Анна-Марія", "Де ла Круз")).toBe("anna-mariia-de-la-kruz");
  });
});
