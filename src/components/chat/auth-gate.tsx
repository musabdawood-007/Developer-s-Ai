"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, User, Lock, Eye, EyeOff, KeyRound, ChevronLeft, ShieldCheck } from "lucide-react";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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
      if (view === "signup") {
        if (!agreedToTerms) throw new Error("Please agree to the Terms of Service and Privacy Policy.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
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
        setEmail(""); setPassword(""); setConfirmPassword(""); setOtp(""); setNewPassword("");
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
  const isForgotEmail = view === "forgot-email";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img src="/custom-logo.png" alt="Developer's Ai" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-sm font-semibold">{BOT_NAME}</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <h1 className="mb-8 text-center text-2xl font-bold tracking-tight text-foreground">
            {isSignup ? "Sign up to Developer's Ai" : isSignin ? "Log in to Developer's Ai" : isSignupOtp ? "Verify Your Email" : isForgotEmail ? "Reset Password" : isForgotReset ? "Set New Password" : "Verify OTP"}
          </h1>

          {(isForgot || isSignupOtp) && (
            <button type="button" onClick={() => { setView(isSignupOtp ? "signup" : "signin"); setError(null); setSuccessMsg(null); setOtpVerified(false); }} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />Back
            </button>
          )}

          {successMsg && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {(isSignup) && (
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={name} onChange={(e) => { setName(e.target.value); setError(null); }} disabled={submitting} placeholder="Enter Your Full Name" className="h-12 bg-muted/50 border-0 pl-10 text-foreground placeholder:text-muted-foreground/60" maxLength={40} />
                </div>
              </div>
            )}

            {(isSignup || isSignin || isForgotEmail) && (
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} disabled={submitting} placeholder="Enter Your Email" className="h-12 bg-muted/50 border-0 pl-10 text-foreground placeholder:text-muted-foreground/60" autoComplete="email" />
                </div>
              </div>
            )}

            {(isSignup || isSignin) && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} disabled={submitting} placeholder={isSignup ? "Enter Your Password" : "Enter Your Password"} className="h-12 bg-muted/50 border-0 pl-10 pr-10 text-foreground placeholder:text-muted-foreground/60" autoComplete={isSignup ? "new-password" : "current-password"} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {isSignup && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }} disabled={submitting} placeholder="Enter Your Password Again" className="h-12 bg-muted/50 border-0 pl-10 pr-10 text-foreground placeholder:text-muted-foreground/60" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {(isSignupOtp || view === "forgot-otp") && (
              <div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={otp} onChange={(e) => { setOtp(e.target.value); setError(null); }} disabled={submitting} placeholder="000000" className="h-12 bg-muted/50 border-0 pl-10 text-center text-lg tracking-widest font-mono text-foreground placeholder:text-muted-foreground/60" maxLength={6} inputMode="numeric" />
                </div>
                <div className="mt-2">
                  <button type="button" onClick={resendOtp} disabled={resendTimer > 0 || submitting} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
              </div>
            )}

            {isForgotReset && otpVerified && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(null); }} disabled={submitting} placeholder="Enter new password" className="h-12 bg-muted/50 border-0 pl-10 text-foreground placeholder:text-muted-foreground/60" autoFocus />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <span>{error}</span>
              </div>
            )}

            {isSignin && !isForgot && (
              <div className="flex justify-end">
                <button type="button" onClick={() => { setView("forgot-email"); setError(null); setSuccessMsg(null); setOtpVerified(false); }} className="text-xs text-muted-foreground hover:text-foreground">
                  Forgot password?
                </button>
              </div>
            )}

            {!(isForgotReset && !otpVerified) && (
              <Button type="submit" disabled={submitting || (!email.trim() && !isSignupOtp && view !== "forgot-otp" && view !== "forgot-reset") || (isSignup && !agreedToTerms)} className="h-12 w-full rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignup ? "Create Account" : isSignin ? "Sign in" : isSignupOtp ? "Verify & Create Account" : view === "forgot-email" ? "Send OTP" : view === "forgot-otp" ? "Verify OTP" : "Reset Password"}
              </Button>
            )}

            {isSignup && (
              <>
                <div className="flex items-start gap-2">
                  <input type="checkbox" id="terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-border bg-muted accent-foreground" />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                    I agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-2 hover:text-foreground">Terms and Conditions</a>
                    {" "}and{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-2 hover:text-foreground">Privacy Policy</a>
                    . I understand that my chat data is stored locally in my browser and not on any server.
                  </label>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-1.5">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">What we collect:</span> Your name, email, and hashed password for authentication only.
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">What we don&apos;t store:</span> Your chat messages, images, and conversations are saved only in your browser&apos;s localStorage. We have no access to them.
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Your control:</span> You can delete all your data anytime by signing out or clearing your browser data.
                  </p>
                </div>
              </>
            )}

            {isSignin && (
              <p className="text-[11px] text-center text-muted-foreground">
                By signing in, you agree to our{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-2 hover:text-foreground">Terms and Conditions</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
              </p>
            )}
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignup ? (
                <>Already have an account?{" "}<button type="button" onClick={() => { setView("signin"); setError(null); setSuccessMsg(null); }} className="font-medium text-foreground underline underline-offset-2 hover:text-foreground">Log in</button></>
              ) : isSignin && !isForgot ? (
                <>Don&apos;t have an account?{" "}<button type="button" onClick={() => { setView("signup"); setError(null); setSuccessMsg(null); }} className="font-medium text-foreground underline underline-offset-2 hover:text-foreground">Sign up</button></>
              ) : null}
            </p>
          </div>

          {isSignin && !isForgot && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-3">
                <button type="button" className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-muted/50 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </>
          )}

          {isSignup && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-3">
                <button type="button" className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-muted/50 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
