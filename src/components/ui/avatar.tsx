"use client";

import * as React from "react";
import { cn, initials } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: number;
  ring?: boolean;
}

export function Avatar({
  src,
  name = "",
  size = 40,
  ring,
  className,
  ...props
}: AvatarProps) {
  const [errored, setErrored] = React.useState(false);
  const showImg = src && !errored;
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-200 to-brand-400 text-brand-950 font-semibold",
        ring && "ring-2 ring-background",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      {...props}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={name}
          width={size}
          height={size}
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}

export function AvatarStack({
  people,
  size = 32,
  max = 4,
}: {
  people: { name: string; src?: string | null }[];
  size?: number;
  max?: number;
}) {
  const visible = people.slice(0, max);
  const extra = people.length - visible.length;
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((p, i) => (
        <Avatar
          key={i}
          name={p.name}
          src={p.src}
          size={size}
          ring
          className="border border-background"
        />
      ))}
      {extra > 0 && (
        <div
          className="relative inline-flex items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-background"
          style={{ width: size, height: size }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
