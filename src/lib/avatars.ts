// Twelve curated, modern avatars — diverse styles a real student would
// actually want to use. Rendered from DiceBear (no upload, no hosting), so
// the API stays tiny and the frontend stays fast.
//
// Styles in the mix:
//   • lorelei         — modern hand-drawn illustration
//   • avataaars       — friendly cartoon flat
//   • personas        — minimal flat, social-app vibe
//   • notionists-neutral — Notion's tasteful illustration look
//   • bottts-neutral  — clean robots for tech personalities
//
// Each avatar has a curated linear-gradient background and a label
// that's gender-neutral by default — the *grouping* is a soft hint, not
// an enforced category. Anyone can pick anything.

export type AvatarId =
  | "m1" | "m2" | "m3"
  | "f1" | "f2" | "f3"
  | "n1" | "n2" | "n3"
  | "t1" | "t2" | "t3";

export type AvatarTone = "masculine" | "feminine" | "neutral" | "tech";

type DicebearStyle =
  | "lorelei"
  | "avataaars"
  | "personas"
  | "notionists-neutral"
  | "bottts-neutral";

export interface PredefinedAvatar {
  id: AvatarId;
  label: string;
  /** Soft category hint — not enforced. */
  tone: AvatarTone;
  /** Short personality blurb shown on hover/long-press. */
  blurb: string;
  url: string;
}

function dicebear(style: DicebearStyle, seed: string, bg: string): string {
  return (
    `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}` +
    `&backgroundColor=${bg}&backgroundType=gradientLinear&radius=22`
  );
}

export const PREDEFINED_AVATARS: PredefinedAvatar[] = [
  // ── Masculine-leaning illustrations
  {
    id: "m1",
    label: "Aether",
    tone: "masculine",
    blurb: "Modern, illustrated",
    url: dicebear("lorelei", "aether-aiub", "b6e3f4,d1d4f9"),
  },
  {
    id: "m2",
    label: "Kai",
    tone: "masculine",
    blurb: "Cartoon, friendly",
    url: dicebear("avataaars", "kai-aiub", "c0aede,b6e3f4"),
  },
  {
    id: "m3",
    label: "Rio",
    tone: "masculine",
    blurb: "Minimal flat",
    url: dicebear("personas", "rio-aiub", "ffdfbf,d1d4f9"),
  },

  // ── Feminine-leaning illustrations
  {
    id: "f1",
    label: "Ava",
    tone: "feminine",
    blurb: "Modern, illustrated",
    url: dicebear("lorelei", "ava-aiub", "ffd5dc,c0aede"),
  },
  {
    id: "f2",
    label: "Mira",
    tone: "feminine",
    blurb: "Cartoon, friendly",
    url: dicebear("avataaars", "mira-aiub", "b6e3f4,ffd5dc"),
  },
  {
    id: "f3",
    label: "Nyra",
    tone: "feminine",
    blurb: "Minimal flat",
    url: dicebear("personas", "nyra-aiub", "c0aede,ffdfbf"),
  },

  // ── Neutral / creative — tasteful Notion-style illustration
  {
    id: "n1",
    label: "Atlas",
    tone: "neutral",
    blurb: "Notion-style",
    url: dicebear("notionists-neutral", "atlas-aiub", "b6e3f4,c0aede"),
  },
  {
    id: "n2",
    label: "River",
    tone: "neutral",
    blurb: "Notion-style",
    url: dicebear("notionists-neutral", "river-aiub", "ffd5dc,b6e3f4"),
  },
  {
    id: "n3",
    label: "Skye",
    tone: "neutral",
    blurb: "Notion-style",
    url: dicebear("notionists-neutral", "skye-aiub", "ffdfbf,c0aede"),
  },

  // ── Tech personalities — clean robotic identities
  {
    id: "t1",
    label: "Byte",
    tone: "tech",
    blurb: "For the builders",
    url: dicebear("bottts-neutral", "byte-aiub", "b6e3f4,c0aede"),
  },
  {
    id: "t2",
    label: "Lab",
    tone: "tech",
    blurb: "For the researchers",
    url: dicebear("bottts-neutral", "lab-aiub", "c0aede,d1d4f9"),
  },
  {
    id: "t3",
    label: "Core",
    tone: "tech",
    blurb: "For the systems folks",
    url: dicebear("bottts-neutral", "core-aiub", "ffdfbf,b6e3f4"),
  },
];

const AVATAR_BY_ID = new Map<string, PredefinedAvatar>(
  PREDEFINED_AVATARS.map((a) => [a.id, a]),
);

export function avatarUrlForId(id: string | null | undefined): string | null {
  if (!id) return null;
  return AVATAR_BY_ID.get(id)?.url ?? null;
}

export function isValidAvatarId(id: unknown): id is AvatarId {
  return typeof id === "string" && AVATAR_BY_ID.has(id);
}

export const AVATAR_TONES: { tone: AvatarTone; label: string }[] = [
  { tone: "masculine", label: "Masculine" },
  { tone: "feminine", label: "Feminine" },
  { tone: "neutral", label: "Neutral" },
  { tone: "tech", label: "Tech & creative" },
];
