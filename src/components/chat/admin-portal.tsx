"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  Lock,
  LogOut,
  RefreshCw,
  User as UserIcon,
  MessageSquare,
  Clock,
  Loader2,
  AlertCircle,
  Search,
  Trash2,
  Download,
  FileCode2,
  FileType2,
  FileText,
  Users,
  MessagesSquare,
  ChevronDown,
  Eraser,
  RotateCcw,
  EyeOff,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  downloadMarkdown,
  downloadText,
  downloadPdf,
  downloadDocx,
} from "@/lib/file-converters";

interface AdminChatLog {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;
  userHiddenAt: string | null;
}

interface AdminVisitor {
  id: string;
  name: string;
  sessionId: string;
  createdAt: string;
  lastSeen: string;
  chats: AdminChatLog[];
}

interface AdminPortalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type View = "login" | "dashboard";

export function AdminPortal({ open, onOpenChange }: AdminPortalProps) {
  const [view, setView] = useState<View>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [visitors, setVisitors] = useState<AdminVisitor[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  const [deleteVisitorId, setDeleteVisitorId] = useState<string | null>(null);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const [clearChatsVisitorId, setClearChatsVisitorId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    void tryAutoLogin();
  }, [open]);

  const tryAutoLogin = async () => {
    try {
      const res = await fetch("/api/admin/data", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { visitors: AdminVisitor[] };
        setVisitors(data.visitors);
        setView("dashboard");
      } else {
        setView("login");
      }
    } catch {
      setView("login");
    }
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || "Invalid credentials.");
      }

      await loadData();
      setView("dashboard");
      toast({ title: "Welcome, admin.", description: "Logged in successfully." });
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/data", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load data.");
      const data = (await res.json()) as { visitors: AdminVisitor[] };
      setVisitors(data.visitors);
    } catch (e) {
      toast({
        title: "Load failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  }, [toast]);

  const doLogout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include",
    });
    setView("login");
    setUsername("");
    setPassword("");
    setVisitors([]);
    setSelectedVisitorId(null);
    setSearch("");
    setChatSearch("");
  };

  const handleDeleteVisitor = async () => {
    if (!deleteVisitorId) return;
    try {
      const res = await fetch(
        `/api/admin/visitors/${encodeURIComponent(deleteVisitorId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to delete visitor.");
      toast({
        title: "Visitor deleted",
        description: "The visitor and all their chats were removed.",
      });
      if (selectedVisitorId === deleteVisitorId) {
        setSelectedVisitorId(null);
      }
      setDeleteVisitorId(null);
      await loadData();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChat = async () => {
    if (!deleteChatId) return;
    try {
      const res = await fetch(
        `/api/admin/chats/${encodeURIComponent(deleteChatId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to delete message.");
      toast({
        title: "Message deleted",
        description: "Soft-deleted — toggle 'Show deleted' to view or restore it.",
      });
      setDeleteChatId(null);
      await loadData();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRestoreChat = async (chatId: string) => {
    try {
      const res = await fetch(
        `/api/admin/chats/${encodeURIComponent(chatId)}/restore`,
        { method: "PATCH", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to restore message.");
      toast({ title: "Message restored." });
      await loadData();
    } catch (e) {
      toast({
        title: "Restore failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDeleteChat = async (chatId: string) => {
    try {
      const res = await fetch(
        `/api/admin/chats/${encodeURIComponent(chatId)}?permanent=true`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to permanently delete message.");
      toast({
        title: "Message permanently deleted",
        description: "This action cannot be undone.",
      });
      await loadData();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleClearChats = async () => {
    if (!clearChatsVisitorId) return;
    try {
      const res = await fetch(
        `/api/admin/chats/all?visitorId=${encodeURIComponent(clearChatsVisitorId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to clear chats.");
      toast({
        title: "Chats cleared",
        description: "All messages for this visitor were removed.",
      });
      setClearChatsVisitorId(null);
      await loadData();
    } catch (e) {
      toast({
        title: "Clear failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const filtered = useMemo(
    () =>
      visitors.filter((v) =>
        v.name.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [visitors, search]
  );

  const selected = visitors.find((v) => v.id === selectedVisitorId) ?? null;

  const selectedFilteredChats = useMemo(() => {
    if (!selected) return [];
    const q = chatSearch.trim().toLowerCase();
    return selected.chats.filter((c) => {
      // Hide soft-deleted chats unless the toggle is on
      if (c.deletedAt && !showDeleted) return false;
      if (!q) return true;
      return c.content.toLowerCase().includes(q);
    });
  }, [selected, chatSearch, showDeleted]);

  const stats = useMemo(() => {
    const totalMessages = visitors.reduce((sum, v) => sum + v.chats.length, 0);
    const totalUserMsgs = visitors.reduce(
      (sum, v) => sum + v.chats.filter((c) => c.role === "user").length,
      0
    );
    return {
      totalVisitors: visitors.length,
      totalMessages,
      totalUserMsgs,
    };
  }, [visitors]);

  const buildConversationMarkdown = (v: AdminVisitor): string => {
    const lines: string[] = [];
    lines.push(`# Chat with ${v.name}`);
    lines.push("");
    lines.push(
      `> Exported from Developer's Ai admin portal on ${new Date().toLocaleString()}`
    );
    lines.push("");
    lines.push(`**Visitor:** ${v.name}  `);
    lines.push(`**First visit:** ${formatDate(v.createdAt)}  `);
    lines.push(`**Last seen:** ${formatDate(v.lastSeen)}  `);
    lines.push(`**Total messages:** ${v.chats.length}`);
    lines.push("");
    lines.push("---");
    lines.push("");
    if (v.chats.length === 0) {
      lines.push("_No messages._");
    } else {
      for (const c of v.chats) {
        const speaker = c.role === "user" ? `**${v.name}**` : "**Developer's Ai**";
        lines.push(`### ${speaker}`);
        lines.push(`*${formatDate(c.createdAt)}*`);
        lines.push("");
        lines.push(c.content);
        lines.push("");
        lines.push("---");
        lines.push("");
      }
    }
    return lines.join("\n");
  };

  const handleExport = async (format: "md" | "pdf" | "docx" | "txt") => {
    if (!selected) return;
    const md = buildConversationMarkdown(selected);
    const base = `chat-${selected.name.toLowerCase().replace(/\s+/g, "-")}`;
    try {
      if (format === "md") downloadMarkdown(md, base);
      else if (format === "txt") downloadText(md, base);
      else if (format === "pdf") await downloadPdf(md, base);
      else if (format === "docx") await downloadDocx(md, base);
      toast({ title: `Exported as ${format.toUpperCase()}.` });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-7xl w-[98vw] max-w-[98vw] max-h-[95vh] p-0 overflow-hidden gap-0">
          {view === "login" ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/40 text-foreground shadow-lg">
                <Shield className="h-7 w-7" />
              </div>
              <DialogHeader className="text-center">
                <DialogTitle className="text-center">Admin Portal</DialogTitle>
                <DialogDescription className="text-center">
                  Restricted area. Authorized personnel only.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={doLogin} className="mt-6 w-full max-w-sm space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Username
                  </label>
                  <Input
                    autoFocus
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    disabled={loginLoading}
                    placeholder="admin"
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    disabled={loginLoading}
                    placeholder="••••••••"
                    className="h-10"
                  />
                </div>

                {loginError && (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {loginError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loginLoading || !username || !password}
                  className="h-10 w-full gap-2 bg-muted text-foreground hover:bg-primary"
                >
                  {loginLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {loginLoading ? "Authenticating…" : "Login"}
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex h-[92vh] flex-col">
                <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted px-4 py-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-foreground" />
                  <div>
                    <DialogTitle className="text-base">
                      Admin Portal — Visitor Logs
                    </DialogTitle>
                    <DialogDescription className="text-[11px]">
                      {visitors.length} visitor{visitors.length === 1 ? "" : "s"} ·{" "}
                      {stats.totalMessages} message{stats.totalMessages === 1 ? "" : "s"}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => void loadData()}
                    disabled={loadingData}
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5", loadingData && "animate-spin")}
                    />
                    Refresh
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-foreground hover:bg-muted"
                    onClick={doLogout}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </Button>
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-1 gap-2 border-b border-border bg-muted/20 px-4 py-2 sm:grid-cols-3">
                <StatCard
                  icon={<Users className="h-3.5 w-3.5" />}
                  label="Visitors"
                  value={stats.totalVisitors}
                />
                <StatCard
                  icon={<MessagesSquare className="h-3.5 w-3.5" />}
                  label="Total messages"
                  value={stats.totalMessages}
                />
                <StatCard
                  icon={<MessageSquare className="h-3.5 w-3.5" />}
                  label="Visitor messages"
                  value={stats.totalUserMsgs}
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                <div className="flex w-full flex-col border-b border-border md:w-64 md:shrink-0 md:border-b-0 md:border-r">
                  <div className="border-b border-border p-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search visitors…"
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="chat-scroll min-h-0 flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No visitors found.
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {filtered.map((v) => (
                          <li
                            key={v.id}
                            className={cn(
                              "group relative",
                              selectedVisitorId === v.id && "bg-muted"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVisitorId(v.id);
                                setChatSearch("");
                              }}
                              className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                            >
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                                {v.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-sm font-medium">
                                    {v.name}
                                  </span>
                                  <span className="shrink-0 text-[10px] text-muted-foreground">
                                    {v.chats.length} msg
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatRelative(v.lastSeen)}
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteVisitorId(v.id);
                              }}
                              className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground group-hover:flex"
                              aria-label="Delete visitor"
                              title="Delete visitor & all chats"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  {selected ? (
                    <div className="flex h-full flex-col">
                      <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                            {selected.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {selected.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              <span className="break-words">
                                First visit: {formatDate(selected.createdAt)}
                              </span>
                              <span className="mx-1.5">·</span>
                              <span>{selected.chats.length} messages</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 lg:shrink-0">
                          <ExportMenu onExport={(f) => void handleExport(f)} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => setClearChatsVisitorId(selected.id)}
                            disabled={selected.chats.length === 0}
                          >
                            <Eraser className="h-3.5 w-3.5" />
                            Clear
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-foreground hover:bg-muted"
                            onClick={() => setDeleteVisitorId(selected.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {selected.chats.length > 0 && (
                        <div className="flex shrink-0 items-center gap-2 border-b border-border p-2">
                          <div className="relative min-w-0 flex-1">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={chatSearch}
                              onChange={(e) => setChatSearch(e.target.value)}
                              placeholder="Search within conversation…"
                              className="h-8 pl-8 text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDeleted((v) => !v)}
                            className={cn(
                              "flex h-8 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors",
                              showDeleted
                                ? "border-muted bg-muted text-foreground"
                                : "border-border text-muted-foreground hover:bg-muted/50"
                            )}
                            title={
                              showDeleted
                                ? "Hide deleted messages"
                                : "Show deleted messages"
                            }
                          >
                            {showDeleted ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                            <span className="hidden sm:inline">
                              {showDeleted ? "Hide deleted" : "Show deleted"}
                            </span>
                          </button>
                        </div>
                      )}

                      <div className="chat-scroll min-h-0 flex-1 overflow-y-auto">
                        <div className="space-y-2 p-3 sm:p-4">
                          {selectedFilteredChats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
                                {selected.chats.length === 0
                                  ? "No messages yet from this visitor."
                                  : "No messages match your search."}
                              </p>
                            </div>
                          ) : (
                            selectedFilteredChats.map((c) => (
                              <ChatLogRow
                                key={c.id}
                                log={c}
                                visitorName={selected.name}
                                onDelete={() => setDeleteChatId(c.id)}
                                onRestore={() => void handleRestoreChat(c.id)}
                                onPermanentDelete={() =>
                                  void handlePermanentDeleteChat(c.id)
                                }
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                      <UserIcon className="mb-2 h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Select a visitor on the left to view their chat history.
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Hover a visitor row to reveal the delete button.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteVisitorId !== null}
        onOpenChange={(v) => !v && setDeleteVisitorId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this visitor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the visitor and <strong>all</strong>{" "}
              their chat messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteVisitor()}
              className="bg-muted text-foreground hover:bg-primary"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteChatId !== null}
        onOpenChange={(v) => !v && setDeleteChatId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be soft-deleted — it stays in the database and
              can be restored. Toggle "Show deleted" above the chat list to view
              and restore deleted messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteChat()}
              className="bg-muted text-foreground hover:bg-primary"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={clearChatsVisitorId !== null}
        onOpenChange={(v) => !v && setClearChatsVisitorId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all chats for this visitor?</AlertDialogTitle>
            <AlertDialogDescription>
              All chat messages will be permanently deleted, but the visitor
              record will be kept. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleClearChats()}
              className="bg-amber-500 text-white hover:bg-amber-400"
            >
              Clear chats
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
      <span className="text-foreground">{icon}</span>
      <div className="leading-tight">
        <p className="text-base font-bold">{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function ChatLogRow({
  log,
  visitorName,
  onDelete,
  onRestore,
  onPermanentDelete,
}: {
  log: AdminChatLog;
  visitorName: string;
  onDelete: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const isUser = log.role === "user";
  const isDeleted = !!log.deletedAt;
  const isUserHidden = !isDeleted && !!log.userHiddenAt;
  return (
    <div
      className={cn(
        "group relative flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-xs",
        isDeleted
          ? "border-muted bg-muted opacity-70"
          : isUserHidden
            ? "border-amber-500/30 bg-amber-500/5 opacity-80"
            : isUser
              ? "border-amber-500/30 bg-amber-500/10"
              : "border-border bg-muted/40"
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <div className="flex min-w-0 items-center gap-1.5">
          {isUser ? (
            <UserIcon className="h-2.5 w-2.5 shrink-0 text-amber-400" />
          ) : (
            <MessageSquare className="h-2.5 w-2.5 shrink-0 text-foreground" />
          )}
          <span className="truncate font-semibold">
            {isUser ? visitorName : "Bot"}
          </span>
          <span className="shrink-0 text-muted-foreground/60">·</span>
          <span className="shrink-0">{formatTime(log.createdAt)}</span>
          {isDeleted && (
            <span className="ml-1 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-foreground">
              Deleted
            </span>
          )}
          {isUserHidden && (
            <span className="ml-1 shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
              Hidden by user
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {isDeleted ? (
            <>
              <button
                type="button"
                onClick={onRestore}
                className="hidden h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground group-hover:flex"
                aria-label="Restore message"
                title="Restore this message"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={onPermanentDelete}
                className="hidden h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground group-hover:flex"
                aria-label="Permanently delete"
                title="Permanently delete (cannot be undone)"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onDelete}
              className="hidden h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground group-hover:flex"
              aria-label="Delete message"
              title="Delete this message (soft-delete, can be restored)"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <p
        className={cn(
          "whitespace-pre-wrap break-words font-mono leading-relaxed",
          isDeleted && "line-through opacity-60"
        )}
      >
        {log.content}
      </p>
    </div>
  );
}

function ExportMenu({ onExport }: { onExport: (f: "md" | "pdf" | "docx" | "txt") => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "pdf" | "docx">(null);

  const handle = async (f: "md" | "pdf" | "docx" | "txt") => {
    setOpen(false);
    if (f === "pdf" || f === "docx") setBusy(f);
    try {
      onExport(f);
    } finally {
      // Parent handles actual async; just clear local busy quickly
      if (f === "pdf" || f === "docx") {
        // small delay so user sees feedback
        setTimeout(() => setBusy(null), 1200);
      }
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-foreground hover:bg-muted"
        onClick={() => setOpen((v) => !v)}
        disabled={busy !== null}
      >
        <Download className="h-3.5 w-3.5" />
        Export
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
            <ExportItem
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Markdown (.md)"
              onClick={() => void handle("md")}
            />
            <ExportItem
              icon={<FileType2 className="h-3.5 w-3.5" />}
              label={busy === "docx" ? "Generating…" : "Word (.docx)"}
              onClick={() => void handle("docx")}
            />
            <ExportItem
              icon={<FileCode2 className="h-3.5 w-3.5" />}
              label={busy === "pdf" ? "Generating…" : "PDF (.pdf)"}
              onClick={() => void handle("pdf")}
            />
            <ExportItem
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Plain text (.txt)"
              onClick={() => void handle("txt")}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ExportItem({
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
      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left text-popover-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatRelative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
