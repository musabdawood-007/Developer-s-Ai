"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Heart, ShieldCheck } from "lucide-react";
import { BOT_NAME, ONBOARDING_MESSAGE, PULSE_INFO } from "@/lib/chat-config";

interface WelcomeScreenProps {
  onEnter: () => void;
}

/**
 * PULSE onboarding (PRD §3C): expectation-setting modal shown before chat.
 * Includes the 18+ age gate required for public apps (PRD §6).
 */
export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const [phase, setPhase] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 200));
    timers.push(setTimeout(() => setPhase(2), 500));
    timers.push(setTimeout(() => setPhase(3), 800));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEnter = () => {
    if (!ageConfirmed) return;
    setExiting(true);
    setTimeout(onEnter, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-all duration-400 ease-out px-4 ${
        exiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      {/* Calming ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-muted/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-muted/10 blur-[100px]" />
        <div className="absolute top-1/4 left-0 h-[300px] w-[300px] rounded-full bg-muted/10 blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-lg">
        {/* Logo */}
        <div
          className={`relative mb-8 transition-all duration-700 ease-out ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="relative">
            <div className="absolute inset-0 -m-2 rounded-3xl bg-muted/40 blur-xl" />
            <img
              src="/pulse-logo.png"
              alt="PULSE"
              className="relative h-20 w-20 rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>

        {/* Identity */}
        <h1
          className={`text-3xl sm:text-4xl font-bold tracking-tight mb-2 transition-all duration-700 delay-100 ease-out ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Hi, I&apos;m {BOT_NAME}.
        </h1>

        <p
          className={`text-base text-foreground/90 max-w-md mb-3 transition-all duration-700 delay-200 ease-out ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          I&apos;m here to listen and help you find clarity. I&apos;m an AI, not a
          therapist, but I care about your well-being.
        </p>

        {/* Value prop */}
        <div
          className={`flex flex-wrap justify-center gap-3 mb-8 transition-all duration-700 delay-300 ease-out ${
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {[
            { icon: <Heart className="h-3.5 w-3.5" />, label: "Feeling heavy? Let's lighten the load together." },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur-sm px-4 py-2 text-sm text-foreground/80"
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>

        {/* 18+ age gate (PRD §6) */}
        {phase >= 3 && (
          <label
            htmlFor="pulse-age-gate"
            className="flex max-w-md cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-card/50 px-4 py-3 text-left text-xs leading-relaxed text-muted-foreground mb-6"
          >
            <input
              type="checkbox"
              id="pulse-age-gate"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-muted"
            />
            <span>
              I confirm I am over 18 years old, and I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-2">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-2">
                Privacy Policy
              </a>
              .
            </span>
          </label>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleEnter}
          disabled={!ageConfirmed}
          className={`group flex items-center gap-3 rounded-full bg-foreground text-background px-8 py-3.5 text-sm font-semibold shadow-lg transition-all duration-500 ease-out hover:enabled:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          What&apos;s on your mind?
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        {phase >= 3 && (
          <p className="mt-4 text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            Your Emotional Compass. Steady Mind. Clear Path. &middot; Conversations saved for continuity.
          </p>
        )}
      </div>
    </div>
  );
}
