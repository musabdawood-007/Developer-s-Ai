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
  isThinking?: boolean;
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "group flex w-full py-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "w-full max-w-3xl mx-auto px-4",
          isUser ? "flex justify-end" : "flex flex-col gap-1.5"
        )}
      >
        {isUser ? (
          <div
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              "bg-primary text-primary-foreground"
            )}
          >
            {message.images && message.images.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {message.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Attachment ${idx + 1}`}
                    className="max-h-40 max-w-[200px] rounded-lg object-cover opacity-90"
                  />
                ))}
              </div>
            )}
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        ) : (
          <>
            {isEmpty && isThinking ? (
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
              <div className="text-sm leading-relaxed text-foreground">
                <Markdown
                  content={message.content}
                  asMarkdownFile={message.asMarkdownFile}
                />
              </div>
            )}
            {isStreaming && !isEmpty && (
              <span className="inline-block ml-0.5 h-4 w-0.5 animate-pulse bg-primary align-middle rounded-full" />
            )}
            {canHide && (
              <button
                type="button"
                onClick={handleHide}
                disabled={hiding}
                className="self-start mt-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 opacity-0 transition-all hover:bg-muted hover:text-muted-foreground group-hover:opacity-100"
                aria-label="Hide message"
                title="Hide this message"
              >
                <Trash2 className={cn("h-3.5 w-3.5", hiding && "animate-pulse")} />
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="relative flex h-7 w-7 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-primary">Thinking…</span>
        <span className="text-[11px] text-muted-foreground">Crafting a thoughtful response</span>
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
          <span className="text-primary font-medium">Generating image…</span>
          <span className="text-muted-foreground font-mono">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-500 ease-out"
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
  const [watermarkedSrc, setWatermarkedSrc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

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
          setWatermarkedSrc(src);
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
      <div className="relative group/img rounded-xl overflow-hidden border border-border">
        {processing ? (
          <div className="flex aspect-square items-center justify-center bg-muted/30">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
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
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm text-foreground opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-background disabled:opacity-0"
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
