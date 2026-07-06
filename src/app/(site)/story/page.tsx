import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, Quote, Scissors, Droplet, Sparkles } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getActiveStaff, getActiveServices, getTestimonials, getGalleryImages, getPageContent, getTimelineItems } from "@/lib/queries";
import { PageHeader } from "@/components/site/page-header";
import { TeamCard } from "@/components/site/team-card";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Counter } from "@/components/motion/counter";
import { Button } from "@/components/ui/button";
import DisplayCards from "@/components/ui/display-cards";
import { SignatureExperience, type ExperienceCard } from "@/components/site/sections/signature-experience";
import { ClientStories } from "@/components/site/sections/client-stories";
import { shouldOptimizeImage } from "@/lib/image";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Three generations of barbering in downtown Milton — established 1966 by Mike Boughton.",
};

export const dynamic = "force-dynamic";

export default async function StoryPage() {
  const [settings, page, timeline, staff, services, testimonials, gallery] = await Promise.all([
    getSettings(),
    getPageContent("story", {
      eyebrow: "Since 1966",
      title: "Our Story",
      subtitle: "Three generations of barbering in downtown Milton.",
      body: "",
    }),
    getTimelineItems(),
    getActiveStaff(),
    getActiveServices(),
    getTestimonials(true),
    getGalleryImages(),
  ]);
  const storyBody = page.body || settings.aboutBody;
  const paragraphs = storyBody.split(/\n\s*\n|\.(?=\s+[A-Z])/).filter((p) => p.trim().length > 40);

  const galleryUrls = gallery.map((g) => g.url);
  const heroFallback = settings.heroImageUrl || "";
  const experienceCards: ExperienceCard[] = services.slice(0, 3).map((s, i) => ({
    title: s.name,
    description: s.description || "A signature service at Joseph & Mike's.",
    image: galleryUrls[i] || heroFallback,
  }));

  const storyTestimonials = testimonials.slice(0, 3).map((t, i) => ({
    id: i + 1,
    testimonial: t.text,
    author: t.role ? `${t.author} · ${t.role}` : t.author,
    image: t.avatarUrl ?? null,
  }));

  const apartCards = [
    {
      icon: <Scissors className="size-4 text-gold-200" />,
      title: "Master barbers",
      description: "55+ years of craft",
      date: "Since 1966",
      className:
        "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      icon: <Droplet className="size-4 text-gold-200" />,
      title: "Hot-towel ritual",
      description: "Classic straight-razor finish",
      date: "Every shave",
      className:
        "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      icon: <Sparkles className="size-4 text-gold-200" />,
      title: "Walk-ins welcome",
      description: "Or book online in a minute",
      date: "7 days a week",
      className: "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
    },
  ];

  return (
    <>
      <PageHeader eyebrow={page.eyebrow ?? "Since 1966"} title={page.title || settings.aboutTitle || "Our Story"} description={page.subtitle ?? undefined} />

      <section className="section section-build">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="premium-card premium-image relative aspect-[4/5]">
              {settings.heroImageUrl && (
                <Image
                  src={settings.heroImageUrl}
                  alt="The shop"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  unoptimized={!shouldOptimizeImage(settings.heroImageUrl)}
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Quote className="h-10 w-10 text-primary/40" />
            <div className="mt-4 space-y-4 text-pretty leading-relaxed text-muted-foreground">
              {paragraphs.length ? (
                paragraphs.map((p, i) => <p key={i}>{p.trim().endsWith(".") ? p.trim() : `${p.trim()}.`}</p>)
              ) : (
                <p>{storyBody}</p>
              )}
            </div>
            <Button asChild className="mt-7" size="lg">
              <Link href="/book">
                <CalendarCheck className="h-5 w-5" /> Sit in our chair
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {experienceCards.length > 0 && (
        <section className="section section-build border-t border-border">
          <div className="container grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <SectionHeading align="left" eyebrow="The Experience" title="A chair you'll look forward to" />
              <p className="mt-5 max-w-md text-pretty leading-relaxed text-muted-foreground">
                From the first hot towel to the final straight-razor pass, every visit is unhurried and exact —
                sharp fades, sculpted beards, and the kind of conversation that has kept Milton coming back for
                generations.
              </p>
              <Button asChild className="mt-7" size="lg">
                <Link href="/book">
                  <CalendarCheck className="h-5 w-5" /> Book the experience
                </Link>
              </Button>
            </Reveal>
            <div className="flex justify-center lg:justify-end">
              <SignatureExperience cards={experienceCards} />
            </div>
          </div>
        </section>
      )}

      {timeline.length > 0 && (
        <section className="section section-build border-y border-border bg-card/30">
          <div className="container">
            <SectionHeading eyebrow="History" title="Milestones" />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {timeline.map((item) => (
                <Reveal key={item.id} className="premium-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">{item.label}</p>
                  <h3 className="mt-2 font-display text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section section-build">
        <div className="container">
          <SectionHeading
            eyebrow="Why Joseph & Mike's"
            title="What sets us apart"
            description="A few things that keep Milton settling into our chairs."
          />
          <div className="mt-16 flex min-h-[300px] w-full items-center justify-center overflow-hidden">
            <div className="origin-center scale-[0.78] sm:scale-90 lg:scale-100">
              <DisplayCards cards={apartCards} />
            </div>
          </div>
        </div>
      </section>

      <section className="section-build border-y border-border bg-card/30">
        <div className="container grid grid-cols-3 gap-8 py-14 text-center">
          {[
            { value: 58, suffix: "+", label: "Years serving Milton" },
            { value: 3, suffix: "", label: "Generations of barbers" },
            { value: 100, suffix: "k+", label: "Cuts and counting" },
          ].map((s) => (
            <Reveal key={s.label}>
              <div className="font-display text-4xl font-bold text-primary">
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {storyTestimonials.length > 0 && (
        <section className="section section-build">
          <div className="container grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <SectionHeading
                align="left"
                eyebrow="From the chair"
                title="What our clients say"
                description="Real words from real regulars — give the top card a flick to read the next one."
              />
              <Button asChild className="mt-7" variant="outline" size="lg">
                <Link href="/book">
                  <CalendarCheck className="h-5 w-5" /> Join them
                </Link>
              </Button>
            </Reveal>
            <div className="flex justify-center lg:justify-end">
              <ClientStories testimonials={storyTestimonials} />
            </div>
          </div>
        </section>
      )}

      {staff.length > 0 && (
        <section className="section section-build">
          <div className="container">
            <SectionHeading eyebrow="The Family" title="The people behind the chairs" />
            <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map((m) => (
                <StaggerItem key={m.id}>
                  <TeamCard member={m} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}
    </>
  );
}
