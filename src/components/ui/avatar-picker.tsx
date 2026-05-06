"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  PREDEFINED_AVATARS,
  type AvatarId,
  type PredefinedAvatar,
} from "@/lib/avatars";
import { cn } from "@/lib/utils";

export interface AvatarPickerProps {
  value: AvatarId | null | undefined;
  onChange: (id: AvatarId) => void;
  /** Optional id used to label the picker for screen readers. */
  ariaLabel?: string;
}

/**
 * Fixed grid of 6 predefined avatars (3 male, 3 female). One must always be
 * selected; the parent decides whether to send `avatarId: null` to clear.
 */
export function AvatarPicker({
  value,
  onChange,
  ariaLabel = "Choose your avatar",
}: AvatarPickerProps) {
  const groups: { label: string; tone: PredefinedAvatar["tone"] }[] = [
    { label: "Style A", tone: "male" },
    { label: "Style B", tone: "female" },
  ];
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="space-y-3">
      {groups.map((g) => {
        const items = PREDEFINED_AVATARS.filter((a) => a.tone === g.tone);
        return (
          <div key={g.tone}>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {g.label}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {items.map((a) => {
                const selected = a.id === value;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange(a.id)}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-2xl border bg-card transition-all",
                      selected
                        ? "border-primary shadow-glow ring-2 ring-primary/40"
                        : "border-border hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.url}
                      alt={a.label}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {selected && (
                      <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
