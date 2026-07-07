"use client";

import { Sparkles, X, Check, Zap, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOT_NAME, DEVELOPER_INFO } from "@/lib/chat-config";

interface PatchNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PATCH_VERSION = "v2.5";
const PATCH_DATE = "July 2026";

const PATCH_NOTES = [
  {
    icon: "🎬",
    title: "Cinematic Welcome Animation",
    desc: "Logo now plays a 6-phase sequence: orb → ring → logo → title → cards → button. No more auto-fade.",
  },
  {
    icon: "👑",
    title: "Pro Model Unlocked",
    desc: "Developer's Pro is now free for all users — no upgrade prompts, no paywall.",
  },
  {
    icon: "🎨",
    title: "New Watermark",
    desc: "Generated images now show your actual logo with emerald/teal theme instead of old 'DA' text.",
  },
  {
    icon: "📥",
    title: "Code Block Downloads",
    desc: "Download any code block as .html, .css, .js, .ts, .py and 20+ more formats with one click.",
  },
  {
    icon: "🤖",
    title: "Smart Model Switching",
    desc: "If your selected model is busy, Developer's Ai auto-switches to the best alternative instantly.",
  },
  {
    icon: "💭",
    title: "Redesigned Thinking Indicator",
    desc: "Spinning ring + pulsing dot with 'Crafting a thoughtful response' subtitle.",
  },
  {
    icon: "⚡",
    title: "Hardware-Accelerated Animations",
    desc: "All UI animations now use transform/opacity with will-change for butter-smooth 60fps.",
  },
  {
    icon: "🎆",
    title: "Welcome Celebration",
    desc: "After login, enjoy a colorful username animation with fireworks bursting on your screen!",
  },
];

export function PatchNotesModal({ open, onOpenChange }: PatchNotesModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="glass-card relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl animate-scale-in will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative gradient top */}
        <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl animate-blob" />
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-purple-500/20 blur-3xl animate-blob [animation-delay:1s]" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
              <Bell className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                What's New
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                  {PATCH_VERSION}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {BOT_NAME} · Last updated {PATCH_DATE}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="relative z-10 max-h-[60vh] overflow-y-auto chat-scroll p-5">
          <p className="mb-4 text-sm text-muted-foreground">
            Hey! 👋 We've shipped some exciting updates to make your experience smoother.
          </p>

          <div className="space-y-3">
            {PATCH_NOTES.map((note, idx) => (
              <div
                key={idx}
                className="flex gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5 animate-message-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-lg">
                  {note.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{note.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {note.desc}
                  </p>
                </div>
                <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between gap-3 border-t border-border p-4">
          <p className="text-[11px] text-muted-foreground">
            Built by <span className="text-emerald-400 font-medium">{DEVELOPER_INFO.name}</span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Later
            </Button>
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-xs hover:from-emerald-400 hover:to-teal-500"
            >
              <Zap className="h-3.5 w-3.5" />
              Let's Go
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
