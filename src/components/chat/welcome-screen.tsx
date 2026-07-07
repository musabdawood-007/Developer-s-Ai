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
 * Mobile-optimized + properly centered + faster timing.
 */
export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const [phase, setPhase] = useState<AnimationPhase>("orb");
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Faster timing — total 1.6s instead of 2.6s
    timers.push(setTimeout(() => setPhase("expand"), 250));
    timers.push(setTimeout(() => setPhase("logo"), 500));
    timers.push(setTimeout(() => setPhase("title"), 800));
    timers.push(setTimeout(() => setPhase("cards"), 1100));
    timers.push(setTimeout(() => setPhase("button"), 1500));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(onEnter, 400);
  };

  const phaseIndex = ["orb", "expand", "logo", "title", "cards", "button"].indexOf(phase);

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-opacity duration-400 px-4 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated gradient background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl animate-blob sm:h-96 sm:w-96" />
        <div className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl animate-blob [animation-delay:2s] sm:h-96 sm:w-96" />
        <div className="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/15 blur-3xl animate-blob [animation-delay:4s] sm:h-72 sm:w-72" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-md">
        {/* ===== CINEMATIC LOGO SEQUENCE — properly centered, BIG logo ===== */}
        <div className="relative mb-6 flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52 sm:mb-8">
          {/* Phase 1: Glowing orb — CENTERED */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 blur-3xl transition-all duration-500 ease-out ${
              phaseIndex >= 0 ? "h-32 w-32 opacity-80 sm:h-40 sm:w-40" : "h-0 w-0 opacity-0"
            }`}
            style={{ boxShadow: "0 0 80px 20px rgba(16, 185, 129, 0.7)" }}
          />

          {/* Phase 2: Expanding ring — CENTERED */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400/50 transition-all duration-500 ease-out ${
              phaseIndex >= 1
                ? "h-40 w-40 opacity-100 scale-100 sm:h-48 sm:w-48"
                : "h-32 w-32 opacity-0 scale-50 sm:h-40 sm:w-40"
            }`}
          />

          {/* Phase 3: Logo appears — BIGGER + CENTERED */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out ${
              phaseIndex >= 2 ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 rotate-180"
            }`}
          >
            <div className="relative">
              <div className="absolute inset-0 -m-3 animate-ping-slow rounded-3xl bg-emerald-500/30 blur-xl sm:-m-4 sm:blur-2xl" />
              <img
                src="/custom-logo.png"
                alt="Developer's Ai Logo"
                className="relative h-36 w-36 rounded-2xl shadow-2xl object-contain aurora-glow animate-logo-float sm:h-44 sm:w-44"
              />
            </div>
          </div>

          {/* Sparkle particles — positioned around big logo */}
          {phaseIndex >= 2 && (
            <>
              <Sparkles className="absolute right-0 top-4 h-5 w-5 text-emerald-400 animate-pulse sm:right-2 sm:top-6 sm:h-6 sm:w-6" />
              <Sparkles className="absolute bottom-4 left-0 h-4 w-4 text-teal-400 animate-pulse [animation-delay:0.5s] sm:bottom-6 sm:left-2 sm:h-5 sm:w-5" />
              <Sparkles className="absolute top-1/2 right-2 hidden h-4 w-4 text-purple-400 animate-pulse [animation-delay:1s] sm:block" />
              <Sparkles className="absolute top-8 left-2 hidden h-3 w-3 text-pink-400 animate-pulse [animation-delay:1.5s] sm:block" />
            </>
          )}
        </div>

        {/* Phase 4: Title */}
        <h1
          className={`aurora-shimmer text-4xl sm:text-6xl font-bold tracking-tight font-mono mb-2 sm:mb-3 transition-all duration-500 ${
            phaseIndex >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {BOT_NAME}
        </h1>

        {/* Subtitle */}
        <p
          className={`text-sm sm:text-lg text-muted-foreground max-w-md mb-6 sm:mb-8 transition-all duration-500 delay-75 ${
            phaseIndex >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Your intelligent coding companion, built with ❤️ by{" "}
          <span className="text-emerald-400 font-medium">{DEVELOPER_INFO.name}</span>
        </p>

        {/* Phase 5: Feature cards — GLASS MORPHISM */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8 w-full transition-all duration-500 ${
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
            delay={75}
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="File Generation"
            desc="HTML, CSS, JS & more"
            color="teal"
            delay={150}
          />
        </div>

        {/* Phase 6: Enter button — GLASS MORPHISM */}
        <button
          type="button"
          onClick={handleEnter}
          disabled={phaseIndex < 5}
          className={`group flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 backdrop-blur-md px-6 py-3 text-sm font-semibold text-emerald-300 shadow-lg shadow-emerald-500/20 transition-all duration-500 sm:px-7 ${
            phaseIndex >= 5
              ? "opacity-100 translate-y-0 hover:scale-105 hover:bg-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95"
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
    emerald: "border-emerald-500/30 text-emerald-400",
    purple: "border-purple-500/30 text-purple-400",
    teal: "border-teal-500/30 text-teal-400",
  }[color];

  return (
    <div
      className={`glass-card rounded-xl border ${colorClasses} p-3 sm:p-4 transition-all hover:-translate-y-1 animate-bounce-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background/30 backdrop-blur-sm sm:h-10 sm:w-10">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-0.5">{title}</h3>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">{desc}</p>
    </div>
  );
}
