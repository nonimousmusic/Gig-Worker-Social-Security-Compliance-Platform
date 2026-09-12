/**
 * Registration-time validation utilities.
 *
 * Session management is delegated to Supabase Auth (cookie-based server
 * sessions). Email/password hashing is handled entirely by Supabase's
 * auth service - no local password storage.
 */

export function isWorkEmail(email: string): boolean {
  const blocked = [
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
    "aol.com", "icloud.com", "mail.com", "protonmail.com",
    "yandex.com", "rediffmail.com",
  ];
  const domain = email.split("@")[1]?.toLowerCase();
  return !blocked.includes(domain);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Minimum 8 characters required");
  if (!/[A-Z]/.test(password)) errors.push("At least 1 uppercase letter required");
  if (!/\d/.test(password)) errors.push("At least 1 digit required");
  return { valid: errors.length === 0, errors };
}
