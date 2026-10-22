"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
import {
  Send,
  Trash2,
  Square,
  X,
  Heart,
  Plus,
  MessageCircle,
  Menu,
  UserCircle,
  Sparkle,
  Sunrise,
  Wind,
  Zap,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChatMessage, type Message, type ChatRole } from "@/components/chat/chat-message";
import { AuthGate } from "@/components/chat/auth-gate";

import { PrivacyTerms } from "@/components/chat/privacy-terms";
import { AccountPortal } from "@/components/chat/account-portal";
import { WelcomeScreen } from "@/components/chat/welcome-screen";

import {
  BOT_NAME,
  buildWelcomeMessage,
  DISCLAIMER_FOOTER,
} from "@/lib/chat-config";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

interface SessionInfo {
  id: string;
  title: string;
  updatedAt: string;
  preview?: string;
  _count?: { chats: number };
}

interface VisitorCtx {
  name: string;
  visitorId: string;
  email?: string;
  isGuest?: boolean;
}

const VISITOR_STORAGE_KEY = "pulse:auth";
const GUEST_MSG_COUNT_KEY = "pulse:guest-msg-count";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SUGGESTIONS = [
  "I'm stressed",
  "I'm burned out",
  "I feel alone",
  "I failed my exam",
  "I can't focus",
  "I need motivation",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallToast, setShowInstallToast] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [visitor, setVisitor] = useState<VisitorCtx | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [guestMsgCount, setGuestMsgCount] = useState(0);

  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const isFreshLoad = !nav || nav.type === "navigate" || nav.type === "reload";
    if (!isFreshLoad) {
      setShowWelcome(false);
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    if (!visitor?.visitorId) return;
    try {
      const res = await fetch(`/api/usage?visitorId=${visitor.visitorId}`);
      if (!res.ok) return;
      const data = await res.json();
      setIsPro(Boolean(data.isPro));
    } catch {}
  }, [visitor?.visitorId]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(VISITOR_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<VisitorCtx>;
        if (parsed?.name && parsed?.visitorId) {
          setVisitor({
            name: parsed.name,
            visitorId: parsed.visitorId,
            email: parsed.email,
            isGuest: parsed.isGuest,
          });
        }
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!visitor) return;
    try {
      const count = localStorage.getItem(`${GUEST_MSG_COUNT_KEY}:${visitor.visitorId}`);
      if (count) setGuestMsgCount(parseInt(count, 10) || 0);
    } catch {}
  }, [visitor]);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        createNewSession();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleInstallApp = async () => {
    if (!installPromptEvent) {
      setShowInstallToast(true);
      setTimeout(() => setShowInstallToast(false), 5000);
      return;
    }
    installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice.outcome === "accepted") {
      toast({
        title: "PULSE is on your home screen",
        description: "Come back anytime. Thanks for installing!",
      });
    }
    setInstallPromptEvent(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_login") === "1") {
      fetch("/api/auth/me").then((r) => r.json()).then((data) => {
        if (data.visitorId && data.name) {
          const authData = { name: data.name, visitorId: data.visitorId, email: data.email, isGuest: false };
          localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(authData));
          setVisitor(authData);
          try { sessionStorage.setItem("pulse:just-logged-in", "1"); } catch {}
          window.history.replaceState({}, "", window.location.pathname);
        }
      }).catch(() => {});
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    if (!visitor) return;
    try {
      const res = await fetch(`/api/sessions?visitorId=${visitor.visitorId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {}
  }, [visitor]);

  const fetchMessages = useCallback(async (sessionId: string) => {
    if (!visitor) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}?visitorId=${visitor.visitorId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: new Date(m.createdAt).getTime(),
          })));
        }
      }
    } catch {}
  }, [visitor]);

  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
    }
  }, [currentSessionId, fetchMessages]);

  useEffect(() => {
    if (visitor) {
      fetchSessions();
    }
  }, [visitor, fetchSessions]);

  const incrementGuestMsgCount = useCallback(() => {
    if (!visitor?.isGuest) return;
    const newCount = guestMsgCount + 1;
    setGuestMsgCount(newCount);
    try {
      localStorage.setItem(`${GUEST_MSG_COUNT_KEY}:${visitor.visitorId}`, String(newCount));
    } catch {}
    if (newCount >= 5) {
      setShowLoginPrompt(true);
    }
  }, [guestMsgCount, visitor]);

  const createNewSession = useCallback(async () => {
    if (!visitor) return;
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: visitor.visitorId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentSessionId(data.session.id);
        setMessages([{ id: "welcome", role: "assistant", content: buildWelcomeMessage(visitor.name), createdAt: Date.now() }]);
        fetchSessions();
      }
    } catch {}
  }, [visitor, fetchSessions]);

  const switchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    fetchMessages(sessionId);
    setSidebarOpen(false);
  }, [fetchMessages]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!visitor) return;
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (sessionId === currentSessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          switchSession(remaining[0].id);
        } else {
          createNewSession();
        }
      }
      toast({ title: "Space deleted." });
    } catch {}
  }, [visitor, currentSessionId, sessions, createNewSession, switchSession]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: streaming ? "auto" : "smooth",
      });
    }
  }, [messages, loading, streaming]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  const postFeedback = useCallback(async (messageId: string, rating: "up" | "down") => {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: DEFAULT_MODEL_ID, rating }),
      });
    } catch {}
  }, []);

  const send = useCallback(
    async (rawText?: string) => {
      const text = (rawText ?? input).trim();
      if (!text || loading) return;

      if (!currentSessionId) {
        await createNewSession();
        if (!currentSessionId) return;
      }

      const userMsg: Message = {
        id: uid(),
        role: "user" as ChatRole,
        content: text,
        createdAt: Date.now(),
      };
      const history = [...messages, userMsg];
      setMessages(history);
      setInput("");
      setLoading(true);
      setStreaming(true);

      const botId = uid();
      setMessages((prev) => [
        ...prev,
        {
          id: botId,
          role: "assistant" as ChatRole,
          content: "",
          createdAt: Date.now(),
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            visitorName: visitor?.name,
            modelId: DEFAULT_MODEL_ID,
            sessionId: currentSessionId,
          }),
        });

        if (!res.ok || !res.body) {
          const errBody = await res.json().catch(() => ({}));
          if (res.status === 403) {
            setShowUpgradeModal(true);
          }
          throw new Error(errBody?.error || `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;

            try {
              const json = JSON.parse(payload) as
                | { token?: string; done?: boolean; error?: string; started?: boolean; sessionId?: string };

              if (json.error) {
                throw new Error(json.error);
              }
              if (json.started) {
                setThinking(true);
              }
              if (typeof json.token === "string" && json.token.length > 0) {
                setThinking(false);
                accumulated += json.token;
                const snapshot = accumulated;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId ? { ...m, content: snapshot } : m
                  )
                );
              }
              if (json.done && json.sessionId) {
                setCurrentSessionId(json.sessionId);
              }
            } catch {
            }
          }
        }

        const finalText =
          accumulated ||
          "I'm having trouble connecting right now — give me a moment and try again. I'm still here.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? { ...m, content: finalText }
              : m
          )
        );

        incrementGuestMsgCount();
        fetchSessions();
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId && m.content.trim().length > 0
                ? { ...m, content: m.content + "\n\n_…paused — pick up whenever you're ready._" }
                : m
            )
          );
        } else {
          const msg = e instanceof Error ? e.message : "Unknown error";
          toast({
            title: "PULSE couldn't respond",
            description: msg,
            variant: "destructive",
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId
                ? {
                    ...m,
                    content:
                      "Something went wrong on my end. Your words didn't disappear — try sending that again in a moment.",
                  }
                : m
            )
          );
        }
      } finally {
        setLoading(false);
        setStreaming(false);
        setThinking(false);
        abortRef.current = null;
        void refreshUsage();
      }
    },
    [input, loading, messages, toast, visitor, currentSessionId, refreshUsage, createNewSession, fetchSessions, incrementGuestMsgCount]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    } catch {
    }
    try {
      localStorage.removeItem(VISITOR_STORAGE_KEY);
    } catch {
    }
    setVisitor(null);
    setMessages([]);
    setSessions([]);
    setCurrentSessionId(null);
    setPrivacyOpen(false);
    toast({
      title: "Signed out",
      description: "Your space is waiting whenever you need it.",
    });
  };

  if (showWelcome) {
    return <WelcomeScreen onEnter={() => setShowWelcome(false)} />;
  }

  if (!visitor) {
    return (
      <AuthGate
        onReady={(info) => {
          setVisitor(info);
        }}
      />
    );
  }

  const InputBar = (
    <div className="mx-auto max-w-3xl w-full">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-muted-foreground/30 transition-all">
        <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="Say what's on your mind…" rows={1} className="min-h-[36px] resize-none border-0 bg-transparent px-1 py-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" disabled={streaming} />
        {streaming ? (
          <Button type="button" size="icon" onClick={stopGeneration} className="h-9 w-9 shrink-0 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all" aria-label="Stop">
            <Square className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button type="button" size="icon" onClick={() => void send()} disabled={!input.trim()} className="h-9 w-9 shrink-0 rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 transition-all" aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="mt-1.5 px-1 text-[10px] leading-relaxed text-muted-foreground">
        {streaming ? (
          <span className="inline-flex items-center gap-1.5 text-foreground/70">
            <span className="h-1 w-1 animate-pulse rounded-full bg-foreground/70" />
            {thinking ? "Typing…" : "Responding…"}
          </span>
        ) : (
          DISCLAIMER_FOOTER
        )}
        {visitor.isGuest && guestMsgCount > 0 && (
          <span className="ml-2 text-[10px] text-muted-foreground/60">
            {guestMsgCount}/5 messages — sign in to continue
          </span>
        )}
      </p>
    </div>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      {showLoginPrompt && visitor?.isGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowLoginPrompt(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Heart className="h-7 w-7 text-foreground" />
              </div>
              <h2 className="text-lg font-bold">Continue your conversation</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You&apos;ve used your 5 free anonymous messages. Create an account to save your chat history and keep talking.
              </p>
              <div className="mt-5 flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowLoginPrompt(false)}>
                  Later
                </Button>
                <Button type="button" className="flex-1 bg-gradient-to-r from-slate-500 to-slate-700 text-white" onClick={() => { setShowLoginPrompt(false); setAccountOpen(true); }}>
                  Sign up / Log in
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} aria-hidden />
          <div className="relative flex h-full w-72 flex-col bg-background border-r border-border">
            <div className="flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <img src="/pulse-logo.png" alt="PULSE" className="h-8 w-8 rounded-lg object-cover" />
                <span className="text-sm font-semibold">PULSE</span>
              </div>
              <button type="button" onClick={() => setSidebarOpen(false)} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close sidebar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 space-y-1">
              <button type="button" onClick={() => { createNewSession(); setSidebarOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Plus className="h-4 w-4" /> New Space
              </button>
              <button type="button" onClick={() => { setAccountOpen(true); setSidebarOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <UserCircle className="h-4 w-4" /> Account
              </button>
            </div>
            <div className="chat-scroll min-h-0 flex-1 overflow-y-auto border-t border-border px-2 py-2">
              {sessions.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">No spaces yet.</p>
              ) : (
                <ul className="space-y-0.5">
                  {sessions.map((s) => (
                    <li key={s.id} className="group relative">
                      <button type="button" onClick={() => { switchSession(s.id); setSidebarOpen(false); }} className={cn("flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-muted", s.id === currentSessionId && "bg-muted text-foreground")}>
                        <div className="min-w-0 flex-1 pr-5">
                          <p className="truncate font-medium">{s.title}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                            {s.preview || new Date(s.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${s.title}"?`)) void deleteSession(s.id); }} className="absolute right-2 top-2 hidden h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground group-hover:flex" aria-label="Delete">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-border p-3">
              <button type="button" onClick={() => { setAccountOpen(true); setSidebarOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <UserCircle className="h-4 w-4" /> Account
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col border-r border-border bg-background">
        <div className="flex items-center gap-2 border-b border-border bg-background/80 backdrop-blur-xl px-4 py-3">
          <img src="/pulse-logo.png" alt="PULSE" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-sm font-semibold">PULSE</span>
        </div>
        <div className="p-3 space-y-1">
          <button type="button" onClick={() => createNewSession()} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Plus className="h-4 w-4" /> New Space
          </button>
          <button type="button" onClick={() => setAccountOpen(true)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <UserCircle className="h-4 w-4" /> Account
          </button>
        </div>
        <div className="chat-scroll min-h-0 flex-1 overflow-y-auto border-t border-border px-2 py-2">
          {sessions.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No spaces yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {sessions.map((s) => (
                <li key={s.id} className="group relative">
                  <button type="button" onClick={() => switchSession(s.id)} className={cn("flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-muted", s.id === currentSessionId && "bg-muted text-foreground")}>
                    <div className="min-w-0 flex-1 pr-5">
                      <p className="truncate font-medium">{s.title}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                        {s.preview || new Date(s.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${s.title}"?`)) void deleteSession(s.id); }} className="absolute right-2 top-2 hidden h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground group-hover:flex" aria-label="Delete">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border p-3">
          <button type="button" onClick={() => setAccountOpen(true)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <UserCircle className="h-4 w-4" /> Account
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setSidebarOpen(true); fetchSessions(); }} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden" aria-label="Open sidebar">
                <Menu className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => createNewSession()} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="New space" title="New space (Ctrl+K)">
                <Plus className="h-4 w-4" />
              </button>
              {isPro ? (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] text-foreground"><Zap className="h-3 w-3" /> PULSE Pro</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button type="button" onClick={() => setAccountOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Account">
                <UserCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main ref={scrollRef} className="chat-scroll min-h-0 flex-1 scroll-smooth pb-[120px]">
          {messages.length <= 1 && !loading ? (
            <div className="flex flex-col items-center justify-center px-4 pt-[10vh] sm:pt-[14vh]">
              {/* Logo */}
              <div className="relative mb-6">
                <div className="absolute inset-0 -m-1.5 rounded-2xl bg-muted/30 blur-lg" />
                {/* Red pulse ring on load */}
                <span className="absolute -inset-1.5 rounded-2xl border-2 border-red-500/60 animate-pulse-ring-load opacity-0" />
                <img src="/pulse-logo.png" alt="PULSE" className="relative h-16 w-16 rounded-xl shadow-lg object-contain" />
              </div>

              {/* Value prop (PRD §2: the First 30 Seconds) */}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1.5 text-center">Feeling heavy?</h1>
              <p className="text-sm text-muted-foreground mb-8 text-center">Let&apos;s lighten the load together.</p>

              {/* Input */}
              <div className="w-full max-w-xl">
                <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:shadow-md focus-within:border-muted-foreground/30 transition-all duration-200">
                  <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="What's on your mind?" rows={1} className="min-h-[36px] resize-none border-0 bg-transparent px-1 py-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" disabled={streaming} />
                  <Button type="button" size="icon" onClick={() => void send()} disabled={!input.trim()} className="h-9 w-9 shrink-0 rounded-xl bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 transition-all" aria-label="Send message">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Emotional suggestion chips */}
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                      className="rounded-full border border-border bg-card/50 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-muted-foreground/30 active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Trust cards */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 backdrop-blur-sm p-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Heard first</p>
                      <p className="text-[11px] text-muted-foreground">No lectures, no judgment</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 backdrop-blur-sm p-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Then guided</p>
                      <p className="text-[11px] text-muted-foreground">One tiny step, together</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 backdrop-blur-sm p-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Sparkle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Stays private</p>
                      <p className="text-[11px] text-muted-foreground">Conversations saved for continuity</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-8 max-w-md text-center text-[10px] text-muted-foreground">{DISCLAIMER_FOOTER}</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl pb-4">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} isStreaming={streaming && m.id === messages[messages.length - 1]?.id && m.role === "assistant"} isThinking={thinking && m.id === messages[messages.length - 1]?.id && m.role === "assistant"} onFeedback={postFeedback} />
              ))}
              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex w-full py-4">
                  <div className="w-full max-w-3xl mx-auto px-4">
                    <div className="flex items-center gap-3">
                      <span className="relative flex items-center gap-1">
                        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/40" />
                        <span className="relative h-2 w-2 animate-pulse-dot rounded-full bg-primary" />
                        <span className="relative h-2 w-2 animate-pulse-dot rounded-full bg-primary [animation-delay:150ms]" />
                        <span className="relative h-2 w-2 animate-pulse-dot rounded-full bg-primary [animation-delay:300ms]" />
                      </span>
                      <span className="text-sm text-muted-foreground">Typing…</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Sticky bottom input — mobile-first (PRD §7) */}
        {messages.length > 1 && (
          <div className="shrink-0 fixed bottom-0 inset-x-0 lg:static border-t border-border bg-background/95 backdrop-blur-xl">
            {InputBar}
          </div>
        )}
      </div>

      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowUpgradeModal(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Moon className="h-7 w-7 text-foreground" />
              </div>
              <h2 className="text-lg font-bold">PULSE Pro</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You&apos;ve had today&apos;s free check-ins. Upgrade to <strong className="text-foreground">PULSE Pro</strong> ($5–9/mo) for:
              </p>
              <ul className="mt-4 space-y-2 text-left text-sm">
                <li className="flex items-start gap-2"><Zap className="mt-0.5 h-4 w-4 text-foreground shrink-0" /> Unlimited check-ins, every day</li>
                <li className="flex items-start gap-2"><Sunrise className="mt-0.5 h-4 w-4 text-foreground shrink-0" /> Deep Dive sessions with longer memory</li>
                <li className="flex items-start gap-2"><Wind className="mt-0.5 h-4 w-4 text-foreground shrink-0" /> Custom personas: Strict Coach or Gentle Listener</li>
                <li className="flex items-start gap-2"><Sparkle className="mt-0.5 h-4 w-4 text-foreground shrink-0" /> Journal summaries you can export (PDF)</li>
              </ul>
              <div className="mt-5 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                Free check-ins reset daily at midnight UTC — PULSE will be here.
              </div>
              <div className="mt-5 flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowUpgradeModal(false)}>
                  I&apos;ll be back
                </Button>
                <Button type="button" className="flex-1 bg-gradient-to-r from-slate-500 to-slate-700 text-white" onClick={() => { setShowUpgradeModal(false); setAccountOpen(true); }}>
                  Notify me
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PrivacyTerms open={privacyOpen} onOpenChange={setPrivacyOpen} />

      <AccountPortal
        open={accountOpen}
        onOpenChange={setAccountOpen}
        visitor={visitor}
        onSignOut={signOut}
        onPrivacyOpen={() => setPrivacyOpen(true)}
        onInstallApp={handleInstallApp}
        onNameUpdate={(newName) => {
          setVisitor((prev) => prev ? { ...prev, name: newName } : prev);
          try {
            const cached = localStorage.getItem(VISITOR_STORAGE_KEY);
            if (cached) {
              const parsed = JSON.parse(cached);
              parsed.name = newName;
              localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(parsed));
            }
          } catch {}
        }}
        onAccountDeleted={() => {
          setVisitor(null);
          setMessages([]);
          setSessions([]);
          setCurrentSessionId(null);
          setPrivacyOpen(false);
          setAccountOpen(false);
          try { localStorage.removeItem(VISITOR_STORAGE_KEY); } catch {}
        }}
      />

      {showInstallToast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 animate-float-up">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-2xl max-w-sm">
            <Send className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5 rotate-45" />
            <div className="text-xs">
              <p className="font-semibold text-foreground mb-1">
                Install PULSE
              </p>
              <p className="text-muted-foreground">To install the app:</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li>• Chrome: tap the ⋮ menu → "Install app"</li>
                <li>• Safari: tap Share → "Add to Home Screen"</li>
                <li>• Edge: tap ⋮ → "Add to phone"</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setShowInstallToast(false)}
              className="ml-1 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}