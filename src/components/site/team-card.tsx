import Link from "next/link";
import Image from "next/image";
import { CalendarCheck } from "lucide-react";
import { shouldOptimizeImage } from "@/lib/image";

export interface TeamMember {
  id: string;
  name: string;
  slug: string;
  title: string;
  bio?: string | null;
  photoUrl?: string | null;
}

export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div className="premium-card group flex h-full min-h-[500px] flex-col">
      <div className="premium-image relative aspect-[4/5] overflow-hidden bg-secondary">
        {member.photoUrl ? (
          <Image
            src={member.photoUrl}
            alt={member.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={!shouldOptimizeImage(member.photoUrl)}
            className="h-full w-full object-cover contrast-[1.04] saturate-95 transition-all duration-500 group-hover:scale-105 group-hover:saturate-110"
          />
        ) : (
          <div className="grid h-full place-items-center font-display text-6xl text-muted-foreground/40">
            {member.name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/55 via-card/10 to-transparent" />
        <Link
          href={`/book?barber=${member.slug}`}
          className="absolute bottom-4 right-4 grid h-11 w-11 translate-y-3 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-glow transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
          aria-label={`Book with ${member.name}`}
        >
          <CalendarCheck className="h-5 w-5" />
        </Link>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold">{member.name}</h3>
        <p className="text-sm text-primary">{member.title}</p>
        {member.bio && <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-4">{member.bio}</p>}
        <Link
          href={`/book?barber=${member.slug}`}
          className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Book with {member.name.split(" ")[0]} <CalendarCheck className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
