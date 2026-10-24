"use client";

import Image from "next/image";
import { useState } from "react";
import { initialsOf } from "@/lib/api";
import { avatarSrc } from "@/lib/avatar-url";

export interface AvatarProps {
  name: string;
  src: string | null;
  /** Pixel size (default 36). */
  size?: number;
  className?: string;
}

/** Round avatar. Falls back to initials on the accent gradient when there is no photo (or it fails to load). */
export default function Avatar({ name, src, size = 36, className = "" }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const show = src !== null && src !== failedSrc;
  const local = src !== null && (src.startsWith("blob:") || src.startsWith("data:"));
  const box = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) };
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-linear-to-br from-accent to-accent-2 font-semibold text-accent-ink ${className}`}
      style={box}
      role="img"
      aria-label={name}
    >
      {show && src ? (
        local ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob/data previews cannot go through next/image
          <img src={src} alt="" width={size} height={size} className="size-full object-cover" onError={() => setFailedSrc(src)} />
        ) : (
          <Image src={avatarSrc(src)} alt="" width={size} height={size} sizes={`${size}px`} className="size-full object-cover" onError={() => setFailedSrc(src)} />
        )
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
    </span>
  );
}
