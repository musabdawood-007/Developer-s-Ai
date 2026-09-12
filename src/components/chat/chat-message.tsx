"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, Download, User, Copy, Check, RotateCcw, Bot } from "lucide-react";
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
  onRetry?: (id: string) => void;
}

export function ChatMessage({
  message,
  isStreaming,
  isThinking,
  onHide,
  onRetry,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const isEmpty = !isUser && message.content.trim().length === 0;
  const [hiding, setHiding] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="flex w-full justify-end py-3"
      >
        <div className="w-full max-w-3xl mx-auto px-4 flex justify-end">
          <div className="flex items-start gap-2.5 max-w-[80%]">
            <div className="flex-1">
              {message.images && message.images.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 justify-end">
                  {message.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Attachment ${idx + 1}`}
                      className="max-h-40 max-w-[200px] rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
              <div className="rounded-2xl rounded-tr-md bg-muted px-4 py-2.5">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              </div>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground mt-0.5">
              <User className="h-4 w-4" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group flex w-full py-3"
    >
      <div className="w-full max-w-3xl mx-auto px-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground mt-0.5">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
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
              <span className="inline-block ml-0.5 h-4 w-0.5 animate-pulse bg-foreground align-middle rounded-full" />
            )}
            {!isStreaming && !isEmpty && message.content.trim().length > 0 && (
              <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Copy message"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(message.id)}
                    className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Retry"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry
                  </button>
                )}
                {canHide && (
                  <button
                    type="button"
                    onClick={handleHide}
                    disabled={hiding}
                    className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Delete"
                  >
                    <Trash2 className={cn("h-3.5 w-3.5", hiding && "animate-pulse")} />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="relative flex h-6 w-6 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20 border-t-foreground animate-spin" />
        <div className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
      </div>
      <span className="text-sm text-muted-foreground">Thinking…</span>
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
          <span className="text-foreground font-medium">Generating image…</span>
          <span className="text-muted-foreground font-mono">{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500 ease-out"
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
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
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
