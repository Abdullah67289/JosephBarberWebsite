"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** Dollar input bound to integer cents. */
export function MoneyInput({
  cents,
  onChange,
  id,
  placeholder,
}: {
  cents: number;
  onChange: (cents: number) => void;
  id?: string;
  placeholder?: string;
}) {
  const [text, setText] = React.useState((cents / 100).toString());
  React.useEffect(() => {
    setText(cents ? (cents / 100).toString() : "");
  }, [cents]);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input
        id={id}
        inputMode="decimal"
        className="pl-7"
        value={text}
        placeholder={placeholder ?? "0.00"}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.]/g, "");
          setText(v);
          const num = Number.parseFloat(v);
          onChange(Number.isNaN(num) ? 0 : Math.round(num * 100));
        }}
      />
    </div>
  );
}

/** time input (HH:MM) bound to minutes-from-midnight. */
export function TimeInput({
  minutes,
  onChange,
  id,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
  id?: string;
}) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return (
    <Input
      id={id}
      type="time"
      value={`${hh}:${mm}`}
      onChange={(e) => {
        const parts = e.target.value.split(":").map(Number);
        const h = parts[0] ?? NaN;
        const m = parts[1] ?? NaN;
        if (!Number.isNaN(h) && !Number.isNaN(m)) onChange(h * 60 + m);
      }}
      className="w-[130px]"
    />
  );
}

export function NumberInput({
  value,
  onChange,
  id,
  min = 0,
  max,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  id?: string;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <Input
      id={id}
      type="number"
      value={Number.isNaN(value) ? "" : value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={className}
    />
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-background/40 p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
        className,
      )}
    >
      {children}
    </button>
  );
}
