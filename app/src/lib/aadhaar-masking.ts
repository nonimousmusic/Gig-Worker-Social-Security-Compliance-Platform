/**
 * Aadhaar Masking Pipeline — DPDP Act 2023 & UIDAI Compliance
 * Raw 12-digit Aadhaar numbers are NEVER stored.
 * Only the last 4 digits are retained in format XXXX-XXXX-1234.
 */

const AADHAAR_REGEX = /^[2-9]\d{3}\s?\d{4}\s?\d{4}$/;
const AADHAAR_DETECT_REGEX = /[2-9]\d{3}\s?\d{4}\s?\d{4}/g;

export function isRawAadhaar(input: string): boolean {
  return AADHAAR_REGEX.test(input.trim());
}

export function maskAadhaar(rawInput: string): string | null {
  const cleaned = rawInput.replace(/\s/g, "").trim();
  if (cleaned.length !== 12) return null;
  if (!/^[2-9]\d{11}$/.test(cleaned)) return null;
  const lastFour = cleaned.slice(-4);
  return `XXXX-XXXX-${lastFour}`;
}

export function isAlreadyMasked(input: string): boolean {
  return /^XXXX-XXXX-\d{4}$/.test(input.trim());
}

export function processAadhaarField(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") return null;
  const trimmed = value.trim();
  if (isAlreadyMasked(trimmed)) return trimmed;
  if (isRawAadhaar(trimmed)) return maskAadhaar(trimmed);
  // If it doesn't match Aadhaar format, return null (invalid)
  return null;
}

export function containsRawAadhaar(text: string): boolean {
  return AADHAAR_DETECT_REGEX.test(text);
}

export function sanitizeLogMessage(message: string): string {
  return message.replace(AADHAAR_DETECT_REGEX, "XXXX-XXXX-XXXX");
}

export function validateUAN(uan: string): boolean {
  const cleaned = uan.replace(/[-\s]/g, "");
  return /^\d{12}$/.test(cleaned);
}

export function formatUAN(uan: string): string {
  const cleaned = uan.replace(/[-\s]/g, "");
  if (cleaned.length !== 12) return uan;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`;
}
