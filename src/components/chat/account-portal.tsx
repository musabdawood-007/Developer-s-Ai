"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Mail,
  Camera,
  Loader2,
  Check,
  Settings,
  Smartphone,
  ShieldCheck,
  LogOut,
  ChevronRight,
  X,
  Info,
  Trash2,
  MessageSquare,
  Database,
  Clock,
  FileText,
  ExternalLink,
  Moon,
  Sun,
} from "lucide-react";
import { DEVELOPER_INFO, BOT_NAME } from "@/lib/chat-config";
import { cn } from "@/lib/utils";

interface AccountPortalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  visitor: { name: string; visitorId: string; email?: string } | null;
  onSignOut: () => void;
  onPrivacyOpen: () => void;
  onInstallApp: () => void;
  onNameUpdate: (newName: string) => void;
  onAccountDeleted: () => void;
}

type Tab = "menu" | "profile" | "settings" | "about" | "sandbox" | "contact";

interface StoredChat {
  sessionId: string;
  title: string;
  messageCount: number;
  lastActive: string;
  messages: { role: string; content: string; createdAt: number }[];
}

export function AccountPortal({
  open,
  onOpenChange,
  visitor,
  onSignOut,
  onPrivacyOpen,
  onInstallApp,
  onNameUpdate,
  onAccountDeleted,
}: AccountPortalProps) {
  const [tab, setTab] = useState<Tab>("menu");
  const [name, setName] = useState(visitor?.name || "");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sandboxData, setSandboxData] = useState<StoredChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<StoredChat | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (visitor) setName(visitor.name);
    try {
      const savedPic = localStorage.getItem(`devai:profile-pic:${visitor?.visitorId}`);
      if (savedPic) setProfilePic(savedPic);
    } catch {}
  }, [visitor]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image too large. Max 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setProfilePic(result);
      try {
        if (visitor) localStorage.setItem(`devai:profile-pic:${visitor.visitorId}`, result);
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!visitor) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: visitor.visitorId,
          name: name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      onNameUpdate(data.name);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const loadSandboxData = () => {
    if (!visitor) return;
    const storageKey = `devai:chat-sessions:${visitor.visitorId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          sessions: { id: string; title: string; updatedAt: string }[];
          messages: Record<string, { role: string; content: string; createdAt: number }[]>;
        };
        const chats: StoredChat[] = (parsed.sessions || []).map((s) => ({
          sessionId: s.id,
          title: s.title,
          messageCount: parsed.messages?.[s.id]?.length || 0,
          lastActive: s.updatedAt,
          messages: parsed.messages?.[s.id] || [],
        }));
        setSandboxData(chats);
      }
    } catch {}
  };

  const clearAllChats = () => {
    if (!visitor) return;
    if (!confirm("Delete ALL chats? This cannot be undone.")) return;
    localStorage.removeItem(`devai:chat-sessions:${visitor.visitorId}`);
    setSandboxData([]);
    setSelectedChat(null);
  };

  const deleteSingleChat = (sessionId: string) => {
    if (!visitor) return;
    const storageKey = `devai:chat-sessions:${visitor.visitorId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { sessions: { id: string }[]; messages: Record<string, unknown> };
        parsed.sessions = parsed.sessions.filter((s) => s.id !== sessionId);
        delete parsed.messages[sessionId];
        localStorage.setItem(storageKey, JSON.stringify(parsed));
        loadSandboxData();
        setSelectedChat(null);
      }
    } catch {}
  };

  const renameChat = (sessionId: string, newTitle: string) => {
    if (!visitor || !newTitle.trim()) return;
    const storageKey = `devai:chat-sessions:${visitor.visitorId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { sessions: { id: string; title: string }[]; messages: Record<string, unknown> };
        const session = parsed.sessions.find((s) => s.id === sessionId);
        if (session) session.title = newTitle.trim();
        localStorage.setItem(storageKey, JSON.stringify(parsed));
        loadSandboxData();
        setRenamingId(null);
        setSelectedChat((prev) => prev && prev.sessionId === sessionId ? { ...prev, title: newTitle.trim() } : prev);
      }
    } catch {}
  };

  const closeAll = () => {
    setTab("menu");
    setSelectedChat(null);
    onOpenChange(false);
  };

  const deleteAccount = async () => {
    if (!visitor) return;
    if (!confirm("Are you sure? This will permanently delete your account and all data. This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: visitor.visitorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete account");
      try {
        localStorage.removeItem("devai:auth");
        localStorage.removeItem(`devai:chat-sessions:${visitor.visitorId}`);
        localStorage.removeItem(`devai:profile-pic:${visitor.visitorId}`);
      } catch {}
      onAccountDeleted();
      closeAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const storageUsed = (() => {
    if (!visitor) return "0 KB";
    try {
      const data = localStorage.getItem(`devai:chat-sessions:${visitor.visitorId}`);
      if (!data) return "0 KB";
      const bytes = new Blob([data]).size;
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } catch {
      return "0 KB";
    }
  })();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setTab("menu"); onOpenChange(v); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            {tab !== "menu" && (
              <button
                type="button"
                onClick={() => { setTab("menu"); setSelectedChat(null); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            )}
            <h2 className="text-sm font-bold">
              {tab === "menu" ? "Account" : tab === "profile" ? "Edit Profile" : tab === "settings" ? "Settings" : tab === "about" ? "About" : tab === "sandbox" ? "Sandbox" : "Contact"}
            </h2>
          </div>
          <button type="button" onClick={closeAll} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {tab === "menu" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="relative">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                  {profilePic ? (
                    <img src={profilePic} alt={visitor?.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-foreground">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted border border-border text-foreground"
                >
                  <Camera className="h-3 w-3" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{visitor?.name}</p>
                <p className="truncate text-xs text-muted-foreground">Signed in</p>
              </div>
            </div>

            <div className="space-y-1">
              <MenuItem icon={<User className="h-4 w-4" />} label="Edit Profile" onClick={() => setTab("profile")} />
              <MenuItem icon={<Settings className="h-4 w-4" />} label="Settings" onClick={() => setTab("settings")} />
              <MenuItem icon={<Database className="h-4 w-4" />} label="Sandbox" badge={`${sandboxData.length} chats`} onClick={() => { loadSandboxData(); setTab("sandbox"); }} />
              <MenuItem icon={<Info className="h-4 w-4" />} label="About" onClick={() => setTab("about")} />
              <MenuItem icon={<Smartphone className="h-4 w-4" />} label="Download App" onClick={() => { onInstallApp(); closeAll(); }} />
              <MenuItem icon={<ShieldCheck className="h-4 w-4" />} label="Privacy Policy" onClick={() => { onPrivacyOpen(); closeAll(); }} />
              <MenuItem icon={<Mail className="h-4 w-4" />} label="Contact" onClick={() => setTab("contact")} />
              <div className="my-2 border-t border-border" />
              <MenuItem
                icon={<LogOut className="h-4 w-4" />}
                label="Sign Out"
                onClick={() => { onSignOut(); closeAll(); }}
                danger
              />
            </div>
          </div>
        )}

        {tab === "profile" && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-muted">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-foreground">
                      <User className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border text-foreground shadow-lg"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>
              <p className="text-xs text-muted-foreground">Click camera to upload (max 2MB)</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-11 bg-muted/50 border-0"
                maxLength={40}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={visitor?.email || "(not set)"}
                  disabled
                  className="h-11 pl-10 bg-muted/50 border-0 opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Storage Used</label>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 border-0 px-3 py-2.5">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{storageUsed}</span>
                <span className="text-xs text-muted-foreground">(localStorage)</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={saveProfile}
              disabled={saving || name.trim().length < 2}
              className="h-11 w-full gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
              {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        )}

        {tab === "settings" && (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Account</p>
                <p className="text-xs text-muted-foreground">Name: {visitor?.name}</p>
                <p className="text-xs text-muted-foreground">Storage: {storageUsed} (localStorage)</p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Data & Privacy</p>
                <p className="text-xs text-muted-foreground mb-2">All chat data is stored locally in your browser. We have no access to your conversations.</p>
                <div className="flex gap-2">
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted/80">
                    <FileText className="h-3 w-3" /> Terms
                  </a>
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted/80">
                    <ShieldCheck className="h-3 w-3" /> Privacy
                  </a>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Notifications</p>
                <p className="text-xs text-muted-foreground">Email notifications: OTP only</p>
              </div>
            </div>

            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-foreground mb-2">Danger Zone</p>
              <p className="text-xs text-muted-foreground mb-3">
                Permanently delete your account and all data. This cannot be undone.
              </p>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive/20 px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-destructive/30 disabled:opacity-50"
              >
                {deleting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 className="h-4 w-4" /> Delete My Account</>
                )}
              </button>
            </div>
          </div>
        )}

        {tab === "sandbox" && (
          <div className="p-4 space-y-4">
            {!selectedChat ? (
              <>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    All your chats are stored locally in your browser using localStorage. No data is sent to any server.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">{sandboxData.length} chat(s) found</p>
                  {sandboxData.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllChats}
                      className="text-[10px] text-destructive hover:text-foreground"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {sandboxData.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Database className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">No chats saved yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {sandboxData.map((chat) => (
                      <div
                        key={chat.sessionId}
                        className="rounded-lg border border-border bg-muted/10 p-3 transition-colors hover:bg-muted/30"
                      >
                        {renamingId === chat.sessionId ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="h-7 text-xs bg-muted/50 border-0"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") renameChat(chat.sessionId, renameValue);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => renameChat(chat.sessionId, renameValue)}
                              className="h-7 px-2 rounded-md bg-foreground text-background text-[10px] font-medium hover:bg-foreground/90"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedChat(chat)}
                            className="flex w-full items-start gap-3 text-left"
                          >
                            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-foreground">{chat.title}</p>
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>{chat.messageCount} messages</span>
                                <span>·</span>
                                <Clock className="h-2.5 w-2.5" />
                                <span>{new Date(chat.lastActive).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setRenamingId(chat.sessionId); setRenameValue(chat.title); }}
                                className="h-6 px-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted"
                              >
                                Rename
                              </button>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    {renamingId === selectedChat.sessionId ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-7 text-sm bg-muted/50 border-0"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameChat(selectedChat.sessionId, renameValue);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => renameChat(selectedChat.sessionId, renameValue)}
                          className="h-7 px-2 rounded-md bg-foreground text-background text-[10px] font-medium hover:bg-foreground/90"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-sm font-semibold text-foreground">{selectedChat.title}</p>
                        <p className="text-[10px] text-muted-foreground">{selectedChat.messageCount} messages</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {renamingId !== selectedChat.sessionId && (
                      <button
                        type="button"
                        onClick={() => { setRenamingId(selectedChat.sessionId); setRenameValue(selectedChat.title); }}
                        className="flex h-7 items-center gap-1 rounded-md bg-muted px-2 text-[10px] font-medium text-foreground hover:bg-muted/80"
                      >
                        Rename
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteSingleChat(selectedChat.sessionId)}
                      className="flex h-7 items-center gap-1 rounded-md bg-destructive/20 px-2 text-[10px] font-medium text-foreground hover:bg-destructive/30"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto rounded-lg border border-border bg-muted/10 p-3">
                  {selectedChat.messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No messages in this chat.</p>
                  ) : (
                    selectedChat.messages.map((msg, idx) => (
                      <div key={idx} className={cn("rounded-lg px-3 py-2 text-xs", msg.role === "user" ? "bg-muted ml-8" : "bg-muted/30 mr-8")}>
                        <p className={cn("text-[10px] font-medium mb-1", msg.role === "user" ? "text-foreground" : "text-muted-foreground")}>
                          {msg.role === "user" ? "You" : "Assistant"}
                        </p>
                        <p className="text-foreground whitespace-pre-wrap break-words">{msg.content.slice(0, 200)}{msg.content.length > 200 ? "…" : ""}</p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "about" && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col items-center text-center py-2">
              <img src="/custom-logo.png" alt={BOT_NAME} className="h-16 w-16 rounded-2xl object-cover mb-3" />
              <h3 className="text-lg font-bold text-foreground">{BOT_NAME}</h3>
              <p className="text-xs text-muted-foreground">Version 2.0.1</p>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Owner & Developer</p>
                <p className="text-sm text-foreground">{DEVELOPER_INFO.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{DEVELOPER_INFO.intro}</p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">What is {BOT_NAME}?</p>
                <p className="text-xs text-muted-foreground">
                  An AI-powered chatbot that helps you with casual conversations, coding tips, image generation, and file creation. Built with Next.js, Prisma, and AI models.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Tech Stack</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["Next.js", "React", "TypeScript", "Tailwind CSS", "Prisma", "MongoDB", "Vercel"].map((tech) => (
                    <span key={tech} className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{tech}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Data Policy</p>
                <p className="text-xs text-muted-foreground">
                  Your chat messages are stored locally in your browser. We never see or store your conversations. Only your account info (name, email) is on our servers.
                </p>
              </div>

              <a
                href={DEVELOPER_INFO.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
              >
                Visit Developer Portfolio <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {tab === "contact" && (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <ContactItem icon={<Mail className="h-4 w-4" />} label="Help Email" value="developer.bot.ai@gmail.com" sublabel="Approx. reply within 7 days" href="mailto:developer.bot.ai@gmail.com" />
              <ContactItem icon={<ExternalLink className="h-4 w-4" />} label="Developer Site" value="musab-007.netlify.app" sublabel="Portfolio & more info" href={DEVELOPER_INFO.portfolio} />
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">About {BOT_NAME}</p>
              <p>A friendly AI chatbot by {DEVELOPER_INFO.name}. Chat, get coding tips, generate images & files.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted/50"
      )}
    >
      <span className={danger ? "text-destructive" : "text-foreground"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && <span className="text-[10px] text-muted-foreground">{badge}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function ContactItem({
  icon,
  label,
  value,
  href,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  sublabel?: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-border"
    >
      <span className="text-foreground">{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
      </div>
    </a>
  );
}
