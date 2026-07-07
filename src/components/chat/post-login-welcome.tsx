"use client";

import { useEffect, useState, useRef } from "react";
import { X, Sparkles } from "lucide-react";
import { BOT_NAME, DEVELOPER_INFO } from "@/lib/chat-config";

interface PostLoginWelcomeProps {
  open: boolean;
  username: string;
  onOpenChange: (open: boolean) => void;
}

type Phase = "name" | "subtitle" | "fireworks" | "button";

/**
 * Post-login welcome animation:
 * 1. Colorful animated username appears
 * 2. "Welcome to Developer's Ai" subtitle slides up
 * 3. Fireworks burst across the screen
 * 4. "Continue" button appears
 *
 * User must click "Continue" — no auto-dismiss.
 */
export function PostLoginWelcome({ open, username, onOpenChange }: PostLoginWelcomeProps) {
  const [phase, setPhase] = useState<Phase>("name");
  const [exiting, setExiting] = useState(false);
  const [fireworks, setFireworks] = useState<Firework[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("name");
    setExiting(false);

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("subtitle"), 800));
    timers.push(setTimeout(() => setPhase("fireworks"), 1400));
    timers.push(setTimeout(() => setPhase("button"), 2200));

    return () => timers.forEach(clearTimeout);
  }, [open]);

  // Fireworks effect — canvas-based for performance
  useEffect(() => {
    if (!open || phase !== "fireworks") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const colors = ["#10b981", "#14b8a6", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#a855f7"];
    const MAX_PARTICLES = 400; // Cap to prevent slowdown

    const launchFirework = () => {
      // Don't launch if too many particles (prevents lag)
      if (particles.length > MAX_PARTICLES) return;

      const x = canvas.width * (0.15 + Math.random() * 0.7);
      const y = canvas.height * (0.15 + Math.random() * 0.5);
      const color = colors[Math.floor(Math.random() * colors.length)];
      // Fewer particles per burst on mobile (smaller screens)
      const isMobile = window.innerWidth < 640;
      const count = isMobile ? 25 : 40 + Math.floor(Math.random() * 15);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = (isMobile ? 1.5 : 2) + Math.random() * 3;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color,
          size: (isMobile ? 1.5 : 2) + Math.random() * 1.5,
        });
      }
    };

    // Launch initial burst, then keep launching at slower interval
    launchFirework();
    const burstInterval = setInterval(launchFirework, 800);

    let animationId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = Math.min((now - lastTime) / 16.67, 2); // normalize to 60fps, cap at 2x
      lastTime = now;

      // Clear with semi-transparent rect for trail effect
      ctx.fillStyle = "rgba(10, 10, 26, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render all particles (no per-particle save/restore = faster)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.vy += 0.05 * delta; // gravity
        p.vx *= Math.pow(0.99, delta);
        p.life -= 0.012 * delta;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Use simple alpha + fillStyle (no shadowBlur — too expensive)
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(burstInterval);
      window.removeEventListener("resize", resize);
    };
  }, [open, phase]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onOpenChange(false), 400);
  };

  if (!open) return null;

  const phaseIndex = ["name", "subtitle", "fireworks", "button"].indexOf(phase);

  return (
    <div
      className={`fixed inset-0 z-[180] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-opacity duration-400 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Fireworks canvas */}
      {phaseIndex >= 2 && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      )}

      {/* Gradient blobs background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl animate-blob" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl animate-blob [animation-delay:2s]" />
      </div>

      {/* Close button (top-right) */}
      {phaseIndex >= 3 && (
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-card/60 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          aria-label="Skip"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-4 text-center max-w-md">
        {/* Sparkle icon */}
        <div
          className={`mb-4 transition-all duration-500 ${
            phaseIndex >= 0 ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
            <Sparkles className="h-7 w-7 text-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* "Welcome" text */}
        <p
          className={`text-base sm:text-lg font-medium text-muted-foreground mb-2 transition-all duration-500 ${
            phaseIndex >= 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          Welcome,
        </p>

        {/* Colorful animated username */}
        <h1
          className={`text-3xl sm:text-5xl font-bold mb-3 transition-all duration-700 ${
            phaseIndex >= 0
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-75 rotate-3"
          }`}
          style={{
            background: "linear-gradient(90deg, #10b981, #14b8a6, #06b6d4, #8b5cf6, #ec4899, #f59e0b, #10b981)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "gradient-shift 3s linear infinite",
          }}
        >
          {username}!
        </h1>

        {/* Subtitle */}
        <p
          className={`text-sm sm:text-base text-muted-foreground mb-2 transition-all duration-500 ${
            phaseIndex >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          You're all set to explore{" "}
          <span className="text-emerald-400 font-medium">{BOT_NAME}</span>
        </p>
        <p
          className={`text-xs text-muted-foreground/70 mb-8 transition-all duration-500 delay-100 ${
            phaseIndex >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          Let's build something amazing together 🚀
        </p>

        {/* Continue button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={phaseIndex < 3}
          className={`group flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-500 ${
            phaseIndex >= 3
              ? "opacity-100 translate-y-0 hover:scale-105 hover:shadow-emerald-500/50 active:scale-95"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          Continue to Chat
          <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
        </button>

        {/* Skip hint */}
        {phaseIndex >= 3 && (
          <p className="mt-4 text-[10px] text-muted-foreground/50 animate-pulse">
            Click anywhere or press Continue
          </p>
        )}
      </div>

      {/* Click anywhere to dismiss after button appears */}
      {phaseIndex >= 3 && (
        <div
          className="absolute inset-0 z-0"
          onClick={handleClose}
        />
      )}
    </div>
  );
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Firework {
  id: number;
  x: number;
  y: number;
}
