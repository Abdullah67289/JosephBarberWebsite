"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/server/_helpers";

/** Wrap a server-action call with busy state + toast + router refresh. */
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function run(
    fn: () => Promise<ActionResult>,
    opts: { success?: string; onSuccess?: () => void } = {},
  ): Promise<ActionResult> {
    setBusy(true);
    try {
      const res = await fn();
      if (res.ok) {
        if (opts.success) toast.success(opts.success);
        opts.onSuccess?.();
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
      return res;
    } catch (err) {
      toast.error("Unexpected error. Please try again.");
      return { ok: false, error: String(err) };
    } finally {
      setBusy(false);
    }
  }

  return { busy, run };
}
