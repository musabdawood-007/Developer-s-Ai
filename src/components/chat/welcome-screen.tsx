"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, Code2, MessageCircle, FileText } from "lucide-react";
import { BOT_NAME, DEVELOPER_INFO } from "@/lib/chat-config";

interface WelcomeScreenProps {
  onEnter: () => void;
}

type AnimationPhase = "orb" | "expand" | "logo" | "title" | "cards" | "button";

/**
 * Cinematic welcome screen with sequential animation:
 *
 * Phase 1 (0ms):     Glowing orb appears
 * Phase 2 (600ms):   Orb expands and transforms
 * Phase 3 (1200ms):  Logo fades in
 * Phase 4 (1800ms):  Title shimmers in
 * Phase 5 (2400ms):  Feature cards slide up
 * Phase 6 (3000ms):  "Get Started" button appears
 *
 * User MUST click "Get Started" — no auto-fade.
 */
export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const [phase, setPhase] = useState<AnimationPhase>("orb");
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("expand"), 600));
    timers.push(setTimeout(() => setPhase("logo"), 1200));
    timers.push(setTimeout(() => setPhase("title"), 1800));
    timers.push(setTimeout(() => setPhase("cards"), 2400));
    timers.push(setTimeout(() => setPhase("button"), 3000));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(onEnter, 500);
  };

  const phaseIndex = ["orb", "expand", "logo", "title", "cards", "button"].indexOf(phase);

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated gradient background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl animate-blob [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/15 blur-3xl animate-blob [animation-delay:4s]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* ===== CINEMATIC LOGO SEQUENCE ===== */}
        <div className="relative mb-8 h-36 w-36 flex items-center justify-center">
          {/* Phase 1: Glowing orb */}
          <div
            className={`absolute rounded-full bg-emerald-400 blur-2xl transition-all duration-700 ease-out ${
              phaseIndex >= 0
                ? "h-20 w-20 opacity-80"
                : "h-0 w-0 opacity-0"
            }`}
            style={{
              boxShadow: "0 0 60px 20px rgba(16, 185, 129, 0.6)",
            }}
          />

          {/* Phase 2: Expanding ring */}
          <div
            className={`absolute rounded-full border-2 border-emerald-400/50 transition-all duration-700 ease-out ${
              phaseIndex >= 1 ? "h-32 w-32 opacity-100 scale-100" : "h-20 w-20 opacity-0 scale-50"
            }`}
          />

          {/* Phase 3: Logo appears */}
          <div
            className={`relative transition-all duration-700 ease-out ${
              phaseIndex >= 2
                ? "opacity-100 scale-100 rotate-0"
                : "opacity-0 scale-50 rotate-180"
            }`}
          >
            <div className="absolute inset-0 -m-3 animate-ping-slow rounded-3xl bg-emerald-500/30 blur-xl" />
            <img
              src="/custom-logo.png"
              alt="Developer's Ai Logo"
              className="relative h-28 w-28 rounded-3xl shadow-2xl object-cover aurora-glow animate-logo-float"
            />
          </div>

          {/* Sparkle particles around logo */}
          {phaseIndex >= 2 && (
            <>
              <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-emerald-400 animate-pulse" />
              <Sparkles className="absolute -bottom-1 -left-3 h-4 w-4 text-teal-400 animate-pulse [animation-delay:0.5s]" />
              <Sparkles className="absolute top-1/2 -right-4 h-3 w-3 text-purple-400 animate-pulse [animation-delay:1s]" />
            </>
          )}
        </div>

        {/* Phase 4: Title */}
        <h1
          className={`aurora-shimmer text-5xl sm:text-6xl font-bold tracking-tight font-mono mb-3 transition-all duration-700 ${
            phaseIndex >= 3
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          {BOT_NAME}
        </h1>

        {/* Subtitle — NO "MERN + .NET" line */}
        <p
          className={`text-base sm:text-lg text-muted-foreground max-w-md mb-8 transition-all duration-700 delay-100 ${
            phaseIndex >= 3
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          Your intelligent coding companion, built with ❤️ by{" "}
          <span className="text-emerald-400 font-medium">{DEVELOPER_INFO.name}</span>
        </p>

        {/* Phase 5: Feature cards */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 w-full max-w-2xl transition-all duration-700 ${
            phaseIndex >= 4
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <FeatureCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Casual Chat"
            desc="Friendly conversations about anything"
            color="emerald"
            delay={0}
          />
          <FeatureCard
            icon={<Code2 className="h-5 w-5" />}
            title="Coding Tips"
            desc="Practical help with your projects"
            color="purple"
            delay={150}
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="File Generation"
            desc="HTML, CSS, JS, Markdown & more"
            color="teal"
            delay={300}
          />
        </div>

        {/* Phase 6: Enter button — user MUST click */}
        <button
          type="button"
          onClick={handleEnter}
          disabled={phaseIndex < 5}
          className={`group flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-500 ${
            phaseIndex >= 5
              ? "opacity-100 translate-y-0 hover:scale-105 hover:shadow-emerald-500/50 active:scale-95"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          Get Started
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>

        {/* Pulsing hint after button appears */}
        {phaseIndex >= 5 && (
          <p className="mt-6 text-[10px] text-muted-foreground/60 animate-pulse">
            Click to enter Developer's Ai
          </p>
        )}
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: "emerald" | "purple" | "teal";
  delay: number;
}

function FeatureCard({ icon, title, desc, color, delay }: FeatureCardProps) {
  const colorClasses = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400",
    teal: "from-teal-500/20 to-teal-500/5 border-teal-500/30 text-teal-400",
  }[color];

  return (
    <div
      className={`rounded-xl border bg-gradient-to-br ${colorClasses} p-4 backdrop-blur-sm transition-all hover:-translate-y-1 animate-bounce-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-background/50">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
    </div>
  );
}
