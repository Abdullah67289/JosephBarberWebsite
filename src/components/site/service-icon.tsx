import {
  Scissors,
  Wind,
  Droplet,
  Sparkles,
  Baby,
  User,
  Ruler,
  Brush,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  scissors: Scissors,
  wind: Wind,
  droplet: Droplet,
  sparkles: Sparkles,
  baby: Baby,
  user: User,
  ruler: Ruler,
  brush: Brush,
};

export function ServiceIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Scissors;
  return <Icon className={className} />;
}
