"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, Code2, MessageCircle, FileText } from "lucide-react";
import { BOT_NAME, DEVELOPER_INFO } from "@/lib/chat-config";

interface WelcomeScreenProps {
  onEnter: () => void;
}

/**
 * Beautiful animated welcome screen shown on first load.
 * Logo pulses, gradient text shimmers, three feature cards slide in.
 * After 2.5s OR a click, calls onEnter() to reveal the auth gate / chat.
 */
export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const [showCards, setShowCards] = useState(false);

  // Animate cards in after a short delay
  useEffect(() => {
    const t = setTimeout(() => setShowCards(true), 600);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    setFadeOut(true);
    setTimeout(onEnter, 400);
  };

  // Auto-enter after 2.5s
  useEffect(() => {
    const t = setTimeout(handleEnter, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-opacity duration-400 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleEnter}
    >
      {/* Animated gradient background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl animate-blob [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/15 blur-3xl animate-blob [animation-delay:4s]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Logo with pulse animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 -m-4 animate-ping-slow rounded-3xl bg-emerald-500/30 blur-xl" />
          <img
            src="/custom-logo.png"
            alt="Developer's Ai Logo"
            className="relative h-28 w-28 rounded-3xl shadow-2xl object-cover aurora-glow animate-logo-float"
          />
        </div>

        {/* Title with shimmer effect */}
        <h1 className="aurora-shimmer text-5xl sm:text-6xl font-bold tracking-tight font-mono mb-3">
          {BOT_NAME}
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-md mb-2">
          Your intelligent coding companion, built with ❤️ by{" "}
          <span className="text-emerald-400 font-medium">{DEVELOPER_INFO.name}</span>
        </p>

        <p className="text-xs text-muted-foreground/70 mb-8 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-emerald-400" />
          Powered by MERN + .NET + AI
        </p>

        {/* Feature cards — slide in after delay */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 w-full max-w-2xl transition-all duration-700 ${
            showCards
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <FeatureCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Casual Chat"
            desc="Friendly conversations about anything"
            color="emerald"
          />
          <FeatureCard
            icon={<Code2 className="h-5 w-5" />}
            title="Coding Tips"
            desc="Practical help from Musab's stack"
            color="purple"
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="File Generation"
            desc="Markdown, PDF, DOCX on demand"
            color="teal"
          />
        </div>

        {/* Enter button */}
        <button
          type="button"
          onClick={handleEnter}
          className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 hover:shadow-emerald-500/50 active:scale-95"
        >
          Get Started
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>

        {/* Skip hint */}
        <p className="mt-6 text-[10px] text-muted-foreground/50 animate-pulse">
          Click anywhere to continue
        </p>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: "emerald" | "purple" | "teal";
}

function FeatureCard({ icon, title, desc, color }: FeatureCardProps) {
  const colorClasses = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400",
    teal: "from-teal-500/20 to-teal-500/5 border-teal-500/30 text-teal-400",
  }[color];

  return (
    <div
      className={`rounded-xl border bg-gradient-to-br ${colorClasses} p-4 backdrop-blur-sm transition-transform hover:-translate-y-1`}
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-background/50">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
    </div>
  );
}
