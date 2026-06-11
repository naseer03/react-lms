/**
 * Converts a hex color to [h, s, l] (degrees, %, %).
 */
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Converts HSL values (degrees, %, %) to a hex string like "#rrggbb".
 */
function hslToHex(h, s, l) {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Given a single brand hex (e.g. "#4f46e5"), generates a full Tailwind-style
 * shade palette {50, 100, 200, 300, 400, 500, 600, 700, 800, 900}.
 * The provided hex is used as shade 600 (the main interactive color).
 */
export function generateShades(hex) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  const [h, s] = hexToHsl(hex);
  const cap = (v, max = 100) => Math.min(v, max);

  return {
    50:  hslToHex(h, cap(s * 0.3),    97),
    100: hslToHex(h, cap(s * 0.4),    94),
    200: hslToHex(h, cap(s * 0.6),    88),
    300: hslToHex(h, cap(s * 0.75),   78),
    400: hslToHex(h, cap(s * 0.9),    65),
    500: hslToHex(h, cap(s),          55),
    600: hex,                          // brand base
    700: hslToHex(h, cap(s + 5),      38),
    800: hslToHex(h, cap(s + 8),      30),
    900: hslToHex(h, cap(s + 10),     22),
  };
}

/**
 * Injects all primary shade variables into :root so Tailwind's
 * var(--color-primary-*) utilities reflect the new brand color instantly.
 */
export function applyPrimaryColor(hex) {
  const shades = generateShades(hex);
  if (!shades) return;
  const root = document.documentElement;
  Object.entries(shades).forEach(([shade, color]) => {
    root.style.setProperty(`--color-primary-${shade}`, color);
  });
}
