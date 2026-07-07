"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, Code2, MessageCircle, FileText } from "lucide-react";
import { BOT_NAME, DEVELOPER_INFO } from "@/lib/chat-config";

interface WelcomeScreenProps {
  onEnter: () => void;
}

type AnimationPhase = "orb" | "expand" | "logo" | "title" | "cards" | "button";

/**
 * Cinematic welcome screen with sequential animation.
 * Mobile-optimized: smaller sizes, fewer particles, reduced blur.
 */
export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const [phase, setPhase] = useState<AnimationPhase>("orb");
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("expand"), 500));
    timers.push(setTimeout(() => setPhase("logo"), 1000));
    timers.push(setTimeout(() => setPhase("title"), 1500));
    timers.push(setTimeout(() => setPhase("cards"), 2000));
    timers.push(setTimeout(() => setPhase("button"), 2600));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(onEnter, 500);
  };

  const phaseIndex = ["orb", "expand", "logo", "title", "cards", "button"].indexOf(phase);

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-opacity duration-500 px-4 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated gradient background blobs (smaller on mobile) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl animate-blob sm:h-96 sm:w-96" />
        <div className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl animate-blob [animation-delay:2s] sm:h-96 sm:w-96" />
        <div className="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/15 blur-3xl animate-blob [animation-delay:4s] sm:h-72 sm:w-72" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-md">
        {/* ===== CINEMATIC LOGO SEQUENCE ===== */}
        <div className="relative mb-6 flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36 sm:mb-8">
          {/* Phase 1: Glowing orb (smaller on mobile) */}
          <div
            className={`absolute rounded-full bg-emerald-400 blur-2xl transition-all duration-700 ease-out ${
              phaseIndex >= 0 ? "h-16 w-16 opacity-80 sm:h-20 sm:w-20" : "h-0 w-0 opacity-0"
            }`}
            style={{ boxShadow: "0 0 50px 15px rgba(16, 185, 129, 0.6)" }}
          />

          {/* Phase 2: Expanding ring */}
          <div
            className={`absolute rounded-full border-2 border-emerald-400/50 transition-all duration-700 ease-out ${
              phaseIndex >= 1 ? "h-24 w-24 opacity-100 scale-100 sm:h-32 sm:w-32" : "h-16 w-16 opacity-0 scale-50 sm:h-20 sm:w-20"
            }`}
          />

          {/* Phase 3: Logo appears */}
          <div
            className={`relative transition-all duration-700 ease-out ${
              phaseIndex >= 2 ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 rotate-180"
            }`}
          >
            <div className="absolute inset-0 -m-2 animate-ping-slow rounded-3xl bg-emerald-500/30 blur-lg sm:-m-3 sm:blur-xl" />
            <img
              src="/custom-logo.png"
              alt="Developer's Ai Logo"
              className="relative h-24 w-24 rounded-3xl shadow-2xl object-cover aurora-glow animate-logo-float sm:h-28 sm:w-28"
            />
          </div>

          {/* Sparkle particles (fewer on mobile) */}
          {phaseIndex >= 2 && (
            <>
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-emerald-400 animate-pulse sm:-top-2 sm:-right-2 sm:h-5 sm:w-5" />
              <Sparkles className="absolute -bottom-1 -left-2 h-3 w-3 text-teal-400 animate-pulse [animation-delay:0.5s] sm:h-4 sm:w-4" />
              <Sparkles className="absolute top-1/2 -right-3 hidden h-3 w-3 text-purple-400 animate-pulse [animation-delay:1s] sm:block" />
            </>
          )}
        </div>

        {/* Phase 4: Title (smaller on mobile) */}
        <h1
          className={`aurora-shimmer text-4xl sm:text-6xl font-bold tracking-tight font-mono mb-2 sm:mb-3 transition-all duration-700 ${
            phaseIndex >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {BOT_NAME}
        </h1>

        {/* Subtitle */}
        <p
          className={`text-sm sm:text-lg text-muted-foreground max-w-md mb-6 sm:mb-8 transition-all duration-700 delay-100 ${
            phaseIndex >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Your intelligent coding companion, built with ❤️ by{" "}
          <span className="text-emerald-400 font-medium">{DEVELOPER_INFO.name}</span>
        </p>

        {/* Phase 5: Feature cards (stacked on mobile) */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8 w-full transition-all duration-700 ${
            phaseIndex >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <FeatureCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Casual Chat"
            desc="Friendly conversations"
            color="emerald"
            delay={0}
          />
          <FeatureCard
            icon={<Code2 className="h-5 w-5" />}
            title="Coding Tips"
            desc="Practical help"
            color="purple"
            delay={100}
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="File Generation"
            desc="HTML, CSS, JS & more"
            color="teal"
            delay={200}
          />
        </div>

        {/* Phase 6: Enter button — user MUST click */}
        <button
          type="button"
          onClick={handleEnter}
          disabled={phaseIndex < 5}
          className={`group flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-500 sm:px-7 ${
            phaseIndex >= 5
              ? "opacity-100 translate-y-0 hover:scale-105 hover:shadow-emerald-500/50 active:scale-95"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          Get Started
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>

        {phaseIndex >= 5 && (
          <p className="mt-5 text-[10px] text-muted-foreground/60 animate-pulse">
            Click to enter
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
      className={`rounded-xl border bg-gradient-to-br ${colorClasses} p-3 sm:p-4 backdrop-blur-sm transition-all hover:-translate-y-1 animate-bounce-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background/50 sm:h-10 sm:w-10">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-0.5">{title}</h3>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">{desc}</p>
    </div>
  );
}
