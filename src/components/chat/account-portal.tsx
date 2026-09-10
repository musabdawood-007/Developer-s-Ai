"use client";

import { useState, useRef } from "react";
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
  Mail as MailIcon,
  LogOut,
  ChevronRight,
  X,
} from "lucide-react";
import { DEVELOPER_INFO } from "@/lib/chat-config";
import { cn } from "@/lib/utils";

interface AccountPortalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  visitor: { name: string; visitorId: string } | null;
  onSignOut: () => void;
  onPrivacyOpen: () => void;
  onInstallApp: () => void;
  onNameUpdate: (newName: string) => void;
  onAccountDeleted: () => void;
}

type Tab = "menu" | "profile" | "settings" | "contact";

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
  const fileRef = useRef<HTMLInputElement | null>(null);

  useState(() => {
    if (visitor) setName(visitor.name);
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image too large. Max 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfilePic(reader.result as string);
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
          profilePicture: profilePic,
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

  const closeAll = () => {
    setTab("menu");
    onOpenChange(false);
  };

  const deleteAccount = async () => {
    if (!visitor) return;
    if (!confirm("Are you sure? This will permanently delete your account, all chats, and all sessions. This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: visitor.visitorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete account");
      try { localStorage.removeItem("devai:auth"); } catch {}
      onAccountDeleted();
      closeAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setTab("menu"); onOpenChange(v); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            {tab !== "menu" && (
              <button
                type="button"
                onClick={() => setTab("menu")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            )}
            <h2 className="text-sm font-bold">
              {tab === "menu" ? "Account" : tab === "profile" ? "Edit Profile" : tab === "settings" ? "Settings" : "Contact Us"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeAll}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {tab === "menu" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                {profilePic ? (
                  <img src={profilePic} alt={visitor?.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-foreground">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{visitor?.name}</p>
                <p className="truncate text-xs text-muted-foreground">Signed in</p>
              </div>
              <button
                type="button"
                onClick={() => setTab("profile")}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                Edit
              </button>
            </div>

            <div className="space-y-1">
              <MenuItem icon={<User className="h-4 w-4" />} label="Edit Profile" onClick={() => setTab("profile")} />
              <MenuItem icon={<Settings className="h-4 w-4" />} label="Settings" onClick={() => setTab("settings")} />
              <MenuItem icon={<Smartphone className="h-4 w-4" />} label="Download Mobile App" onClick={() => { onInstallApp(); closeAll(); }} />
              <MenuItem icon={<ShieldCheck className="h-4 w-4" />} label="Privacy Policy" onClick={() => { onPrivacyOpen(); closeAll(); }} />
              <MenuItem icon={<MailIcon className="h-4 w-4" />} label="Contact Us" onClick={() => setTab("contact")} />
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
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <p className="text-xs text-muted-foreground">Click camera to upload (max 2MB)</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-11"
                maxLength={40}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email (cannot change)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={visitor?.name ? "(email on file)" : ""}
                  disabled
                  className="h-11 pl-10 opacity-50"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={saveProfile}
              disabled={saving || name.trim().length < 2}
              className="h-11 w-full gap-2 bg-gradient-to-r from-primary to-primary text-white hover:from-primary hover:to-primary"
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
                <p className="text-xs font-semibold text-foreground mb-1">Account Information</p>
                <p className="text-xs text-muted-foreground">Name: {visitor?.name}</p>
                <p className="text-xs text-muted-foreground">Account active since signup</p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Notifications</p>
                <p className="text-xs text-muted-foreground">Email notifications: Enabled (OTP only)</p>
              </div>
            </div>

            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-xs font-semibold text-red-400 mb-2">⚠️ Danger Zone</p>
              <p className="text-xs text-muted-foreground mb-3">
                Permanently delete your account, all chats, and all sessions. This action cannot be undone.
              </p>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/20 px-4 py-2.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
              >
                {deleting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                ) : (
                  <>Delete My Account</>
                )}
              </button>
            </div>
          </div>
        )}

        {tab === "contact" && (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <ContactItem icon={<Mail className="h-4 w-4" />} label="Email" value={DEVELOPER_INFO.email} href={`mailto:${DEVELOPER_INFO.email}`} />
              <ContactItem icon={<Smartphone className="h-4 w-4" />} label="Phone" value={DEVELOPER_INFO.phone} href={`tel:${DEVELOPER_INFO.phone}`} />
              <ContactItem icon={<ShieldCheck className="h-4 w-4" />} label="Portfolio" value="musab-007.netlify.app" href={DEVELOPER_INFO.portfolio} />
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">About Developer's Ai</p>
              <p>A friendly chatbot by {DEVELOPER_INFO.name}. Chat, get coding tips, generate images & files. Built with Next.js, Prisma, and the Z.ai SDK.</p>
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-foreground hover:bg-muted/50"
      )}
    >
      <span className={danger ? "text-red-400" : "text-foreground"}>{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
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
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-border"
    >
      <span className="text-foreground">{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </a>
  );
}
