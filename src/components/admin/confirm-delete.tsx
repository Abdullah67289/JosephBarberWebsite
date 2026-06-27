"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useAction } from "./use-action";
import type { ActionResult } from "@/server/_helpers";

export function ConfirmDelete({
  onConfirm,
  title = "Delete this item?",
  description = "This action cannot be undone.",
  success = "Deleted.",
  trigger,
}: {
  onConfirm: () => Promise<ActionResult>;
  title?: string;
  description?: string;
  success?: string;
  trigger?: React.ReactNode;
}) {
  const { busy, run } = useAction();
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            loading={busy}
            onClick={async () => {
              const res = await run(onConfirm, { success });
              if (res.ok) setOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
