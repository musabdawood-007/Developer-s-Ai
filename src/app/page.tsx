"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  Trash2,
  Loader2,
  FileText,
  Mail,
  Square,
  LogOut,
  Paperclip,
  X,
  Image as ImageIcon,
  Download,
  Sparkle,
  Smartphone,
  Plus,
  MessageCircle,
  Menu,
  Clock,
  UserCircle,
  ChevronDown,
  Lock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ChatMessage, type Message, type ChatRole } from "@/components/chat/chat-message";
import { AuthGate } from "@/components/chat/auth-gate";

import { PrivacyTerms } from "@/components/chat/privacy-terms";
import { AccountPortal } from "@/components/chat/account-portal";
import { WelcomeScreen } from "@/components/chat/welcome-screen";
import { PatchNotesModal } from "@/components/chat/patch-notes-modal";

import {
  BOT_NAME,
  DEVELOPER_INFO,
  buildWelcomeMessage,
} from "@/lib/chat-config";
import { MODELS, DEFAULT_MODEL_ID, MODEL_STORAGE_KEY, getModel } from "@/lib/models";
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
}

const VISITOR_STORAGE_KEY = "devai:auth";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SUGGESTIONS = [
  "Explain React hooks",
  "Write a Python function",
  "Debug my code",
  "Generate a logo",
  "Compare SQL vs NoSQL",
  "Create a REST API",
];

const MD_TRIGGERS = [
  "generate a markdown",
  "generate a .md",
  "generate markdown",
  "create a markdown",
  "create a .md",
  "create markdown",
  "make a markdown",
  "make a .md",
  "make markdown",
  "write a markdown",
  "write a .md",
  "write me a readme",
  "write a readme",
  "generate a readme",
  "create a readme",
  "make a readme",
  "build a markdown",
  "produce a markdown",
  "markdown file",
];

function isMarkdownRequest(text: string) {
  const lower = text.toLowerCase();
  return MD_TRIGGERS.some((t) => lower.includes(t));
}

function looksLikeMarkdownFile(content: string) {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```(?:md|markdown)\s*\n([\s\S]*?)\n```$/);
  if (fenceMatch) return true;
  if (trimmed.startsWith("#") && trimmed.length > 200) return true;
  return false;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageGenOpen, setImageGenOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [showInstallToast, setShowInstallToast] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDevCard, setShowDevCard] = useState(false);

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [visitor, setVisitor] = useState<VisitorCtx | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const syncingFromSandbox = useRef(false);
  const { toast } = useToast();

  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [usage, setUsage] = useState<Record<string, { used: number; remaining: number; dailyLimit: number; locked: boolean }>>({});
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showPatchNotes, setShowPatchNotes] = useState(false);


  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const isFreshLoad = !nav || nav.type === "navigate" || nav.type === "reload";
    if (!isFreshLoad) {
      setShowWelcome(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODEL_STORAGE_KEY);
      if (saved && getModel(saved)) {
        setSelectedModelId(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, selectedModelId);
    } catch {}
  }, [selectedModelId]);

  const refreshUsage = useCallback(async () => {
    if (!visitor?.visitorId) return;
    try {
      const res = await fetch(`/api/usage?visitorId=${visitor.visitorId}`);
      if (!res.ok) return;
      const data = await res.json();
      setIsPro(data.isPro || false);
      const map: Record<string, { used: number; remaining: number; dailyLimit: number; locked: boolean }> = {};
      for (const m of data.models || []) {
        map[m.id] = {
          used: m.used,
          remaining: m.remaining,
          dailyLimit: m.dailyLimit,
          locked: m.locked,
        };
      }
      setUsage(map);
    } catch {}
  }, [visitor?.visitorId]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // Show patch notes once after login if user hasn't seen the latest version
  useEffect(() => {
    if (!visitor) return;
    try {
      const seenVersion = localStorage.getItem("devai:patch-version");
      const currentVersion = "v2.5"; // bump this when shipping new patch
      if (seenVersion !== currentVersion) {
        setShowPatchNotes(true);
        localStorage.setItem("devai:patch-version", currentVersion);
      }
    } catch {}
  }, [visitor]);

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
          });
        }
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
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
        title: "App installed!",
        description: "Find it on your home screen. Thanks for installing!",
      });
    }
    setInstallPromptEvent(null);
  };

  useEffect(() => {
    if (!visitor) return;
    const storageKey = `devai:chat-sessions:${visitor.visitorId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { sessions: SessionInfo[]; currentSessionId: string; messages: Record<string, Message[]> };
        if (parsed.sessions?.length > 0) {
          const sessionsWithPreview = parsed.sessions.map((s) => {
            const msgs = parsed.messages?.[s.id];
            const lastMsg = msgs?.filter((m) => m.role === "user").pop();
            return { ...s, preview: lastMsg?.content?.slice(0, 50) || "" };
          });
          setSessions(sessionsWithPreview);
          setCurrentSessionId(parsed.currentSessionId || parsed.sessions[0].id);
          const msgs = parsed.messages?.[parsed.currentSessionId || parsed.sessions[0].id];
          if (msgs && msgs.length > 0) {
            setMessages(msgs);
          } else {
            setMessages([{ id: "welcome", role: "assistant", content: buildWelcomeMessage(visitor.name), createdAt: Date.now() }]);
          }
          return;
        }
      }
    } catch {}
    createNewSession();
  }, [visitor]);

  useEffect(() => {
    const handleSessionsChanged = () => {
      if (!visitor) return;
      syncingFromSandbox.current = true;
      const storageKey = `devai:chat-sessions:${visitor.visitorId}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as { sessions: SessionInfo[]; currentSessionId: string; messages: Record<string, Message[]> };
          if (parsed.sessions) {
            const sessionsWithPreview = parsed.sessions.map((s) => {
              const msgs = parsed.messages?.[s.id];
              const lastMsg = msgs?.filter((m) => m.role === "user").pop();
              return { ...s, preview: lastMsg?.content?.slice(0, 50) || "" };
            });
            setSessions(sessionsWithPreview);
            if (parsed.currentSessionId && parsed.currentSessionId !== currentSessionId) {
              setCurrentSessionId(parsed.currentSessionId);
              const msgs = parsed.messages?.[parsed.currentSessionId];
              if (msgs && msgs.length > 0) {
                setMessages(msgs);
              }
            } else if (!parsed.sessions.find((s) => s.id === currentSessionId)) {
              if (parsed.sessions.length > 0) {
                setCurrentSessionId(parsed.sessions[0].id);
                const msgs = parsed.messages?.[parsed.sessions[0].id];
                setMessages(msgs && msgs.length > 0 ? msgs : [{ id: "welcome", role: "assistant", content: buildWelcomeMessage(visitor.name), createdAt: Date.now() }]);
              } else {
                createNewSession();
              }
            }
          }
        } else {
          setSessions([]);
          createNewSession();
        }
      } catch {}
      setTimeout(() => { syncingFromSandbox.current = false; }, 100);
    };
    window.addEventListener("devai:sessions-changed", handleSessionsChanged);
    return () => window.removeEventListener("devai:sessions-changed", handleSessionsChanged);
  }, [visitor, currentSessionId]);

  const saveToLocalStorage = useCallback(() => {
    if (!visitor || !currentSessionId || syncingFromSandbox.current) return;
    const storageKey = `devai:chat-sessions:${visitor.visitorId}`;
    try {
      let allMessages: Record<string, Message[]> = {};
      try {
        const existing = localStorage.getItem(storageKey);
        if (existing) {
          const parsed = JSON.parse(existing) as { messages?: Record<string, Message[]> };
          if (parsed.messages) allMessages = { ...parsed.messages };
        }
      } catch {}

      allMessages[currentSessionId] = messages.filter(m => m.id !== "welcome");

      const sessionsWithPreview = sessions.map((s) => {
        const msgs = allMessages[s.id];
        const lastMsg = msgs?.filter((m) => m.role === "user").pop();
        return { ...s, preview: lastMsg?.content?.slice(0, 50) || s.preview || "" };
      });

      const data = { sessions: sessionsWithPreview, currentSessionId, messages: allMessages };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {}
  }, [visitor, sessions, currentSessionId, messages]);

  useEffect(() => { saveToLocalStorage(); }, [saveToLocalStorage]);

  const createNewSession = () => {
    if (!visitor) return;
    const newSession: SessionInfo = {
      id: uid(),
      title: "New Chat",
      updatedAt: new Date().toISOString(),
      preview: "",
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: buildWelcomeMessage(visitor.name),
        createdAt: Date.now(),
      },
    ]);
    setSidebarOpen(false);
  };

  const switchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    const storageKey = `devai:chat-sessions:${visitor?.visitorId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { messages: Record<string, Message[]> };
        const msgs = parsed.messages?.[sessionId];
        if (msgs && msgs.length > 0) {
          setMessages(msgs);
        } else {
          setMessages([{ id: "welcome", role: "assistant", content: buildWelcomeMessage(visitor?.name || "Friend"), createdAt: Date.now() }]);
        }
      }
    } catch {
      setMessages([{ id: "welcome", role: "assistant", content: buildWelcomeMessage(visitor?.name || "Friend"), createdAt: Date.now() }]);
    }
    setSidebarOpen(false);
  };

  const refreshSessions = useCallback(() => {
    if (!visitor) return;
    const storageKey = `devai:chat-sessions:${visitor.visitorId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { sessions: SessionInfo[] };
        setSessions(parsed.sessions || []);
      }
    } catch {}
  }, [visitor]);

  const deleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (sessionId === currentSessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      if (remaining.length > 0) {
        switchSession(remaining[0].id);
      } else {
        createNewSession();
      }
    }
    toast({ title: "Chat deleted." });
  };

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

  const send = useCallback(
    async (rawText?: string) => {
      const text = (rawText ?? input).trim();
      const images = [...pendingImages];
      if ((!text && images.length === 0) || loading) return;

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: text || (images.length > 0 ? "(image attached)" : ""),
        images: images.length > 0 ? images : undefined,
        createdAt: Date.now(),
      };
      const history = [...messages, userMsg];
      setMessages(history);
      setInput("");
      setPendingImages([]);
      setLoading(true);
      setStreaming(true);

      const lower = text.toLowerCase();
      if (
        /developer|musab|who (made|built|created)|about you|about your maker/.test(
          lower
        )
      ) {
        setShowDevCard(true);
      }

      const botId = uid();
      const wasMarkdownRequest = isMarkdownRequest(text);
      setMessages((prev) => [
        ...prev,
        {
          id: botId,
          role: "assistant",
          content: "",
          asMarkdownFile: wasMarkdownRequest,
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
            messages: history.map((m) => ({
              role: m.role,
              content: m.content,
              ...(m.images ? { images: m.images } : {}),
            })),
            visitorName: visitor?.name,
            modelId: selectedModelId,
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
                | { token?: string; done?: boolean; error?: string; started?: boolean; generatedImage?: string; generatedImagePrompt?: string; imageProgress?: number };

              if (json.error) {
                throw new Error(json.error);
              }
              if (json.started) {
                setThinking(true);
              }
              if (typeof json.imageProgress === "number") {
                setThinking(false);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId
                      ? { ...m, imageProgress: json.imageProgress }
                      : m
                  )
                );
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
              if (json.generatedImage) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId
                      ? {
                          ...m,
                          content: accumulated,
                          generatedImage: json.generatedImage,
                          generatedImagePrompt: json.generatedImagePrompt,
                        }
                      : m
                  )
                );
              }
            } catch {
            }
          }
        }

        const finalText =
          accumulated ||
          "Sorry, I didn't get a response. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? {
                  ...m,
                  content: finalText,
                  asMarkdownFile:
                    wasMarkdownRequest || looksLikeMarkdownFile(finalText),
                }
              : m
          )
        );
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId && m.content.trim().length > 0
                ? { ...m, content: m.content + "\n\n_…stopped_" }
                : m
            )
          );
        } else {
          const msg = e instanceof Error ? e.message : "Unknown error";
          toast({
            title: "Chat error",
            description: msg,
            variant: "destructive",
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId
                ? {
                    ...m,
                    content:
                      "⚠️ Something went wrong reaching the model. Please try again in a moment.",
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
    [input, loading, messages, toast, visitor, pendingImages, currentSessionId, refreshSessions]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Unsupported file",
          description: `${file.name} is not an image. Only images are supported.`,
          variant: "destructive",
        });
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is over 5MB. Please choose a smaller image.`,
          variant: "destructive",
        });
        continue;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        newImages.push(dataUrl);
      } catch {
        // ignore
      }
    }

    if (newImages.length > 0) {
      setPendingImages((prev) => [...prev, ...newImages].slice(0, 4));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingImage = (idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleHideMessage = useCallback(
    (id: string) => {
      if (id === "welcome") return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
    },
    []
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const handleGenerateImage = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt || generatingImage) return;

    setGeneratingImage(true);

    const placeholderId = uid();
    setMessages((prev) => [
      ...prev,
      {
        id: placeholderId,
        role: "assistant",
        content: `🎨 Generating image: **${prompt}**…`,
        createdAt: Date.now(),
      },
    ]);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size: "1024x1024" }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || "Image generation failed.");
      }

      const data = (await res.json()) as { imageDataUrl: string };

      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content: `🎨 **Generated image** for:`,
                generatedImage: data.imageDataUrl,
                generatedImagePrompt: prompt,
              }
            : m
        )
      );

      setImagePrompt("");
      setImageGenOpen(false);
      toast({ title: "Image generated!", description: "Check it out in the chat." });
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content: `⚠️ Couldn't generate that image: ${e instanceof Error ? e.message : "Unknown error"}`,
              }
            : m
        )
      );
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const clearChat = () => {
    createNewSession();
    setShowDevCard(false);
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
    }
    try {
      if (visitor) localStorage.removeItem(`devai:chat-sessions:${visitor.visitorId}`);
      localStorage.removeItem(VISITOR_STORAGE_KEY);
    } catch {
    }
    setVisitor(null);
    setMessages([]);
    setSessions([]);
    setCurrentSessionId(null);
    setShowDevCard(false);
    setPrivacyOpen(false);
    toast({
      title: "Signed out",
      description: "You can sign back in with your name and password.",
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

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} aria-hidden />
          <div className="relative flex h-full w-72 flex-col bg-background border-r border-border animate-slide-in-right">
            <div className="flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-4 py-3">
              <img src="/custom-logo.png" alt="Developer's Ai" className="h-8 w-8 rounded-lg object-cover" />
              <button type="button" onClick={() => setSidebarOpen(false)} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close sidebar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 space-y-1">
              <button type="button" onClick={() => { createNewSession(); setSidebarOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Plus className="h-4 w-4" /> New Chat
              </button>
              <button type="button" onClick={() => { setImageGenOpen(true); setSidebarOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Sparkle className="h-4 w-4" /> Image Gen
              </button>
              <button type="button" onClick={() => { setAccountOpen(true); setSidebarOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <UserCircle className="h-4 w-4" /> Account
              </button>
            </div>
            <div className="chat-scroll min-h-0 flex-1 overflow-y-auto border-t border-border px-2 py-2">
              {sessions.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">No chats yet.</p>
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
          <img src="/custom-logo.png" alt="Developer's Ai" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-sm font-semibold">Developer's Ai</span>
        </div>
        <div className="p-3 space-y-1">
          <button type="button" onClick={() => createNewSession()} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Plus className="h-4 w-4" /> New Chat
          </button>
          <button type="button" onClick={() => setImageGenOpen(true)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Sparkle className="h-4 w-4" /> Image Gen
          </button>
          <button type="button" onClick={() => setAccountOpen(true)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <UserCircle className="h-4 w-4" /> Account
          </button>
        </div>
        <div className="chat-scroll min-h-0 flex-1 overflow-y-auto border-t border-border px-2 py-2">
          {sessions.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No chats yet.</p>
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
              <button type="button" onClick={() => { setSidebarOpen(true); refreshSessions(); }} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden" aria-label="Open sidebar">
                <Menu className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => createNewSession()} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="New chat" title="New chat (Ctrl+K)">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground mr-1">
                <kbd className="font-mono">Ctrl+K</kbd> New
              </span>
              <ThemeToggle />
              <button type="button" onClick={() => setAccountOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Account">
                <UserCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main ref={scrollRef} className="chat-scroll min-h-0 flex-1 scroll-smooth">
          {messages.length <= 1 && !loading ? (
            <div className="flex flex-col items-center justify-center px-4 pt-[15vh]">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">What can I help you with?</h1>
              <p className="text-sm text-muted-foreground mb-8">Ask anything — coding, writing, brainstorming, and more.</p>
              <div className="w-full max-w-2xl">
                <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-muted-foreground/30 transition-all">
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => void handleFileSelect(e)} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={streaming || pendingImages.length >= 4} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 disabled:opacity-40" aria-label="Attach image">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="Message Developer's Ai..." rows={1} className="min-h-[36px] resize-none border-0 bg-transparent px-1 py-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" disabled={streaming} />
                  <Button type="button" size="icon" onClick={() => void send()} disabled={!input.trim() && pendingImages.length === 0} className="h-9 w-9 shrink-0 rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 transition-all" aria-label="Send message">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                      className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-muted-foreground/30"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={() => textareaRef.current?.focus()} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-muted">
                    <MessageCircle className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Chat</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Get fast and accurate answers from Developer's Ai.</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => setImageGenOpen(true)} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-muted">
                    <Sparkle className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Image Generation</p>
                        <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">NEW</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Create images with AI from text descriptions.</p>
                    </div>
                  </button>
                </div>
                {pendingImages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 rounded-lg border border-border bg-card p-2">
                    {pendingImages.map((img, idx) => (
                      <div key={idx} className="group relative">
                        <img src={img} alt={`Pending ${idx + 1}`} className="h-16 w-16 rounded-md border border-border object-cover" />
                        <button type="button" onClick={() => removePendingImage(idx)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted border border-border text-foreground shadow-sm transition-transform hover:scale-110" aria-label="Remove image">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} isStreaming={streaming && m.id === messages[messages.length - 1]?.id && m.role === "assistant"} isThinking={thinking && m.id === messages[messages.length - 1]?.id && m.role === "assistant"} onHide={m.id === "welcome" ? undefined : handleHideMessage} />
              ))}
              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex w-full py-4">
                  <div className="w-full max-w-3xl mx-auto px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-6 w-6 items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20 border-t-foreground animate-spin" />
                        <div className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                      </div>
                      <span className="text-sm text-muted-foreground">Thinking…</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {messages.length > 1 && (
          <div className="shrink-0 border-t border-border bg-background">
            <div className="mx-auto max-w-3xl px-3 py-2">
              {imageGenOpen && (
                <div className="mb-2 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">Image Generation</span>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleGenerateImage(); } }} placeholder="Describe the image you want..." className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none" autoFocus disabled={generatingImage} />
                    <Button type="button" size="sm" onClick={() => void handleGenerateImage()} disabled={!imagePrompt.trim() || generatingImage} className="h-10 gap-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-all">
                      {generatingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkle className="h-4 w-4" />}
                      Generate
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-muted-foreground/30 transition-all">
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => void handleFileSelect(e)} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={streaming || pendingImages.length >= 4} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 disabled:opacity-40" aria-label="Attach image">
                  <Paperclip className="h-4 w-4" />
                </button>
                <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="Ask a follow-up" rows={1} className="min-h-[36px] resize-none border-0 bg-transparent px-1 py-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" disabled={streaming} />
                {streaming ? (
                  <Button type="button" size="icon" onClick={stopGeneration} className="h-9 w-9 shrink-0 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all" aria-label="Stop">
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                ) : (
                  <Button type="button" size="icon" onClick={() => void send()} disabled={!input.trim() && pendingImages.length === 0} className="h-9 w-9 shrink-0 rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 transition-all" aria-label="Send">
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="mt-1 px-1 text-[10px] text-muted-foreground">
                {streaming ? (
                  <span className="inline-flex items-center gap-1.5 text-foreground/70">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-foreground/70" />
                    {thinking ? "Thinking…" : "Generating…"}
                  </span>
                ) : "Press Enter to send"}
              </p>
            </div>
          </div>
        )}
      </div>

      <PatchNotesModal open={showPatchNotes} onOpenChange={setShowPatchNotes} />

      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowUpgradeModal(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <span className="text-3xl">👑</span>
              </div>
              <h2 className="text-lg font-bold">Upgrade to Developer's Pro</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You've hit your free message limit for today. Upgrade to <strong className="text-foreground">Developer's Pro</strong> for:
              </p>
              <ul className="mt-4 space-y-2 text-left text-sm">
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 text-foreground shrink-0" />
                  <span>Unlimited messages on all models</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 text-foreground shrink-0" />
                  <span>Priority access to new models</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 text-foreground shrink-0" />
                  <span>No daily limits, ever</span>
                </li>
              </ul>
              <div className="mt-5 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                💡 <strong>Pro is coming soon.</strong> For now, your free messages reset daily at midnight UTC.
              </div>
              <div className="mt-5 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  Maybe later
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-gradient-to-r from-slate-500 to-slate-700 text-white"
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setAccountOpen(true);
                  }}
                >
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
          setShowDevCard(false);
          setPrivacyOpen(false);
          setAccountOpen(false);
          try { localStorage.removeItem(VISITOR_STORAGE_KEY); } catch {}
        }}
      />

      {showInstallToast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 animate-float-up">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-2xl max-w-sm">
            <Smartphone className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-foreground mb-1">
                Install Developer's Ai
              </p>
              <p className="text-muted-foreground">
                To install the app:
              </p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li>• Chrome: tap the ⋮ menu → "Install app"</li>
                <li>• Safari: tap Share → "Add to Home Screen"</li>
                <li>• Edge: tap ⋮ → "Add to phone"</li>
              </ul>
              <p className="mt-1.5 text-muted-foreground">
                The app will appear on your home screen with the DA logo.
              </p>
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
