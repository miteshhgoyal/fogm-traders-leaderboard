"use client";

import { useAuth } from "./auth-context";

interface RankCtaProps {
  size?: "default" | "hero";
  className?: string;
}

export default function RankCta({ size = "default", className = "" }: RankCtaProps) {
  const { user, openModal } = useAuth();

  const isHero = size === "hero";
  const heightClass = isHero ? "h-12 px-6 text-base" : "h-11 px-5 text-sm";
  const label = user ? "View my rank card" : "See your rank →";

  const handleClick = () => {
    if (user) {
      openModal("card");
    } else {
      openModal("join");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/35 text-white ${heightClass} ${className}`}
      style={{
        background: "linear-gradient(135deg, var(--accent, #3b36e0), var(--accent-2, #7a5cff))",
      }}
    >
      {/* Reduced-motion-safe subtle shimmer sweep */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full motion-reduce:hidden"
      />

      {/* Trophy icon */}
      <svg
        className={`shrink-0 transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none ${
          isHero ? "size-5" : "size-4"
        }`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>

      <span className="relative z-10">{label}</span>
    </button>
  );
}
