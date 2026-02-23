import validator from 'validator';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_USERNAME_LENGTH = 30;
const MAX_ROOM_NAME_LENGTH = 100;

/**
 * Sanitize message content for XSS protection.
 * Escapes HTML entities and strips dangerous characters.
 */
export function sanitizeMessage(content: string): string {
  if (typeof content !== 'string') return '';
  const trimmed = validator.trim(content);
  return validator.escape(trimmed).slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Sanitize plain text (usernames, room names) - no HTML, trim.
 */
export function sanitizeText(text: string, maxLen = 100): string {
  if (typeof text !== 'string') return '';
  return validator.escape(validator.trim(text)).slice(0, maxLen);
}

/**
 * Sanitize for display - allows basic formatting but blocks scripts.
 */
export function sanitizeForDisplay(input: string): string {
  if (typeof input !== 'string') return '';
  return validator.escape(validator.trim(input));
}
