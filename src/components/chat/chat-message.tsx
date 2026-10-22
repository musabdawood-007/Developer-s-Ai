"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, User, Copy, Check, RotateCcw, Heart, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";

export type ChatRole = "user" | "assistant";

export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  feedback?: "up" | "down";
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  isThinking?: boolean;
  onHide?: (id: string) => void | Promise<void>;
  onRetry?: (id: string) => void;
  onFeedback?: (id: string, rating: "up" | "down") => void;
}

/**
 * Assistant message row. After every finished reply, a subtle
 * thumbs up / down feedback prompt is shown (PRD §7 feedback loop).
 * The visible "typing…" indicator tells the user PULSE is processing.
 */
export function ChatMessage({
  message,
  isStreaming,
  isThinking,
  onHide,
  onRetry,
  onFeedback,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const isEmpty = !isUser && message.content.trim().length === 0;
  const [hiding, setHiding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(message.feedback ?? null);
  const [feedbackNote, setFeedbackNote] = useState(false);
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

  const handleFeedback = (rating: "up" | "down") => {
    setFeedback(rating);
    setFeedbackNote(true);
    onFeedback?.(message.id, rating);
    setTimeout(() => setFeedbackNote(false), 2500);
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
            <Heart className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            {isEmpty && isThinking ? (
              <TypingIndicator />
            ) : (
              <div className="text-sm leading-relaxed text-foreground">
                <Markdown
                  content={message.content}
                  asMarkdownFile={false}
                />
              </div>
            )}
            {isStreaming && !isEmpty && (
              <span className="inline-block ml-0.5 h-4 w-0.5 animate-pulse bg-foreground align-middle rounded-full" />
            )}
            {!isStreaming && !isEmpty && message.content.trim().length > 0 && (
              <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100 sm:opacity-60 transition-opacity">
                {/* Feedback loop: "Was this helpful?" (PRD §7) */}
                {feedbackNote ? (
                  <span className="text-[11px] text-muted-foreground px-1">Thank you — noted.</span>
                ) : feedback === null ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleFeedback("up")}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="This helped"
                      aria-label="Helpful"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback("down")}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="This didn't land"
                      aria-label="Not helpful"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/70">
                    {feedback === "up" ? <ThumbsUp className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
                  </span>
                )}
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
                    title="Try a different angle"
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

/**
 * Visible "typing..." indicator (PRD §7 trust signal) — the user
 * always knows PULSE is present and processing.
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 py-2" aria-label="PULSE is typing">
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:300ms]" />
      </span>
      <span className="text-sm text-muted-foreground">Typing…</span>
    </div>
  );
}
