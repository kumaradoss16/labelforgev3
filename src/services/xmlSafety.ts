/**
 * XML and SVG Safety Utilities - Prevents Stored XSS
 */

export function escapeXml(value: string): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function validateHexColor(color: string, fallback = '#000000'): string {
  if (!color) return fallback;
  const hexRegex = /^#[0-9a-fA-F]{6}$/;
  if (hexRegex.test(color)) {
    return color;
  }
  return fallback;
}
