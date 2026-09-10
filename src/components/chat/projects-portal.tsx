"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Folder,
  File,
  FileCode,
  Save,
  Plus,
  Trash2,
  Download,
  Upload,
  X,
  FolderOpen,
  HardDrive,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOT_NAME } from "@/lib/chat-config";

interface ProjectsPortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, this content will be auto-saved as a new file */
  pendingContent?: { filename: string; content: string } | null;
  onContentSaved?: () => void;
}

interface ProjectFile {
  name: string;
  content: string;
  language: string;
  size: number;
  updatedAt: number;
}

const STORAGE_KEY = "devai:projects";
const SUPPORTED_LANGUAGES: Record<string, { label: string; icon: string }> = {
  html: { label: "HTML", icon: "🌐" },
  css: { label: "CSS", icon: "🎨" },
  js: { label: "JavaScript", icon: "⚡" },
  ts: { label: "TypeScript", icon: "📘" },
  tsx: { label: "React TSX", icon: "⚛️" },
  jsx: { label: "React JSX", icon: "⚛️" },
  json: { label: "JSON", icon: "📋" },
  md: { label: "Markdown", icon: "📝" },
  txt: { label: "Text", icon: "📄" },
  py: { label: "Python", icon: "🐍" },
};

export function ProjectsPortal({
  open,
  onOpenChange,
  pendingContent,
  onContentSaved,
}: ProjectsPortalProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveName, setDriveName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [supportsFileSystemAccess, setSupportsFileSystemAccess] = useState(false);
  const driveHandleRef = useRef<any>(null);

  useEffect(() => {
    setSupportsFileSystemAccess(
      typeof window !== "undefined" && "showDirectoryPicker" in window
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ProjectFile[];
        setFiles(parsed);
        if (parsed.length > 0 && !selectedFile) {
          setSelectedFile(parsed[0]);
        }
      }
    } catch {}
  }, [open]);

  const persistFiles = useCallback((newFiles: ProjectFile[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFiles));
    } catch (err) {
      setError("Storage full — try deleting old files.");
    }
  }, []);

  useEffect(() => {
    if (!open || !pendingContent) return;
    const newFile: ProjectFile = {
      name: pendingContent.filename,
      content: pendingContent.content,
      language: getLanguageFromFilename(pendingContent.filename),
      size: pendingContent.content.length,
      updatedAt: Date.now(),
    };
    const newFiles = [newFile, ...files.filter((f) => f.name !== newFile.name)];
    setFiles(newFiles);
    persistFiles(newFiles);
    setSelectedFile(newFile);
    onContentSaved?.();
  }, [pendingContent, open]);

  const getLanguageFromFilename = (name: string): string => {
    const ext = name.split(".").pop()?.toLowerCase() || "txt";
    return SUPPORTED_LANGUAGES[ext]?.label || "Text";
  };

  const connectDrive = async () => {
    if (!supportsFileSystemAccess) {
      setError("Your browser doesn't support drive access. Use Chrome or Edge.");
      return;
    }
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      });
      driveHandleRef.current = handle;
      setDriveName(handle.name);
      setDriveConnected(true);
      setError(null);
      await loadFilesFromDrive(handle);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to connect drive.");
      }
    }
  };

  const loadFilesFromDrive = async (handle: any) => {
    const driveFiles: ProjectFile[] = [];
    for await (const entry of handle.values()) {
      if (entry.kind === "file") {
        try {
          const file = await entry.getFile();
          if (file.size < 1024 * 1024) {
            // 1MB limit
            const content = await file.text();
            driveFiles.push({
              name: file.name,
              content,
              language: getLanguageFromFilename(file.name),
              size: file.size,
              updatedAt: file.lastModified,
            });
          }
        } catch {}
      }
    }
    setFiles(driveFiles);
    persistFiles(driveFiles);
    if (driveFiles.length > 0) setSelectedFile(driveFiles[0]);
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    if (driveConnected && driveHandleRef.current) {
      try {
        const fileHandle = await driveHandleRef.current.getFileHandle(
          selectedFile.name,
          { create: true }
        );
        const writable = await fileHandle.createWritable();
        await writable.write(selectedFile.content);
        await writable.close();
        setError(null);
      } catch (err: any) {
        setError(`Drive save failed: ${err.message}`);
      }
    }
    const newFiles = files.map((f) =>
      f.name === selectedFile.name
        ? { ...f, content: selectedFile.content, updatedAt: Date.now() }
        : f
    );
    setFiles(newFiles);
    persistFiles(newFiles);
  };

  const downloadFile = (file: ProjectFile) => {
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createNewFile = () => {
    if (!newFileName.trim()) return;
    const ext = newFileName.includes(".") ? "" : ".txt";
    const name = newFileName.trim() + ext;
    const newFile: ProjectFile = {
      name,
      content: newFileContent,
      language: getLanguageFromFilename(name),
      size: newFileContent.length,
      updatedAt: Date.now(),
    };
    const newFiles = [newFile, ...files.filter((f) => f.name !== name)];
    setFiles(newFiles);
    persistFiles(newFiles);
    setSelectedFile(newFile);
    setNewFileName("");
    setNewFileContent("");
    setShowNewFileForm(false);
  };

  const deleteFile = (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const newFiles = files.filter((f) => f.name !== name);
    setFiles(newFiles);
    persistFiles(newFiles);
    if (selectedFile?.name === name) {
      setSelectedFile(newFiles[0] || null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col rounded-2xl border border-emerald-500/30 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
              <Folder className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Developer's Projects</h2>
              <p className="text-xs text-muted-foreground">
                Save & manage your code files locally
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {driveConnected && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                <HardDrive className="h-3 w-3" />
                {driveName}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/5 px-6 py-2 text-xs text-amber-400">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-amber-400 hover:text-amber-300"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewFileForm((v) => !v)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New File
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={connectDrive}
            disabled={!supportsFileSystemAccess}
            className="gap-1.5"
            title={
              supportsFileSystemAccess
                ? "Connect to a folder on your computer"
                : "Requires Chrome or Edge"
            }
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {driveConnected ? "Switch Drive" : "Connect Drive"}
          </Button>
          {!supportsFileSystemAccess && (
            <span className="text-[10px] text-muted-foreground">
              Drive access needs Chrome/Edge
            </span>
          )}
        </div>

        {showNewFileForm && (
          <div className="border-b border-border bg-muted/20 px-6 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="filename.html / .css / .js / .ts"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                autoFocus
              />
              <Button size="sm" onClick={createNewFile} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Create
              </Button>
            </div>
            <textarea
              placeholder="File content (optional)…"
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              className="mt-2 h-20 w-full rounded-md border border-border bg-background p-2 text-xs font-mono"
            />
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <div className="w-64 shrink-0 border-r border-border overflow-y-auto">
            {files.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <File className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  No files yet. Create one or save from chat!
                </p>
              </div>
            ) : (
              <ul className="py-2">
                {files.map((file) => {
                  const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
                  const icon = SUPPORTED_LANGUAGES[ext]?.icon || "📄";
                  return (
                    <li key={file.name}>
                      <button
                        onClick={() => setSelectedFile(file)}
                        className={`group flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                          selectedFile?.name === file.name
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-sm">{icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {file.language} · {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(file);
                          }}
                          className="hidden h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-emerald-400 group-hover:flex"
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFile(file.name);
                          }}
                          className="hidden h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400 group-hover:flex"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="min-w-0 flex-1 flex flex-col">
            {selectedFile ? (
              <>
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {selectedFile.language}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadFile(selectedFile)}
                      className="h-7 gap-1.5 text-xs"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveFile}
                      className="h-7 gap-1.5 bg-emerald-500 text-xs hover:bg-emerald-600"
                    >
                      <Save className="h-3 w-3" />
                      Save
                    </Button>
                  </div>
                </div>
                <textarea
                  value={selectedFile.content}
                  onChange={(e) => {
                    const updated = { ...selectedFile, content: e.target.value };
                    setSelectedFile(updated);
                  }}
                  className="min-h-0 flex-1 resize-none bg-background p-4 font-mono text-xs leading-relaxed focus:outline-none"
                  spellCheck={false}
                />
                {driveConnected && (
                  <div className="border-t border-border px-4 py-1.5 text-[10px] text-emerald-400">
                    💾 Changes will also save to your <strong>{driveName}</strong> folder
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <FileCode className="mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Select a file to edit, or create a new one.
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Supports: .html, .css, .js, .ts, .tsx, .jsx, .json, .md, .txt, .py
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border px-6 py-2 text-center text-[10px] text-muted-foreground">
          {BOT_NAME} · Files stored locally in your browser
          {driveConnected && " · Synced with drive"}
        </div>
      </div>
    </div>
  );
}
