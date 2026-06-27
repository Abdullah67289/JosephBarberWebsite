"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  title: string;
  icon: LucideIcon;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

export type ExpandableTabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: ExpandableTabItem[];
  className?: string;
  activeColor?: string;
  selectedIndex?: number | null;
  defaultSelectedIndex?: number | null;
  onChange?: (index: number | null) => void;
}

const buttonVariants = {
  animate: (isSelected: boolean) => ({
    gap: isSelected ? "0.5rem" : 0,
    paddingLeft: isSelected ? "1rem" : "0.55rem",
    paddingRight: isSelected ? "1rem" : "0.55rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.08, type: "spring", bounce: 0, duration: 0.5 } as const;

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  selectedIndex,
  defaultSelectedIndex = null,
  onChange,
}: ExpandableTabsProps) {
  const [internalSelected, setInternalSelected] = React.useState<number | null>(defaultSelectedIndex);
  const outsideClickRef = React.useRef<HTMLDivElement | null>(null);
  const isControlled = selectedIndex !== undefined;
  const selected = isControlled ? selectedIndex : internalSelected;

  useOnClickOutside(outsideClickRef as React.RefObject<HTMLElement>, () => {
    if (!isControlled) setInternalSelected(null);
    onChange?.(null);
  });

  const handleSelect = (index: number) => {
    if (!isControlled) setInternalSelected(index);
    onChange?.(index);
  };

  return (
    <div
      ref={outsideClickRef}
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-xl border border-border bg-background/60 p-1 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)] backdrop-blur-xl",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <div key={`separator-${index}`} className="mx-1 h-6 w-px bg-border" aria-hidden="true" />;
        }

        const Icon = tab.icon;
        const isSelected = selected === index;

        return (
          <motion.button
            key={tab.title}
            type="button"
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={isSelected}
            onClick={() => handleSelect(index)}
            transition={transition}
            aria-pressed={isSelected}
            title={tab.title}
            className={cn(
              "relative flex h-9 min-w-9 items-center justify-center overflow-hidden rounded-lg text-sm font-medium transition-colors duration-300",
              isSelected
                ? cn("bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.22)]", activeColor)
                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
            )}
          >
            <Icon size={17} />
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
