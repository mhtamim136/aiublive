"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  AVATAR_TONES,
  PREDEFINED_AVATARS,
  type AvatarId,
  type AvatarTone,
  type PredefinedAvatar,
} from "@/lib/avatars";
import { cn } from "@/lib/utils";

export interface AvatarPickerProps {
  value: AvatarId | null | undefined;
  onChange: (id: AvatarId) => void;
  ariaLabel?: string;
}

/**
 * Polished, modern avatar picker.
 *
 * - 12 curated avatars across 4 personality tones.
 * - Clear masculine / feminine / neutral / tech grouping (filterable).
 * - Mobile-first tap targets (~96 px square minimum on phones).
 * - Hover / focus / active states all distinct so the chosen avatar feels
 *   genuinely picked.
 * - Lazy-loads avatar SVGs so the picker is light even at 12 entries.
 */
export function AvatarPicker({
  value,
  onChange,
  ariaLabel = "Choose your avatar",
}: AvatarPickerProps) {
  const [tone, setTone] = React.useState<AvatarTone | "all">("all");

  const visible = React.useMemo<PredefinedAvatar[]>(
    () =>
      tone === "all"
        ? PREDEFINED_AVATARS
        : PREDEFINED_AVATARS.filter((a) => a.tone === tone),
    [tone],
  );

  return (
    <div role="radiogroup" aria-label={ariaLabel} className="space-y-3">
      {/* Tone filter — also doubles as the visual grouping */}
      <div
        role="tablist"
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hide"
      >
        <ToneChip
          active={tone === "all"}
          label="All"
          onClick={() => setTone("all")}
        />
        {AVATAR_TONES.map((t) => (
          <ToneChip
            key={t.tone}
            active={tone === t.tone}
            label={t.label}
            onClick={() => setTone(t.tone)}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-6">
        {visible.map((a) => (
          <AvatarOption
            key={a.id}
            avatar={a}
            selected={a.id === value}
            onSelect={() => onChange(a.id)}
          />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Tap to pick. Categories are just a hint — pick whichever feels right.
      </p>
    </div>
  );
}

function ToneChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function AvatarOption({
  avatar,
  selected,
  onSelect,
}: {
  avatar: PredefinedAvatar;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      title={`${avatar.label} — ${avatar.blurb}`}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-2xl border bg-card transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        selected
          ? "border-primary shadow-glow ring-2 ring-primary/40"
          : "border-border hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card",
      )}
    >
      {/* Avatar artwork */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatar.url}
        alt={avatar.label}
        width={120}
        height={120}
        className={cn(
          "h-full w-full object-cover transition-transform duration-300 ease-out",
          "group-hover:scale-[1.04]",
        )}
        loading="lazy"
        decoding="async"
        draggable={false}
      />

      {/* Subtle gradient sheen on hover */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/15 via-transparent to-transparent opacity-0 transition-opacity",
          "group-hover:opacity-100",
        )}
      />

      {/* Selected check */}
      {selected && (
        <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
          <Check className="h-3 w-3" />
        </span>
      )}

      {/* Hover label */}
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-2 text-[10px] font-medium text-white",
          "translate-y-2 opacity-0 transition-all duration-200",
          "group-hover:translate-y-0 group-hover:opacity-100",
          selected && "translate-y-0 opacity-100",
        )}
      >
        <span className="block truncate text-center drop-shadow">
          {avatar.label}
        </span>
      </span>
    </button>
  );
}
