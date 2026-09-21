import { describe, expect, it } from "vitest";
import { idPrefixes } from "./idPrefixes";

describe("idPrefixes.fromTitle", () => {
  it("abbreviates a one-word title to the first letter plus consonants, up to 3", () => {
    expect(idPrefixes.fromTitle("Property", new Set())).toBe("prp");
    expect(idPrefixes.fromTitle("Unit", new Set())).toBe("unt");
    expect(idPrefixes.fromTitle("Household", new Set())).toBe("hsh");
  });

  it("takes the first letter of each word and tops up from the last word's consonants to 3", () => {
    expect(idPrefixes.fromTitle("Occupancy Terms", new Set())).toBe("otr");
  });

  it("keeps a title shorter than 3 consonants", () => {
    expect(idPrefixes.fromTitle("Id", new Set())).toBe("id");
  });

  it("steps up with the next consonant on a collision, then a number suffix", () => {
    expect(idPrefixes.fromTitle("Property", new Set(["prp"]))).toBe("prpr");
    expect(
      idPrefixes.fromTitle(
        "Property",
        new Set(["prp", "prpr", "prprt", "prprty"]),
      ),
    ).toBe("prp2");
    expect(
      idPrefixes.fromTitle(
        "Property",
        new Set(["prp", "prpr", "prprt", "prprty", "prp2"]),
      ),
    ).toBe("prp3");
  });

  it("uses s plus a number suffix when the title has no letters", () => {
    expect(idPrefixes.fromTitle("2024", new Set())).toBe("s");
    expect(idPrefixes.fromTitle("2024", new Set(["s"]))).toBe("s2");
  });

  it("drops punctuation and digits before abbreviating", () => {
    expect(idPrefixes.fromTitle("Unit-2B!", new Set())).toBe("unt");
  });

  it("returns only lowercase letters and digits", () => {
    const prefixes = [
      idPrefixes.fromTitle("Property", new Set()),
      idPrefixes.fromTitle("Occupancy Terms", new Set()),
      idPrefixes.fromTitle("2024", new Set(["s"])),
      idPrefixes.fromTitle("Unit-2B!", new Set()),
      idPrefixes.fromTitle(
        "Property",
        new Set(["prp", "prpr", "prprt", "prprty"]),
      ),
    ];
    prefixes.forEach((prefix) => {
      expect(prefix).toMatch(/^[a-z0-9]+$/);
    });
  });
});
