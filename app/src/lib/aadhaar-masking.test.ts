import { describe, it, expect } from "vitest";
import {
  isRawAadhaar,
  maskAadhaar,
  isAlreadyMasked,
  processAadhaarField,
  containsRawAadhaar,
  sanitizeLogMessage,
  validateUAN,
  formatUAN,
} from "./aadhaar-masking";

describe("maskAadhaar", () => {
  it("masks a valid 12-digit number, with or without spaces", () => {
    expect(maskAadhaar("234567891234")).toBe("XXXX-XXXX-1234");
    expect(maskAadhaar("2345 6789 1234")).toBe("XXXX-XXXX-1234");
  });

  it("rejects numbers outside the UIDAI range or length", () => {
    expect(maskAadhaar("034567891234")).toBeNull(); // leading 0
    expect(maskAadhaar("134567891234")).toBeNull(); // leading 1
    expect(maskAadhaar("23456789123")).toBeNull(); // 11 digits
    expect(maskAadhaar("2345678912345")).toBeNull(); // 13 digits
    expect(maskAadhaar("not-an-aadhaar")).toBeNull();
  });
});

describe("isRawAadhaar / isAlreadyMasked", () => {
  it("detects raw numbers and tolerates surrounding whitespace", () => {
    expect(isRawAadhaar("234567891234")).toBe(true);
    expect(isRawAadhaar("  2345 6789 1234  ")).toBe(true);
    expect(isRawAadhaar("XXXX-XXXX-1234")).toBe(false);
    expect(isRawAadhaar("12345")).toBe(false);
  });

  it("detects already-masked values", () => {
    expect(isAlreadyMasked("XXXX-XXXX-1234")).toBe(true);
    expect(isAlreadyMasked("234567891234")).toBe(false);
  });
});

describe("processAadhaarField", () => {
  it("normalizes every input shape to masked-or-null (never raw)", () => {
    expect(processAadhaarField(null)).toBeNull();
    expect(processAadhaarField("")).toBeNull();
    expect(processAadhaarField("   ")).toBeNull();
    expect(processAadhaarField("XXXX-XXXX-1234")).toBe("XXXX-XXXX-1234");
    expect(processAadhaarField("234567891234")).toBe("XXXX-XXXX-1234");
    expect(processAadhaarField("garbage")).toBeNull();
  });
});

describe("log sanitization", () => {
  it("detects and redacts Aadhaar-like sequences", () => {
    expect(containsRawAadhaar("worker 234567891234 onboarded")).toBe(true);
    expect(containsRawAadhaar("worker XXXX-XXXX-1234 onboarded")).toBe(false);
    expect(sanitizeLogMessage("failed for 2345 6789 1234 today")).toBe(
      "failed for XXXX-XXXX-XXXX today"
    );
  });
});

describe("UAN helpers", () => {
  it("validates 12-digit UANs with or without separators", () => {
    expect(validateUAN("101239847102")).toBe(true);
    expect(validateUAN("1012-3984-7102")).toBe(true);
    expect(validateUAN("10123984710")).toBe(false);
    expect(validateUAN("10123984710A")).toBe(false);
  });

  it("formats into 4-4-4 groups, passing through bad input", () => {
    expect(formatUAN("101239847102")).toBe("1012-3984-7102");
    expect(formatUAN("short")).toBe("short");
  });
});
