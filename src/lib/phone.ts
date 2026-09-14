/**
 * Phone Number Utilities for AsthmaGuard
 * Handles phone formatting, validation, and sanitization for Ghana SMS / Arkesel
 */

/**
 * Determines the maximum allowed character length based on phone number format:
 * - Ghana country code format (+233...): '+' + 12 digits (233 + 9 digits) = 13 characters max
 * - General international format (+...): '+' + 15 digits (E.164 standard) = 16 characters max
 * - Ghana 12-digit format without '+' (233...): 12 digits max
 * - Standard local 10-digit number (0...): 10 digits max (e.g. 0201012020)
 * - Default / fallback: 10 digits max
 */
export function getMaxPhoneLength(value: string): number {
  if (value.startsWith('+233')) return 13;
  if (value.startsWith('+')) return 16;
  if (value.startsWith('233')) return 12;
  if (value.startsWith('0')) return 10;
  return 10;
}

/**
 * Sanitizes phone input on the fly:
 * - Only numbers (0-9) are allowed
 * - A '+' symbol is allowed, but ONLY at the very beginning (index 0)
 * - Restricts length strictly so user cannot type or paste more than the required number of digits:
 *     * Local format (0...): max 10 digits
 *     * Ghana code format (+233...): max 13 characters (+233 + 9 digits)
 *     * Ghana code without '+' (233...): max 12 digits
 *     * Other international (+...): max 16 characters (+ and 15 digits)
 *     * Default: max 10 digits
 * All other characters (letters, symbols, spaces) are stripped.
 */
export function sanitizePhoneInput(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (hasLeadingPlus) {
    const maxDigits = digits.startsWith('233') ? 12 : 15;
    return `+${digits.slice(0, maxDigits)}`;
  }

  if (digits.startsWith('0')) {
    return digits.slice(0, 10);
  }

  if (digits.startsWith('233')) {
    return digits.slice(0, 12);
  }

  return digits.slice(0, 10);
}

/**
 * Handles keyboard input to block non-digits, prevent '+' anywhere except index 0,
 * and prevent typing more than the allowed maximum digits/characters for the format.
 */
export function handlePhoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  // Allow control and navigation keys
  if (
    e.key === 'Backspace' ||
    e.key === 'Delete' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight' ||
    e.key === 'Tab' ||
    e.key === 'Enter' ||
    e.ctrlKey ||
    e.metaKey
  ) {
    return;
  }

  const input = e.currentTarget;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;

  // Allow '+' ONLY at the very beginning if not already present
  if (e.key === '+') {
    if (start === 0 && !input.value.includes('+')) {
      return;
    }
    e.preventDefault();
    return;
  }

  // Allow digits 0-9 if within allowed maximum length
  if (/^[0-9]$/.test(e.key)) {
    const nextValue = input.value.slice(0, start) + e.key + input.value.slice(end);
    const maxLen = getMaxPhoneLength(nextValue);

    if (nextValue.length > maxLen) {
      e.preventDefault();
      return;
    }
    return;
  }

  // Block any other key (letters, punctuation, spaces, etc.)
  e.preventDefault();
}

/**
 * Formats a phone number for storage and SMS messages:
 * If entered as local Ghana format like '0201012020' (10 digits starting with 0),
 * it formats it to '+233201012020' (international E.164 format ready for SMS).
 * Also handles '233201012020' -> '+233201012020', '201012020' -> '+233201012020',
 * and preserves any international number already starting with '+'.
 */
export function formatPhoneNumberForStorage(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();

  // If already starts with '+', keep '+' and strip non-digits
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    // If user typed '+0XXXXXXXXX' (10 digits starting with 0)
    if (digits.startsWith('0') && digits.length === 10) {
      return `+233${digits.substring(1)}`;
    }
    return `+${digits}`;
  }

  const digits = trimmed.replace(/\D/g, '');

  // Local Ghana 10-digit number starting with '0' (e.g., '0201012020')
  if (digits.startsWith('0') && digits.length === 10) {
    return `+233${digits.substring(1)}`;
  }

  // Ghana number without leading '+' but starting with '233' (12 digits)
  if (digits.startsWith('233') && digits.length === 12) {
    return `+${digits}`;
  }

  // Ghana local number without leading '0' (9 digits, e.g., '201012020')
  if (digits.length === 9) {
    return `+233${digits}`;
  }

  // Default: if non-empty, ensure it starts with '+'
  return digits ? `+${digits}` : '';
}

