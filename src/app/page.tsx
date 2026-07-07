"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  Sparkles,
  Trash2,
  Loader2,
  FileText,
  Mail,
  Phone,
  Globe,
  Github,
  Code2,
  Wand2,
  Square,
  ShieldCheck,
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
import { AdminPortal } from "@/components/chat/admin-portal";
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

/* ------------------------------------------------------------------ */
/*  Visitor context                                                   */
/* ------------------------------------------------------------------ */

interface SessionInfo {
  id: string;
  title: string;
  updatedAt: string;
  _count?: { chats: number };
}

interface VisitorCtx {
  name: string;
  visitorId: string;
}

const VISITOR_STORAGE_KEY = "devai:auth";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Detects whether the user's text is asking for a markdown file */
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

/** Detects whether the model's reply is essentially one big ```md block */
function looksLikeMarkdownFile(content: string) {
  const trimmed = content.trim();
  // Single fenced md/markdown block taking up most of the message
  const fenceMatch = trimmed.match(/^```(?:md|markdown)\s*\n([\s\S]*?)\n```$/);
  if (fenceMatch) return true;
  // Heuristic: message starts with a # heading and is "long enough"
  if (trimmed.startsWith("#") && trimmed.length > 200) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/*  Suggested prompt chips                                            */
/* ------------------------------------------------------------------ */

const SUGGESTIONS: {
  label: string;
  prompt: string;
  icon: React.ReactNode;
}[] = [
  {
    label: "About the developer",
    prompt: "Tell me more about your developer Musab Dawood",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    label: "Coding tips",
    prompt: "Give me 5 practical coding tips for cleaner code",
    icon: <Code2 className="h-3.5 w-3.5" />,
  },
  {
    label: "MERN stack tips",
    prompt: "Share 5 best practices for building MERN stack apps (MongoDB, Express, React, Node).",
    icon: <Code2 className="h-3.5 w-3.5" />,
  },
  {
    label: "Generate a README.md",
    prompt:
      "Generate a complete README.md file for a Next.js todo app with TypeScript, Tailwind, and Prisma. Include badges, install steps, usage, and folder structure.",
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  {
    label: "Markdown docs",
    prompt:
      "Create a markdown documentation file explaining REST API best practices with examples.",
    icon: <Wand2 className="h-3.5 w-3.5" />,
  },
  {
    label: "Project plan (.md)",
    prompt:
      "Generate a markdown project plan for building a full-stack e-commerce app with milestones, tech stack, and risk assessment.",
    icon: <FileText className="h-3.5 w-3.5" />,
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

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
  const [adminOpen, setAdminOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [visitor, setVisitor] = useState<VisitorCtx | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // ===== Model selection state =====
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [usage, setUsage] = useState<Record<string, { used: number; remaining: number; dailyLimit: number; locked: boolean }>>({});
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showPatchNotes, setShowPatchNotes] = useState(false);

  // Show welcome screen on every fresh page load (not on route changes within SPA)
  useEffect(() => {
    // Use performance API to detect if this is a fresh navigation
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const isFreshLoad = !nav || nav.type === "navigate" || nav.type === "reload";
    if (!isFreshLoad) {
      setShowWelcome(false);
    }
  }, []);

  // Restore selected model from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODEL_STORAGE_KEY);
      if (saved && getModel(saved)) {
        setSelectedModelId(saved);
      }
    } catch {}
  }, []);

  // Save selected model to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, selectedModelId);
    } catch {}
  }, [selectedModelId]);

  // Fetch usage from /api/usage when visitor changes or after each chat
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

  // Try to restore a returning visitor from localStorage so they skip the gate.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(VISITOR_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<VisitorCtx>;
        if (parsed?.name && parsed?.visitorId) {
          setVisitor({
            name: parsed.name,
            visitorId: parsed.visitorId,
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Capture the PWA install prompt event so we can trigger it from our
  // custom "Download App" button instead of the browser's default popup.
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault(); // prevent the default browser prompt
      setInstallPromptEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Handle the install flow when user clicks "Download App"
  const handleInstallApp = async () => {
    if (!installPromptEvent) {
      // PWA not installable yet (already installed, or browser doesn't support)
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
    setInstallPromptEvent(null); // can only prompt once
  };

  // When visitor is known, load their sessions list + chat history.
  useEffect(() => {
    if (!visitor) return;

    let cancelled = false;

    (async () => {
      // 1. Load sessions list
      try {
        const sessRes = await fetch(
          `/api/sessions?visitorId=${encodeURIComponent(visitor.visitorId)}`
        );
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          if (!cancelled && sessData.sessions?.length > 0) {
            setSessions(sessData.sessions);
            // Set the most recent session as current
            setCurrentSessionId(sessData.sessions[0].id);
          } else if (!cancelled) {
            // No sessions yet — create one
            await createNewSession();
          }
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visitor]);

  // Load chats when session changes
  useEffect(() => {
    if (!visitor || !currentSessionId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/visitors/me/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId: visitor.visitorId,
            sessionId: currentSessionId,
          }),
        });
        if (!res.ok) throw new Error("Failed to load history");
        const data = (await res.json()) as {
          chats: Array<{
            id: string;
            role: string;
            content: string;
            createdAt: string;
          }>;
        };

        if (cancelled) return;

        if (data.chats && data.chats.length > 0) {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: buildWelcomeMessage(visitor.name),
              createdAt: new Date(data.chats[0].createdAt).getTime() - 1000,
            },
            ...data.chats.map((c) => ({
              id: c.id,
              role: (c.role === "user" ? "user" : "assistant") as ChatRole,
              content: c.content,
              createdAt: new Date(c.createdAt).getTime(),
              asMarkdownFile:
                c.role === "assistant" && looksLikeMarkdownFile(c.content),
            })),
          ]);
        } else {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: buildWelcomeMessage(visitor.name),
              createdAt: Date.now(),
            },
          ]);
        }
      } catch {
        if (cancelled) return;
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: buildWelcomeMessage(visitor.name),
            createdAt: Date.now(),
          },
        ]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visitor, currentSessionId]);

  /** Create a new chat session */
  const createNewSession = async () => {
    if (!visitor) return;
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: visitor.visitorId }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      const newSession: SessionInfo = {
        id: data.session.id,
        title: data.session.title,
        updatedAt: data.session.createdAt,
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
    } catch {
      // ignore
    }
  };

  /** Switch to an existing session */
  const switchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setSidebarOpen(false);
  };

  /** Refresh the sessions list from the server */
  const refreshSessions = useCallback(async () => {
    if (!visitor) return;
    try {
      const res = await fetch(
        `/api/sessions?visitorId=${encodeURIComponent(visitor.visitorId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // ignore
    }
  }, [visitor]);

  /** Delete a chat session and all its messages */
  const deleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete session");

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      // If we deleted the current session, switch to the next available one
      // or create a new one
      if (sessionId === currentSessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].id);
        } else {
          await createNewSession();
        }
      }

      toast({ title: "Chat deleted." });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Auto-scroll on new messages / streaming tokens.
  // Use instant scroll during streaming to keep up with tokens smoothly.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: streaming ? "auto" : "smooth",
      });
    }
  }, [messages, loading, streaming]);

  // Auto-grow the textarea.
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
      // Allow send if there's text OR at least one image
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

      // Detect "about developer" intent to also reveal the contact card.
      const lower = text.toLowerCase();
      if (
        /developer|musab|who (made|built|created)|about you|about your maker/.test(
          lower
        )
      ) {
        setShowDevCard(true);
      }

      // Create an empty bot message that we'll fill in as tokens arrive.
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
            visitorId: visitor?.visitorId,
            visitorName: visitor?.name,
            sessionId: currentSessionId,
            modelId: selectedModelId,
          }),
        });

        if (!res.ok || !res.body) {
          const errBody = await res.json().catch(() => ({}));
          // If 403 (limit reached) — show upgrade modal
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

          // SSE messages are separated by "\n\n"
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
              // Server confirmed it's processing — switch from "sending"
              // to "thinking" so the user sees instant feedback.
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
                // First token arrived — stop showing the "thinking" dots.
                setThinking(false);
                accumulated += json.token;
                const snapshot = accumulated;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botId ? { ...m, content: snapshot } : m
                  )
                );
              }
              // `done` and `error` are handled by the loop ending / catch.
              // Handle image generation result from server
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
              // ignore malformed chunk
            }
          }
        }

        // Finalize: ensure asMarkdownFile flag is correct on the completed message.
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
        // AbortError is expected when user clicks Stop
        if (e instanceof DOMException && e.name === "AbortError") {
          // Keep whatever was streamed so far, but add a small "(stopped)" note
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
        // Refresh sessions list so titles update (auto-titling on first msg)
        void refreshSessions();
        // Refresh usage so remaining counter updates
        void refreshUsage();
      }
    },
    [input, loading, messages, toast, visitor, pendingImages, currentSessionId, refreshSessions]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /** Convert a File to a base64 data URL */
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /** Handle file selection from the file input */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Only accept images
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Unsupported file",
          description: `${file.name} is not an image. Only images are supported.`,
          variant: "destructive",
        });
        continue;
      }
      // 5MB limit
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
      setPendingImages((prev) => [...prev, ...newImages].slice(0, 4)); // max 4 images
    }

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingImage = (idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  /**
   * Hide a chat message from the user's view. Calls the server to set
   * `userHiddenAt` on the ChatLog row, then removes the message from local
   * state. Admin can still see the message (with a "Hidden by user" badge).
   * The "welcome" bubble (id === "welcome") can't be hidden.
   */
  const handleHideMessage = useCallback(
    async (id: string) => {
      if (!visitor || id === "welcome") return;
      // Optimistic update — remove from UI immediately
      setMessages((prev) => prev.filter((m) => m.id !== id));
      try {
        const res = await fetch(
          `/api/visitors/me/chats/${encodeURIComponent(id)}/hide`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId: visitor.visitorId }),
          }
        );
        if (!res.ok) throw new Error("Failed to hide message");
        toast({
          title: "Message hidden",
          description: "Removed from your view. Admin can still see it.",
        });
      } catch (e) {
        // Restore the message if hiding failed
        setMessages((prev) => {
          // Best-effort restore — we don't have the original content here,
          // so just refetch from server
          return prev;
        });
        toast({
          title: "Couldn't hide message",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [visitor, toast]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  /**
   * Generate an image from a text prompt and display it in the chat.
   */
  const handleGenerateImage = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt || generatingImage) return;

    setGeneratingImage(true);

    // Add a "generating" placeholder message
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

      // Replace the placeholder with the generated image — render directly,
      // NOT through markdown (markdown can't handle long base64 data URLs)
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
      // Replace placeholder with error
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
    // Start a new chat session instead of just clearing the view
    void createNewSession();
    setShowDevCard(false);
  };

  const signOut = async () => {
    try {
      // Call the API to clear the httpOnly cookie
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore — still clear client-side
    }
    try {
      localStorage.removeItem(VISITOR_STORAGE_KEY);
    } catch {
      // ignore
    }
    setVisitor(null);
    setMessages([]);
    setShowDevCard(false);
    setAdminOpen(false);
    setPrivacyOpen(false);
    toast({
      title: "Signed out",
      description: "You can sign back in with your name and password.",
    });
  };

  // Show welcome screen on first visit (only once per session)
  if (showWelcome) {
    return <WelcomeScreen onEnter={() => setShowWelcome(false)} />;
  }

  // Show the auth gate first; chat only opens once the visitor signs in.
  if (!visitor) {
    return <AuthGate onReady={(info) => setVisitor(info)} />;
  }

  return (
    <div className="flex flex-col overflow-hidden overflow-x-hidden bg-background text-foreground" style={{ height: "100dvh" }}>
      {/* --------------------------- Chat Sessions Sidebar --------------------------- */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          {/* Sidebar panel */}
          <div className="relative flex h-full w-80 max-w-[85vw] flex-col border-r border-border bg-card shadow-2xl animate-float-up">
            {/* Sidebar header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-bold text-foreground">Chat History</h2>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* New Chat button */}
            <div className="p-3">
              <button
                type="button"
                onClick={() => void createNewSession()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-rose-400 hover:to-red-500 hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </button>
            </div>

            {/* Sessions list */}
            <div className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <MessageCircle className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    No previous chats yet.
                    <br />
                    Start a new one above!
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {sessions.map((s) => (
                    <li key={s.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => switchSession(s.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                          s.id === currentSessionId
                            ? "bg-rose-500/15 text-rose-300"
                            : "text-foreground/80 hover:bg-muted/50"
                        )}
                      >
                        <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <div className="min-w-0 flex-1 pr-6">
                          <p className="truncate text-xs font-medium">
                            {s.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(s.updatedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {s._count?.chats !== undefined && (
                              <span className="ml-1">· {s._count.chats} msg</span>
                            )}
                          </div>
                        </div>
                      </button>
                      {/* Delete button — appears on hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${s.title}"? This will remove all messages in this chat.`)) {
                            void deleteSession(s.id);
                          }
                        }}
                        className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-rose-500/15 hover:text-rose-400 group-hover:flex"
                        aria-label="Delete chat"
                        title="Delete this chat"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Sidebar footer */}
            <div className="border-t border-border px-4 py-2 text-center text-[10px] text-muted-foreground">
              {BOT_NAME} · Built by {DEVELOPER_INFO.name}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ Header ------------------------------ */}
      <header className="shrink-0 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 sm:gap-3">
          {/* Left: Menu + Logo + Title */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            {/* Menu button */}
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(true);
                void refreshSessions();
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-emerald-400 active:scale-95"
              aria-label="Open chat history"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img src="/custom-logo.png" alt="Developer's Ai" className="aurora-glow h-9 w-9 shrink-0 rounded-lg shadow-md object-cover" />
            <div className="min-w-0 leading-tight">
              <button
                type="button"
                onClick={() => setAdminOpen(true)}
                className="aurora-shimmer text-sm sm:text-base font-bold tracking-tight font-mono hover:opacity-80 transition-opacity cursor-default truncate"
                title={BOT_NAME}
                aria-label={BOT_NAME}
              >
                {BOT_NAME}
              </button>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                Hi, {visitor.name}!
              </p>
            </div>
          </div>

          {/* Right: New chat + Account button */}
          <div className="flex shrink-0 items-center gap-1">
            {/* New chat */}
            <button
              type="button"
              onClick={clearChat}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-400 active:scale-95"
              aria-label="New chat"
              title="Start a new chat"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Account button */}
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-emerald-400 active:scale-95"
              aria-label="Account"
              title="Account settings"
            >
              <UserCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------- Dev Card ---------------------------- */}
      {showDevCard && <DeveloperCard onClose={() => setShowDevCard(false)} />}

      {/* ----------------------------- Chat ----------------------------- */}
      <main
        ref={scrollRef}
        className="chat-scroll min-h-0 flex-1 scroll-smooth pb-4"
      >
        <div className="mx-auto max-w-3xl">
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              message={m}
              isStreaming={
                streaming &&
                m.id === messages[messages.length - 1]?.id &&
                m.role === "assistant"
              }
              isThinking={
                thinking &&
                m.id === messages[messages.length - 1]?.id &&
                m.role === "assistant"
              }
              onHide={m.id === "welcome" ? undefined : handleHideMessage}
            />
          ))}

          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex w-full gap-3 px-3 sm:px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" />
              </div>
            </div>
          )}

          {/* Suggestions */}
          {messages.length <= 1 && !loading && (
            <div className="px-3 sm:px-4 pt-2 pb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Try one of these:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => void send(s.prompt)}
                    className={cn(
                      "suggestion-chip inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2.5",
                      "text-xs font-medium text-foreground/90 transition-all",
                      "hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300",
                      "active:scale-95"
                    )}
                  >
                    {s.icon}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --------------------------- Composer (fixed) --------------------------- */}
      <div className="shrink-0 border-t border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-3 sm:px-4 py-3">
          {/* ===== Model selector AIO (above composer) ===== */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-medium text-emerald-300 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/50 active:scale-95 will-change-transform"
                title="Switch model"
              >
                <span className="text-sm">{getModel(selectedModelId)?.badge}</span>
                <span>{getModel(selectedModelId)?.label}</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200 will-change-transform", modelDropdownOpen && "rotate-180")} />
              </button>
              {modelDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setModelDropdownOpen(false)}
                  />
                  <div className="absolute left-0 bottom-full z-50 mb-1 w-72 rounded-lg border border-border bg-popover shadow-2xl overflow-hidden animate-scale-in will-change-transform">
                    {MODELS.map((m) => {
                      const isSelected = m.id === selectedModelId;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedModelId(m.id);
                            setModelDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2.5 text-left flex items-start gap-2 transition-colors",
                            "hover:bg-muted",
                            isSelected && "bg-emerald-500/10"
                          )}
                        >
                          <span className="text-base mt-0.5">{m.badge}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold">{m.label}</span>
                              {isSelected && (
                                <span className="ml-auto text-[10px] text-emerald-400">●</span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{m.tagline}</p>
                            <p className="text-[10px] text-emerald-400/80 mt-0.5">∞ Unlimited</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Right side: quick actions */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPatchNotes(true)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-emerald-400 will-change-transform"
                title="View patch notes"
              >
                <Sparkles className="h-3 w-3" />
                <span className="hidden sm:inline">What's New</span>
              </button>
            </div>
          </div>

          {/* Image generation panel */}
          {imageGenOpen && (
            <div className="mb-2 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Sparkle className="h-4 w-4 text-fuchsia-400" />
                <span className="text-xs font-medium text-fuchsia-300">
                  AI Image Generation
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleGenerateImage();
                    }
                  }}
                  placeholder="Describe the image you want to generate…"
                  className="h-11 flex-1 rounded-lg border border-fuchsia-500/30 bg-card px-3 text-sm focus:border-fuchsia-500 focus:outline-none"
                  autoFocus
                  disabled={generatingImage}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleGenerateImage()}
                  disabled={!imagePrompt.trim() || generatingImage}
                  className="h-11 gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-400 hover:to-purple-500 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {generatingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkle className="h-4 w-4" />
                  )}
                  Generate
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Press Enter to generate. The image will appear in the chat.
              </p>
            </div>
          )}

          {/* Pending image previews */}
          {pendingImages.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 rounded-lg border border-border bg-card p-2">
              {pendingImages.map((img, idx) => (
                <div key={idx} className="group relative">
                  <img
                    src={img}
                    alt={`Pending ${idx + 1}`}
                    className="h-16 w-16 rounded-md border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePendingImage(idx)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-md transition-transform hover:scale-110"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-rose-500/50 focus-within:ring-1 focus-within:ring-rose-500/30 transition-colors sm:gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => void handleFileSelect(e)}
              className="hidden"
            />

            {/* Attach button */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={streaming || pendingImages.length >= 4}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-rose-400 active:scale-95 disabled:opacity-40 sm:h-9 sm:w-9"
                    aria-label="Attach image"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Attach image (max 4, 5MB each)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Generate image button */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setImageGenOpen((v) => !v)}
                    disabled={streaming || generatingImage}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 sm:h-9 sm:w-9",
                      imageGenOpen
                        ? "bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white"
                        : "text-muted-foreground hover:bg-muted hover:text-fuchsia-400"
                    )}
                    aria-label="Generate AI image"
                  >
                    {generatingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkle className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Generate AI image from text</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                pendingImages.length > 0
                  ? "Describe what you want to know about the image…"
                  : "wanna taste me? Ask Anything....."
              }
              rows={1}
              className="min-h-[40px] resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={streaming}
            />
            {streaming ? (
              <Button
                type="button"
                size="icon"
                onClick={stopGeneration}
                className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white hover:from-rose-400 hover:to-red-500 active:scale-95 transition-all hover:scale-105 sm:h-9 sm:w-9"
                aria-label="Stop generating"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                onClick={() => void send()}
                disabled={!input.trim() && pendingImages.length === 0}
                className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white hover:from-rose-400 hover:to-red-500 disabled:opacity-50 transition-all hover:scale-105"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            {streaming ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {thinking ? "Thinking…" : "Generating…"} click the stop button to interrupt.
              </span>
            ) : (
              <>
                Press <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Enter</kbd> to send,{" "}
                <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Shift+Enter</kbd> for a new line.
                <span className="mx-1.5">·</span>
                <ImageIcon className="inline h-3 w-3 align-text-bottom" /> Attach images to analyze.
              </>
            )}
          </p>
        </div>
      </div>

      {/* --------------------------- Admin Portal (hidden, opened via title) --------------------------- */}
      <AdminPortal open={adminOpen} onOpenChange={setAdminOpen} />

      {/* --------------------------- Patch Notes Modal (shown on first visit after update) --------------------------- */}
      <PatchNotesModal open={showPatchNotes} onOpenChange={setShowPatchNotes} />

      {/* --------------------------- Upgrade Modal (limit reached / pro clicked) --------------------------- */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowUpgradeModal(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-emerald-500/40 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <span className="text-3xl">👑</span>
              </div>
              <h2 className="text-lg font-bold">Upgrade to Developer's Pro</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You've hit your free message limit for today. Upgrade to <strong className="text-emerald-400">Developer's Pro</strong> for:
              </p>
              <ul className="mt-4 space-y-2 text-left text-sm">
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited messages on all models</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Priority access to new models</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                  <span>No daily limits, ever</span>
                </li>
              </ul>
              <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
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
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
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

      {/* --------------------------- Privacy & Terms --------------------------- */}
      <PrivacyTerms open={privacyOpen} onOpenChange={setPrivacyOpen} />

      {/* --------------------------- Account Portal --------------------------- */}
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
          setAdminOpen(false);
          setPrivacyOpen(false);
          setAccountOpen(false);
          try { localStorage.removeItem(VISITOR_STORAGE_KEY); } catch {}
        }}
      />

      {/* --------------------------- Install Instructions Toast --------------------------- */}
      {showInstallToast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 animate-float-up">
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-card px-4 py-3 shadow-2xl max-w-sm">
            <Smartphone className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
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

/* ------------------------------------------------------------------ */
/*  Developer card                                                    */
/* ------------------------------------------------------------------ */

function DeveloperCard({ onClose }: { onClose: () => void }) {
  return (
    <div className="border-b border-border bg-emerald-500/5">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="rounded-xl border border-emerald-500/30 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-emerald-950 font-bold">
                MD
              </div>
              <div>
                <p className="text-sm font-semibold">{DEVELOPER_INFO.name}</p>
                <p className="text-xs text-muted-foreground">
                  Creator of {BOT_NAME}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </Button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {DEVELOPER_INFO.intro}
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ContactItem
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={DEVELOPER_INFO.email}
              href={`mailto:${DEVELOPER_INFO.email}`}
            />
            <ContactItem
              icon={<Phone className="h-4 w-4" />}
              label="Phone"
              value={DEVELOPER_INFO.phone}
              href={`tel:${DEVELOPER_INFO.phone.replace(/[+\s]/g, "")}`}
            />
            <ContactItem
              icon={<Globe className="h-4 w-4" />}
              label="Portfolio"
              value="musab-007.netlify.app"
              href={DEVELOPER_INFO.portfolio}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
            >
              <a
                href={DEVELOPER_INFO.portfolio}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-3.5 w-3.5" /> Visit Portfolio
              </a>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
            >
              <a href={`mailto:${DEVELOPER_INFO.email}`}>
                <Mail className="h-3.5 w-3.5" /> Email Me
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2 text-xs transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
    >
      <span className="text-emerald-400">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="block truncate font-medium">{value}</span>
      </span>
    </a>
  );
}
