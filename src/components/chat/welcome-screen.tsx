"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Code2, MessageCircle, Sparkles, Image as ImageIcon } from "lucide-react";
import { BOT_NAME } from "@/lib/chat-config";

interface WelcomeScreenProps {
  onEnter: () => void;
}

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const [phase, setPhase] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 200));
    timers.push(setTimeout(() => setPhase(2), 500));
    timers.push(setTimeout(() => setPhase(3), 800));
    timers.push(setTimeout(() => setPhase(4), 1100));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(onEnter, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-all duration-500 ease-out px-4 ${
        exiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      {/* Animated background */}
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
              src="/custom-logo.png"
              alt="Developer's Ai"
              className="relative h-24 w-24 rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h1
          className={`text-4xl sm:text-5xl font-bold tracking-tight mb-3 transition-all duration-700 delay-100 ease-out ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {BOT_NAME}
        </h1>

        {/* Tagline */}
        <p
          className={`text-base text-muted-foreground max-w-sm mb-10 transition-all duration-700 delay-200 ease-out ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Ask anything. Get smart answers instantly.
        </p>

        {/* Capability pills */}
        <div
          className={`flex flex-wrap justify-center gap-3 mb-10 transition-all duration-700 delay-300 ease-out ${
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {[
            { icon: <MessageCircle className="h-3.5 w-3.5" />, label: "Chat" },
            { icon: <Code2 className="h-3.5 w-3.5" />, label: "Code" },
            { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Images" },
            { icon: <ImageIcon className="h-3.5 w-3.5" />, label: "Analyze" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur-sm px-4 py-2 text-sm text-muted-foreground"
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleEnter}
          className={`group flex items-center gap-3 rounded-full bg-foreground text-background px-8 py-3.5 text-sm font-semibold shadow-lg transition-all duration-700 delay-500 ease-out hover:scale-105 active:scale-95 ${
            phase >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          Start chatting
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        {phase >= 4 && (
          <p className="mt-4 text-[11px] text-muted-foreground/50">
            Free &middot; No sign-up required &middot; Private
          </p>
        )}
      </div>
    </div>
  );
}
