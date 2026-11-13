// The profile badge (#94): a pattern painted in two colors, like a club crest.
// We store ids ("navy"), not hex codes, so the server can validate against a
// short list and we can retune a color later without migrating saved badges.

export const BADGE_PATTERNS = [
  "solid",
  "border",
  "half-h",
  "half-v",
  "band-h",
  "band-v",
  "hoops",
  "stripes",
  "quarters",
  "checks",
  "cross",
  "saltire",
  "sash",
] as const;

export type BadgePattern = (typeof BADGE_PATTERNS)[number];

// Labels double as the screen reader text, so they describe the shape.
export const PATTERN_LABELS: Record<BadgePattern, string> = {
  solid: "solid",
  border: "border",
  "half-h": "top and bottom halves",
  "half-v": "left and right halves",
  "band-h": "horizontal band",
  "band-v": "vertical band",
  hoops: "hoops",
  stripes: "stripes",
  quarters: "quarters",
  checks: "checks",
  cross: "cross",
  saltire: "diagonal cross",
  sash: "sash",
};

// Clear but not neon: brighter than muted, softer than pure primaries.
// Ids never change (saved badges use them); only hex can.
export const BADGE_COLORS = {
  purple: { hex: "#9466c9", label: "purple" },
  navy: { hex: "#34447a", label: "navy" },
  sky: { hex: "#8cc2e8", label: "sky blue" },
  green: { hex: "#4f9a5c", label: "green" },
  gold: { hex: "#e3b94f", label: "gold" },
  orange: { hex: "#e08a4f", label: "orange" },
  red: { hex: "#c9504a", label: "red" },
  maroon: { hex: "#82343f", label: "maroon" },
  silver: { hex: "#b6bcc6", label: "silver" },
  white: { hex: "#f6f4ef", label: "white" },
  black: { hex: "#232228", label: "black" },
} as const;

export type BadgeColor = keyof typeof BADGE_COLORS;

export type Badge = {
  pattern: BadgePattern;
  primary: BadgeColor;
  secondary: BadgeColor;
};

// What everyone has until they customize: a calm take on the app's purple.
export const DEFAULT_BADGE: Badge = {
  pattern: "solid",
  primary: "purple",
  secondary: "white",
};

// Saved data (localStorage now, the API later) is untrusted, so check its
// shape before using it. The backend will need the same rule.
export function isBadge(value: unknown): value is Badge {
  if (typeof value !== "object" || value === null) return false;
  const { pattern, primary, secondary } = value as Record<string, unknown>;
  return (
    (BADGE_PATTERNS as readonly unknown[]).includes(pattern) &&
    typeof primary === "string" &&
    primary in BADGE_COLORS &&
    typeof secondary === "string" &&
    secondary in BADGE_COLORS
  );
}

// "Red and navy stripes", for aria-labels. Solid only uses one color.
export function describeBadge({ pattern, primary, secondary }: Badge): string {
  const first = BADGE_COLORS[primary].label;
  if (pattern === "solid") return `Solid ${first}`;
  const name = `${first} and ${BADGE_COLORS[secondary].label} ${PATTERN_LABELS[pattern]}`;
  return name[0].toUpperCase() + name.slice(1);
}
