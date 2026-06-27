"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Eye, EyeOff, UserPlus } from "lucide-react";
import { signupAction, type SignupState } from "@/server/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" loading={pending}>
      <UserPlus className="h-4 w-4" /> Create account
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState<SignupState, FormData>(signupAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      <Field label="Name" htmlFor="su-name">
        <Input id="su-name" name="name" autoComplete="name" required placeholder="Jane Barber" />
      </Field>
      <Field label="Email" htmlFor="su-email">
        <Input id="su-email" name="email" type="email" autoComplete="email" required placeholder="you@shop.com" />
      </Field>
      <Field label="Password" htmlFor="su-password" hint="At least 8 characters, with a letter and a number.">
        <div className="relative">
          <Input
            id="su-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <Field label="Confirm password" htmlFor="su-confirm">
        <Input
          id="su-confirm"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
        />
      </Field>
      <SubmitButton />
    </form>
  );
}
