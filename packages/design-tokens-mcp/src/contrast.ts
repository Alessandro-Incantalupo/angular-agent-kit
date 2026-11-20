/**
 * WCAG 2 contrast ratio between two sRGB colours.
 * Relative luminance and ratio follow https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 * and https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** True for `#rgb` and `#rrggbb`. Colours with alpha are refused: their contrast depends on what is behind them. */
export function isHexColor(value: string): boolean {
  return HEX.test(value.trim());
}

export function parseHex(value: string): Rgb {
  const hex = value.trim();
  if (!HEX.test(hex)) throw new Error(`"${value}" is not a #rgb or #rrggbb colour.`);
  const digits =
    hex.length === 4
      ? [...hex.slice(1)].map((d) => d + d)
      : [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)];
  const [r, g, b] = digits.map((d) => Number.parseInt(d, 16)) as [number, number, number];
  return { r, g, b };
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Ratio from 1 to 21, unrounded. Order of the two colours does not matter. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}
