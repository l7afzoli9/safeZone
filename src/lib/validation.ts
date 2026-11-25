/**
 * Validates Moroccan mobile phone numbers:
 * Accepted formats:
 * - 06XXXXXXXX or 07XXXXXXXX
 * - +2126XXXXXXXX or +2127XXXXXXXX (with optional spaces, dashes, or leading 00212)
 */
export function normalizeMoroccanPhone(raw: string): string {
  const cleaned = raw.replace(/[\s().-]/g, '');
  if (cleaned.startsWith('00212')) {
    return `+212${cleaned.slice(5)}`;
  }
  if (cleaned.startsWith('+2120')) {
    return `+212${cleaned.slice(5)}`;
  }
  if (cleaned.startsWith('+212')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return `+212${cleaned.slice(1)}`;
  }
  return cleaned;
}

export function isValidMoroccanPhone(raw: string): boolean {
  const normalized = normalizeMoroccanPhone(raw);
  return /^\+212[67]\d{8}$/.test(normalized);
}

export function formatMoroccanPhoneDisplay(raw: string): string {
  const n = normalizeMoroccanPhone(raw);
  if (!/^\+212[67]\d{8}$/.test(n)) return raw;
  const local = n.slice(4); // 9 digits starting with 6 or 7
  return `+212 ${local[0]} ${local.slice(1, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
}

export function validateContactForm(name: string, phone: string): {
  nameErrorKey: string | null;
  phoneErrorKey: string | null;
} {
  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();

  let nameErrorKey: string | null = null;
  if (!trimmedName) {
    nameErrorKey = 'contacts.errors.nameRequired';
  } else if (trimmedName.length < 2) {
    nameErrorKey = 'contacts.errors.nameTooShort';
  }

  let phoneErrorKey: string | null = null;
  if (!trimmedPhone) {
    phoneErrorKey = 'contacts.errors.phoneRequired';
  } else if (!isValidMoroccanPhone(trimmedPhone)) {
    phoneErrorKey = 'contacts.errors.phoneInvalid';
  }

  return { nameErrorKey, phoneErrorKey };
}
