import { describe, expect, it } from "vitest";
import { cssFontFor, filterFonts, fontLabel, normalizeFontList, parsePostScriptName, weightFromStyle } from "./fonts";

describe("parsePostScriptName", () => {
  it("splits family and style", () => {
    expect(parsePostScriptName("Arial-BoldMT")).toEqual({ family: "Arial", style: "Bold" });
    expect(parsePostScriptName("Georgia-Italic")).toEqual({ family: "Georgia", style: "Italic" });
    expect(parsePostScriptName("CourierNewPS-BoldMT")).toEqual({ family: "Courier New", style: "Bold" });
    expect(parsePostScriptName("Impact")).toEqual({ family: "Impact", style: "Regular" });
    expect(parsePostScriptName("Arial-Black")).toEqual({ family: "Arial Black", style: "Regular" });
  });

  it("spaces out camel-case families", () => {
    expect(parsePostScriptName("SourceSansPro-Semibold").family).toBe("Source Sans Pro");
  });
});

describe("weightFromStyle", () => {
  it("maps common style names", () => {
    expect(weightFromStyle("Regular")).toBe(400);
    expect(weightFromStyle("Bold")).toBe(700);
    expect(weightFromStyle("SemiBold")).toBe(600);
    expect(weightFromStyle("ExtraBold Italic")).toBe(800);
    expect(weightFromStyle("Black")).toBe(900);
    expect(weightFromStyle("Light")).toBe(300);
    expect(weightFromStyle("ExtraLight")).toBe(200);
  });
});

describe("cssFontFor", () => {
  const installed = [{ postScriptName: "Montserrat-BlackItalic", family: "Montserrat", style: "Black Italic" }];

  it("prefers the installed entry", () => {
    expect(cssFontFor("Montserrat-BlackItalic", installed)).toEqual({
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 900,
      fontStyle: "italic",
    });
  });

  it("falls back to parsing the PostScript name", () => {
    expect(cssFontFor("Arial-BoldMT", [])).toEqual({ fontFamily: '"Arial", sans-serif', fontWeight: 700, fontStyle: "normal" });
  });

  it("labels fonts", () => {
    expect(fontLabel("Montserrat-BlackItalic", installed)).toBe("Montserrat Black Italic");
    expect(fontLabel("Impact", [])).toBe("Impact");
  });
});

describe("normalizeFontList / filterFonts", () => {
  const list = normalizeFontList([
    { postScriptName: "Roboto-Bold", family: "Roboto", style: "Bold" },
    { postScriptName: "Arial-BoldMT", family: "Arial", style: "Bold" },
    { postScriptName: "Roboto-Regular", family: "Roboto", style: "Regular" },
    { postScriptName: "Roboto-Bold", family: "Roboto", style: "Bold" },
  ]);

  it("dedupes and sorts by family then weight", () => {
    expect(list.map((f) => f.postScriptName)).toEqual(["Arial-BoldMT", "Roboto-Regular", "Roboto-Bold"]);
  });

  it("filters on every query word", () => {
    expect(filterFonts(list, "rob bold").map((f) => f.postScriptName)).toEqual(["Roboto-Bold"]);
    expect(filterFonts(list, "  ")).toHaveLength(3);
  });
});
