"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code2, ArrowRight, UserPlus, LogIn, Lock, Loader2, AlertCircle,
  Sparkles, Mail, User, KeyRound, ChevronLeft, ShieldCheck,
} from "lucide-react";
import { BOT_NAME, DEVELOPER_INFO } from "@/lib/chat-config";

interface AuthGateProps {
  onReady: (info: { name: string; visitorId: string }) => void;
}

const STORAGE_KEY = "devai:auth";

type View = "signin" | "signup" | "signup-otp" | "forgot-email" | "forgot-otp" | "forgot-reset";

export function AuthGate({ onReady }: AuthGateProps) {
  const [view, setView] = useState<View>("signup");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const startTimer = () => setResendTimer(60);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // ===== SIGNUP STEP 1: Initiate =====
      if (view === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "initiate", email, name, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to start signup.");
        if (data.devOtp) {
          setSuccessMsg(`Your OTP: ${data.devOtp} (shown here for testing)`);
        } else {
          setSuccessMsg("OTP sent! Check your email (and spam/junk folder) to verify your account.");
        }
        setOtp("");
        startTimer();
        setView("signup-otp");
      }
      // ===== SIGNUP STEP 2: Verify OTP =====
      else if (view === "signup-otp") {
        if (!otp.trim()) throw new Error("Please enter the OTP.");
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", email, otp }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Verification failed.");
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: data.name, visitorId: data.visitorId }));
        try { sessionStorage.setItem("devai:just-logged-in", "1"); } catch {}
        onReady({ name: data.name, visitorId: data.visitorId });
      }
      // ===== SIGNIN =====
      else if (view === "signin") {
        const res = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Sign in failed.");
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: data.name, visitorId: data.visitorId }));
        try { sessionStorage.setItem("devai:just-logged-in", "1"); } catch {}
        onReady({ name: data.name, visitorId: data.visitorId });
      }
      // ===== FORGOT: SEND OTP =====
      else if (view === "forgot-email") {
        const res = await fetch("/api/auth/forgot-password/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to send OTP.");
        if (data.devOtp) {
          setSuccessMsg(`Your OTP: ${data.devOtp} (shown here for testing)`);
        } else {
          setSuccessMsg("OTP sent! Check your email (and spam/junk folder).");
        }
        setOtpVerified(false);
        setOtp("");
        startTimer();
        setView("forgot-otp");
      }
      // ===== FORGOT: VERIFY OTP =====
      else if (view === "forgot-otp") {
        if (!otp.trim()) throw new Error("Please enter the OTP.");
        const res = await fetch("/api/auth/forgot-password/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Incorrect OTP.");
        setOtpVerified(true);
        setSuccessMsg("OTP verified! Set your new password.");
        setView("forgot-reset");
      }
      // ===== FORGOT: RESET PASSWORD =====
      else if (view === "forgot-reset") {
        if (!newPassword.trim() || newPassword.length < 4) throw new Error("Password must be at least 4 characters.");
        const res = await fetch("/api/auth/forgot-password/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Reset failed.");
        setView("signin");
        setEmail(""); setPassword(""); setOtp(""); setNewPassword("");
        setOtpVerified(false);
        setSuccessMsg("Password reset! Sign in with your new password.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const resendOtp = useCallback(async () => {
    if (resendTimer > 0) return;
    setError(null); setSuccessMsg(null); setSubmitting(true);
    try {
      const endpoint = view === "signup-otp" ? "/api/auth/signup" : "/api/auth/forgot-password/send-otp";
      const bodyData = view === "signup-otp"
        ? { action: "initiate", email, name, password }
        : { email };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to resend.");
      if (data.devOtp) setSuccessMsg(`New OTP: ${data.devOtp}`);
      else setSuccessMsg("New OTP sent! Check spam folder if not received.");
      setOtp("");
      startTimer();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend.");
    } finally {
      setSubmitting(false);
    }
  }, [email, name, password, resendTimer, view]);

  const isSignup = view === "signup";
  const isSignin = view === "signin";
  const isForgot = view.startsWith("forgot");
  const isSignupOtp = view === "signup-otp";
  const isForgotReset = view === "forgot-reset";

  return (
    <div className="flex items-center justify-center bg-background p-4" style={{ minHeight: "100dvh" }}>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/custom-logo.png" alt="Developer's Ai" className="aurora-glow mb-3 h-14 w-14 rounded-2xl shadow-lg object-cover" />
          <h1 className="aurora-shimmer text-2xl font-bold tracking-tight font-mono">{BOT_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Built by {DEVELOPER_INFO.name}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-2 text-emerald-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              {isSignup ? "Create Account" : isSignin ? "Welcome Back" : isSignupOtp ? "Verify Your Email" : "Password Recovery"}
            </span>
          </div>

          {(!isForgot && !isSignupOtp) && (
            <Tabs value={isSignup ? "signup" : "signin"} onValueChange={(v) => { setView(v as "signin" | "signup"); setError(null); setSuccessMsg(null); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup" className="gap-1.5 text-xs"><UserPlus className="h-3.5 w-3.5" />Sign Up</TabsTrigger>
                <TabsTrigger value="signin" className="gap-1.5 text-xs"><LogIn className="h-3.5 w-3.5" />Sign In</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {(isForgot || isSignupOtp) && (
            <button type="button" onClick={() => { setView(isSignupOtp ? "signup" : "signin"); setError(null); setSuccessMsg(null); setOtpVerified(false); }} className="mb-4 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
              <ChevronLeft className="h-3.5 w-3.5" />Back
            </button>
          )}

          {successMsg && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-4 space-y-3">
            {/* Email — shown in signup, signin, forgot-email */}
            {(isSignup || isSignin || view === "forgot-email") && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} disabled={submitting} placeholder="you@example.com" className="h-11 pl-10" autoComplete="email" />
                </div>
              </div>
            )}

            {/* Name — signup only */}
            {isSignup && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={name} onChange={(e) => { setName(e.target.value); setError(null); }} disabled={submitting} placeholder="Your name" className="h-11 pl-10" maxLength={40} />
                </div>
              </div>
            )}

            {/* Password — signup + signin */}
            {(isSignup || isSignin) && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} disabled={submitting} placeholder="••••••••" className="h-11 pl-10" autoComplete={isSignup ? "new-password" : "current-password"} />
                </div>
              </div>
            )}

            {/* OTP — signup-otp + forgot-otp */}
            {(isSignupOtp || view === "forgot-otp") && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">OTP Code (6 digits)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={otp} onChange={(e) => { setOtp(e.target.value); setError(null); }} disabled={submitting} placeholder="000000" className="h-11 pl-10 text-center text-lg tracking-widest font-mono" maxLength={6} inputMode="numeric" />
                </div>
                <div className="mt-2">
                  <button type="button" onClick={resendOtp} disabled={resendTimer > 0 || submitting} className="text-[11px] text-emerald-400 hover:text-emerald-300 disabled:opacity-40">
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
              </div>
            )}

            {/* New password — forgot-reset only */}
            {isForgotReset && otpVerified && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(null); }} disabled={submitting} placeholder="Enter new password" className="h-11 pl-10" autoFocus />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{error}</span>
              </div>
            )}

            {!(isForgotReset && !otpVerified) && (
              <Button type="submit" disabled={submitting || (!email.trim() && !isSignupOtp && view !== "forgot-otp" && view !== "forgot-reset")} className="h-11 w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignup ? <UserPlus className="h-4 w-4" /> : isSignin ? <LogIn className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                {submitting ? "Please wait…" : isSignup ? "Send Verification OTP" : isSignin ? "Sign In" : isSignupOtp ? "Verify & Create Account" : view === "forgot-email" ? "Send OTP" : view === "forgot-otp" ? "Verify OTP" : "Reset Password"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            )}
          </form>

          <div className="mt-4 space-y-2 text-center">
            {isSignin && (
              <button type="button" onClick={() => { setView("forgot-email"); setError(null); setSuccessMsg(null); setOtpVerified(false); }} className="text-[11px] text-muted-foreground hover:text-emerald-400">Forgot password?</button>
            )}
            <p className="text-[11px] text-muted-foreground">
              {isSignup ? (<>Already have an account? <button type="button" onClick={() => { setView("signin"); setError(null); setSuccessMsg(null); }} className="font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300">Sign in</button></>) : isSignin ? (<>New here? <button type="button" onClick={() => { setView("signup"); setError(null); setSuccessMsg(null); }} className="font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300">Create an account</button></>) : null}
            </p>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">© {new Date().getFullYear()} {DEVELOPER_INFO.name}. All rights reserved.</p>
      </div>
    </div>
  );
}
