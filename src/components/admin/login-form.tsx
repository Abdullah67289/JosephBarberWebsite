"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, FlaskConical, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { devBypassLoginAction, loginAction, type LoginState } from "@/server/auth-actions";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LoginMood } from "@/components/admin/login-atelier-panel";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <motion.button
      whileHover={{ scale: pending ? 1 : 1.018 }}
      whileTap={{ scale: pending ? 1 : 0.985 }}
      type="submit"
      disabled={pending}
      className="group/button relative mt-1 w-full disabled:cursor-not-allowed"
    >
      <div className="absolute inset-0 rounded-lg bg-primary/25 opacity-0 blur-xl transition-opacity duration-300 group-hover/button:opacity-80" />
      <div className="relative flex h-11 items-center justify-center overflow-hidden rounded-lg bg-primary font-semibold text-primary-foreground shadow-[0_16px_44px_-22px_hsl(var(--primary)/0.9)] transition-colors duration-300 group-hover/button:bg-gold-500">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent"
          animate={pending ? { x: ["-120%", "120%"] } : { x: "-120%" }}
          transition={{ duration: 1.25, repeat: pending ? Infinity : 0, ease: "easeInOut" }}
        />
        <AnimatePresence mode="wait" initial={false}>
          {pending ? (
            <motion.span
              key="pending"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="relative flex items-center gap-2"
            >
              <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/70 border-t-transparent motion-safe:animate-spin" />
              Signing in
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="relative flex items-center gap-2"
            >
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-1" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

export function LoginForm({
  next,
  devBypassEnabled,
  showTestCreds,
  onMoodChange,
}: {
  next?: string;
  devBypassEnabled?: boolean;
  showTestCreds?: boolean;
  onMoodChange?: (mood: LoginMood) => void;
}) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedInput, setFocusedInput] = useState<"email" | "password" | null>(null);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? "/admin"} />

        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.error}
          </motion.div>
        )}

        <motion.div
          className={cn("relative", focusedInput === "email" && "z-10")}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        >
          <div className="absolute -inset-px rounded-lg bg-gradient-to-r from-primary/20 via-white/10 to-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="group relative flex items-center overflow-hidden rounded-lg">
            <Mail
              className={cn(
                "absolute left-3 h-4 w-4 transition-colors duration-300",
                focusedInput === "email" ? "text-primary" : "text-muted-foreground",
              )}
            />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={email}
              onFocus={() => {
                setFocusedInput("email");
                onMoodChange?.("typing");
              }}
              onBlur={() => {
                setFocusedInput(null);
                onMoodChange?.("idle");
              }}
              onChange={(event) => {
                setEmail(event.target.value);
                onMoodChange?.("typing");
              }}
              className="h-11 border-border bg-secondary/50 pl-10 pr-3 text-foreground shadow-none placeholder:text-muted-foreground/70 transition-all duration-300 focus-visible:border-primary/50 focus-visible:bg-secondary focus-visible:ring-primary/25"
            />
            {focusedInput === "email" && (
              <motion.div layoutId="login-input-highlight" className="absolute inset-0 -z-10 bg-primary/5" transition={{ duration: 0.18 }} />
            )}
          </div>
        </motion.div>

        <motion.div
          className={cn("relative", focusedInput === "password" && "z-10")}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        >
          <div className="absolute -inset-px rounded-lg bg-gradient-to-r from-primary/20 via-white/10 to-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="group relative flex items-center overflow-hidden rounded-lg">
            <Lock
              className={cn(
                "absolute left-3 h-4 w-4 transition-colors duration-300",
                focusedInput === "password" ? "text-primary" : "text-muted-foreground",
              )}
            />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Password"
              className="h-11 border-border bg-secondary/50 pl-10 pr-10 text-foreground shadow-none placeholder:text-muted-foreground/70 transition-all duration-300 focus-visible:border-primary/50 focus-visible:bg-secondary focus-visible:ring-primary/25"
              value={password}
              onFocus={() => {
                setFocusedInput("password");
                onMoodChange?.(showPassword ? "peek" : "password");
              }}
              onBlur={() => {
                setFocusedInput(null);
                onMoodChange?.("idle");
              }}
              onChange={(event) => {
                setPassword(event.target.value);
                onMoodChange?.(showPassword ? "peek" : "password");
              }}
            />
            <button
              type="button"
              onClick={() => {
                setShowPassword((isVisible) => {
                  const nextVisible = !isVisible;
                  onMoodChange?.(nextVisible && password.length > 0 ? "peek" : "password");
                  return nextVisible;
                });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {focusedInput === "password" && (
              <motion.div layoutId="login-input-highlight" className="absolute inset-0 -z-10 bg-primary/5" transition={{ duration: 0.18 }} />
            )}
          </div>
        </motion.div>

        <div className="flex items-center justify-between pt-1">
          <label htmlFor="remember-me" className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <span className="relative grid h-4 w-4 place-items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe((value) => !value)}
                className="h-4 w-4 appearance-none rounded border border-border bg-secondary/60 transition-all duration-200 checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <AnimatePresence>
                {rememberMe && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="pointer-events-none absolute text-primary-foreground"
                  >
                    <Check className="h-3 w-3" />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            Remember me
          </label>
          <button
            type="button"
            onClick={() => toast.info("Password resets are not set up yet. Please ask the shop owner to reset it.")}
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Forgot password?
          </button>
        </div>

        <SubmitButton />
      </form>

      {devBypassEnabled && (
        <form action={devBypassLoginAction} className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
          <input type="hidden" name="next" value={next ?? "/admin"} />
          <p className="mb-3 text-xs leading-relaxed text-amber-100/90">
            Development bypass is active for local testing only. Turn off <code>ALLOW_DEV_ADMIN_BYPASS</code> before production.
          </p>
          <button
            type="submit"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 text-sm font-semibold text-amber-100 transition-all duration-300 hover:border-amber-300/50 hover:bg-amber-400/20"
          >
            <FlaskConical className="h-4 w-4" />
            Enter as dev admin
          </button>
        </form>
      )}

      {showTestCreds && (
        <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs">
          <p className="mb-1.5 font-semibold text-foreground">Local test login (development only)</p>
          <p className="text-muted-foreground">
            Email: <span className="font-mono text-foreground">admin@test.com</span>
          </p>
          <p className="text-muted-foreground">
            Password: <span className="font-mono text-foreground">Admin123!</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail("admin@test.com");
              setPassword("Admin123!");
              onMoodChange?.("peek");
            }}
            className="mt-2 font-medium text-primary hover:underline"
          >
            Fill test credentials
          </button>
        </div>
      )}
    </div>
  );
}
