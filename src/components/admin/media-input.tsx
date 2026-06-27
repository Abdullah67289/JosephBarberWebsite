"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { shouldOptimizeImage } from "@/lib/image";

export function MediaInput({
  label,
  value,
  onChange,
  placeholder = "https://...",
  className,
  required,
}: {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function upload(file: File) {
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    try {
      const res = await fetch("/api/admin/uploads", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Upload failed.");
        return;
      }
      onChange(json.data.url);
      toast.success("Image uploaded.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <p className="text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-primary">*</span>}
        </p>
      )}
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        <Button type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()} className="shrink-0">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Upload
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {value && (
        <div className="overflow-hidden rounded-md border border-border bg-secondary">
          <div className="relative h-28 w-full">
            <Image
              src={value}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              unoptimized={!shouldOptimizeImage(value)}
              className="object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}
