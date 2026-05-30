import { describe, it, expect } from "vitest";
import { formatTime, formatDate, formatDisplayDate, formatPrice } from "../utils";

describe("formatTime", () => {
  it("trims seconds from HH:MM:SS", () => {
    expect(formatTime("09:00:00")).toBe("09:00");
    expect(formatTime("14:30:00")).toBe("14:30");
  });
});

describe("formatDate", () => {
  it("formats Date to YYYY-MM-DD with zero-padded month and day", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("formatDisplayDate", () => {
  it("returns a localized string containing the day number and year", () => {
    const result = formatDisplayDate("2026-06-15");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });
});

describe("formatPrice", () => {
  it("formats a CLP amount containing the number", () => {
    const result = formatPrice(25000);
    expect(result).toContain("25");
  });
});
