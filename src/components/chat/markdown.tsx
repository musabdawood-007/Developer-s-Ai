"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Check,
  Copy,
  Download,
  FileText,
  FileType2,
  FileCode2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  downloadMarkdown,
  downloadText,
  downloadPdf,
  downloadDocx,
} from "@/lib/file-converters";

interface MarkdownProps {
  content: string;
  /** When true, the entire message is treated as a downloadable file */
  asMarkdownFile?: boolean;
}

export function Markdown({ content, asMarkdownFile }: MarkdownProps) {
  const { displayContent, embeddedMarkdown } = useMemo(() => {
    const trimmed = content.trim();
    const fenceMatch = trimmed.match(/^```(?:md|markdown)\s*\n([\s\S]*?)\n```$/);
    if (fenceMatch) {
      return { displayContent: fenceMatch[1], embeddedMarkdown: fenceMatch[1] };
    }
    return { displayContent: content, embeddedMarkdown: null };
  }, [content]);

  return (
    <div className="text-sm leading-relaxed break-words">
      {asMarkdownFile && (
        <DownloadBar content={embeddedMarkdown ?? content} />
      )}
      <ReactMarkdown
        components={{
          code: CodeBlock,
          p: ({ children }) => (
            <p className="my-2.5 last:mb-0 first:mt-0 break-words">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-2.5 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="break-words">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mt-4 mb-2 first:mt-0 text-lg font-bold break-words">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 mb-2 first:mt-0 text-base font-bold break-words">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1.5 first:mt-0 text-sm font-bold break-words">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-3 mb-1 first:mt-0 text-sm font-semibold break-words">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="mt-2 mb-1 first:mt-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground break-words">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="mt-2 mb-1 first:mt-0 text-xs font-medium text-muted-foreground break-words">
              {children}
            </h6>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-500/40 underline-offset-2 break-all"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt || "Generated image"}
              className="my-3 max-w-full rounded-xl border border-border shadow-lg"
              loading="lazy"
            />
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-emerald-500/60 bg-emerald-500/5 py-1.5 pl-3 pr-2 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: ({ children }) => (
            <div className="my-3 -mx-1 overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-border px-2.5 py-1.5 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2.5 py-1.5 align-top break-words">
              {children}
            </td>
          ),
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock(props: any) {
  const { className, children, ...rest } = props;
  const match = /language-(\w+)/.exec(className || "");
  const language = match?.[1] ?? "";
  const rawCode = String(children ?? "").replace(/\n$/, "");

  const isMarkdownFile = language === "md" || language === "markdown";

  if (!language) {
    return (
      <code
        className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono text-emerald-300 break-all"
        {...rest}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-[#282c34]">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-black/30 px-3 py-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
          {language}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isMarkdownFile && (
            <FormatDownloadMenu content={rawCode} variant="compact" />
          )}
          <CodeDownloadButton code={rawCode} language={language} />
          <CopyButton text={rawCode} />
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        wrapLongLines
        customStyle={{
          margin: 0,
          background: "transparent",
          fontSize: "0.78rem",
          padding: "0.85rem",
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "28rem",
        }}
        codeTagProps={{
          style: {
            fontFamily: "var(--font-geist-mono), monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          },
        }}
      >
        {rawCode}
      </SyntaxHighlighter>
    </div>
  );
}

const LANG_TO_EXT: Record<string, string> = {
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  javascript: "js",
  js: "js",
  jsx: "jsx",
  typescript: "ts",
  ts: "ts",
  tsx: "tsx",
  json: "json",
  python: "py",
  py: "py",
  bash: "sh",
  sh: "sh",
  shell: "sh",
  sql: "sql",
  java: "java",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  csharp: "cs",
  cs: "cs",
  go: "go",
  golang: "go",
  rust: "rs",
  rs: "rs",
  php: "php",
  ruby: "rb",
  rb: "rb",
  yaml: "yml",
  yml: "yml",
  xml: "xml",
  svg: "svg",
  md: "md",
  markdown: "md",
  text: "txt",
  txt: "txt",
  dotenv: "env",
  ini: "ini",
  toml: "toml",
  graphql: "graphql",
  dockerfile: "dockerfile",
  makefile: "mk",
};

function CodeDownloadButton({ code, language }: { code: string; language: string }) {
  const handleDownload = () => {
    const ext = LANG_TO_EXT[language.toLowerCase()] || "txt";
    const filename = `developers-ai-code.${ext}`;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
      title={`Download as .${LANG_TO_EXT[language.toLowerCase()] || "txt"}`}
    >
      <Download className="h-3 w-3" />
      <span className="hidden sm:inline">Download</span>
    </button>
  );
}

function DownloadBar({ content }: { content: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
      <span className="text-xs font-medium text-emerald-300">
        📄 Document ready — download as:
      </span>
      <FormatDownloadMenu content={content} variant="expanded" />
    </div>
  );
}

interface FormatDownloadMenuProps {
  content: string;
  variant: "compact" | "expanded";
}

function FormatDownloadMenu({ content, variant }: FormatDownloadMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "pdf" | "docx">(null);

  const handle = async (format: "md" | "pdf" | "docx" | "txt") => {
    setOpen(false);
    try {
      if (format === "md") {
        downloadMarkdown(content);
      } else if (format === "txt") {
        downloadText(content);
      } else if (format === "pdf") {
        setBusy("pdf");
        await downloadPdf(content);
      } else if (format === "docx") {
        setBusy("docx");
        await downloadDocx(content);
      }
    } catch (e) {
      console.error(`[${format}] export failed:`, e);
    } finally {
      setBusy(null);
    }
  };

  if (variant === "expanded") {
    return (
      <div className="flex flex-wrap items-center gap-1">
        <FormatChip
          icon={<FileCode2 className="h-3 w-3" />}
          label={busy === "pdf" ? "Generating…" : "PDF"}
          onClick={() => handle("pdf")}
          disabled={busy !== null}
        />
        <FormatChip
          icon={<FileType2 className="h-3 w-3" />}
          label={busy === "docx" ? "Generating…" : "DOCX"}
          onClick={() => handle("docx")}
          disabled={busy !== null}
        />
        <FormatChip
          icon={<FileText className="h-3 w-3" />}
          label="MD"
          onClick={() => handle("md")}
          disabled={busy !== null}
        />
        <FormatChip
          icon={<FileText className="h-3 w-3" />}
          label="TXT"
          onClick={() => handle("txt")}
          disabled={busy !== null}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
          "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30",
          busy !== null && "opacity-60"
        )}
        disabled={busy !== null}
        aria-label="Download file"
      >
        <Download className="h-3.5 w-3.5" />
        {busy ? busy + "…" : "Download"}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
            <FormatMenuItem
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Markdown (.md)"
              onClick={() => handle("md")}
            />
            <FormatMenuItem
              icon={<FileType2 className="h-3.5 w-3.5" />}
              label="Word (.docx)"
              onClick={() => handle("docx")}
            />
            <FormatMenuItem
              icon={<FileCode2 className="h-3.5 w-3.5" />}
              label="PDF (.pdf)"
              onClick={() => handle("pdf")}
            />
            <FormatMenuItem
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Plain text (.txt)"
              onClick={() => handle("txt")}
            />
          </div>
        </>
      )}
    </div>
  );
}

function FormatChip({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-colors",
        "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function FormatMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left text-popover-foreground hover:bg-emerald-500/15 hover:text-emerald-300 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
        copied
          ? "text-emerald-400"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
      )}
      aria-label="Copy code"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" /> Copy
        </>
      )}
    </button>
  );
}
