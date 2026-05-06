// Six predefined avatars — three masculine-presenting, three feminine-
// presenting. Rendered from DiceBear (free, deterministic) so we don't
// need any image hosting or upload pipeline.
//
// Stored as `avatar_id` in the DB. Anything else (legacy uploads, blank)
// falls back to the handle-seeded Dicebear in `lib/utils.ts`.

export type AvatarId = "m1" | "m2" | "m3" | "f1" | "f2" | "f3";

type Tone = "male" | "female";

export interface PredefinedAvatar {
  id: AvatarId;
  label: string;
  tone: Tone;
  url: string;
}

const dicebear = (seed: string, bg: string) =>
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}` +
  `&backgroundColor=${bg}&backgroundType=gradientLinear`;

export const PREDEFINED_AVATARS: PredefinedAvatar[] = [
  { id: "m1", label: "Avatar 1", tone: "male",   url: dicebear("aiub-male-aarav",   "b6e3f4,d1d4f9") },
  { id: "m2", label: "Avatar 2", tone: "male",   url: dicebear("aiub-male-rafi",    "c0aede,b6e3f4") },
  { id: "m3", label: "Avatar 3", tone: "male",   url: dicebear("aiub-male-tahmid",  "ffdfbf,d1d4f9") },
  { id: "f1", label: "Avatar 4", tone: "female", url: dicebear("aiub-female-tasnia","ffd5dc,c0aede") },
  { id: "f2", label: "Avatar 5", tone: "female", url: dicebear("aiub-female-nuha",  "b6e3f4,ffd5dc") },
  { id: "f3", label: "Avatar 6", tone: "female", url: dicebear("aiub-female-mariam","c0aede,ffdfbf") },
];

const AVATAR_BY_ID: Record<string, PredefinedAvatar> = Object.fromEntries(
  PREDEFINED_AVATARS.map((a) => [a.id, a]),
);

export function avatarUrlForId(id: string | null | undefined): string | null {
  if (!id) return null;
  return AVATAR_BY_ID[id]?.url ?? null;
}

export function isValidAvatarId(id: unknown): id is AvatarId {
  return typeof id === "string" && id in AVATAR_BY_ID;
}
