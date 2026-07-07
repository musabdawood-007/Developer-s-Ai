"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, User, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { watermarkImage } from "@/lib/watermark";

export type ChatRole = "user" | "assistant";

export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  asMarkdownFile?: boolean;
  createdAt: number;
  images?: string[];
  generatedImage?: string;
  generatedImagePrompt?: string;
  imageProgress?: number;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  /** When true, show animated "Thinking..." dots before any token arrives */
  isThinking?: boolean;
  /** Optional callback when user wants to hide this message from their view */
  onHide?: (id: string) => void | Promise<void>;
}

export function ChatMessage({
  message,
  isStreaming,
  isThinking,
  onHide,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const isEmpty = !isUser && message.content.trim().length === 0;
  const [hiding, setHiding] = useState(false);
  const canHide = typeof onHide === "function" && !isStreaming;

  const handleHide = async () => {
    if (!onHide || hiding) return;
    setHiding(true);
    try {
      await onHide(message.id);
    } finally {
      setHiding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "group flex w-full gap-3 px-3 sm:px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
          isUser
            ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
        )}
        aria-hidden
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble + meta */}
      <div
        className={cn(
          "flex max-w-[92%] min-w-0 sm:max-w-[85%] flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {isUser ? "You" : "Developer's Ai"}
          </span>
          {canHide && (
            <button
              type="button"
              onClick={handleHide}
              disabled={hiding}
              className="hidden h-5 w-5 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-rose-500/15 hover:text-emerald-400 group-hover:flex"
              aria-label="Hide message from your view"
              title="Hide this message from your view (admin can still see it)"
            >
              <Trash2 className={cn("h-3 w-3", hiding && "animate-pulse")} />
            </button>
          )}
        </div>
        <div
          className={cn(
            "min-w-0 max-w-full overflow-hidden rounded-2xl px-4 py-2.5 shadow-sm border",
            isUser
              ? "rounded-tr-sm bg-amber-500/15 border-amber-500/30 text-foreground"
              : "rounded-tl-sm bg-card border-border text-card-foreground",
            isStreaming && !isEmpty && "animate-pulse"
          )}
        >
          {isUser ? (
            <>
              {message.images && message.images.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {message.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Attachment ${idx + 1}`}
                      className="max-h-40 max-w-[200px] rounded-lg border border-amber-500/30 object-cover"
                    />
                  ))}
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </>
          ) : isEmpty && isThinking ? (
            <ThinkingDots />
          ) : message.imageProgress !== undefined && message.imageProgress < 100 ? (
            <ImageProgressBar progress={message.imageProgress} content={message.content} />
          ) : message.generatedImage ? (
            <GeneratedImageDisplay
              src={message.generatedImage}
              prompt={message.generatedImagePrompt}
              caption={message.content}
            />
          ) : (
            <Markdown
              content={message.content}
              asMarkdownFile={message.asMarkdownFile}
            />
          )}
          {isStreaming && !isEmpty && (
            <span className="inline-block ml-1 h-3 w-1.5 animate-pulse bg-emerald-400 align-middle" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className="relative flex h-6 w-6 items-center justify-center">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        {/* Inner pulsing dot */}
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] font-medium text-emerald-400">Thinking…</span>
        <span className="text-[10px] text-muted-foreground">Crafting a thoughtful response</span>
      </div>
    </div>
  );
}

function ImageProgressBar({ progress, content }: { progress: number; content?: string }) {
  return (
    <div className="space-y-3">
      {content && (
        <p className="text-sm leading-relaxed break-words">{content}</p>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-400 font-medium">🎨 Generating image…</span>
          <span className="text-muted-foreground font-mono">{progress}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function GeneratedImageDisplay({
  src,
  prompt,
  caption,
}: {
  src: string;
  prompt?: string;
  caption?: string;
}) {
  // The watermarked version of the image. null while processing.
  const [watermarkedSrc, setWatermarkedSrc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  // Apply watermark when the image src changes
  useEffect(() => {
    let cancelled = false;
    setProcessing(true);

    watermarkImage(src)
      .then((watermarked) => {
        if (!cancelled) {
          setWatermarkedSrc(watermarked);
          setProcessing(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWatermarkedSrc(src); // fallback to original
          setProcessing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const downloadImage = () => {
    const a = document.createElement("a");
    a.href = watermarkedSrc || src;
    a.download = `developers-ai-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-2">
      {caption && (
        <p className="text-sm leading-relaxed break-words">{caption}</p>
      )}
      <div className="relative group/img rounded-xl overflow-hidden border border-border shadow-lg">
        {processing ? (
          <div className="flex aspect-square items-center justify-center bg-muted/20">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500/30 border-t-rose-500" />
              <span className="text-xs">Applying watermark…</span>
            </div>
          </div>
        ) : (
          <img
            src={watermarkedSrc || src}
            alt={prompt || "Generated image"}
            className="w-full h-auto block"
          />
        )}
        <button
          type="button"
          onClick={downloadImage}
          disabled={processing}
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80 disabled:opacity-0"
          aria-label="Download image"
          title="Download this image (with watermark)"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
      {prompt && (
        <p className="text-[11px] text-muted-foreground italic">
          Prompt: &ldquo;{prompt}&rdquo;
        </p>
      )}
    </div>
  );
}
