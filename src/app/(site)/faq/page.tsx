import type { Metadata } from "next";
import { HelpCircle, ShieldCheck, ChevronDown } from "lucide-react";
import { getFaqItems, getPageContent, getPolicyItems } from "@/lib/queries";
import { PageHeader } from "@/components/site/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "FAQ & Policies",
  description: "Booking questions, policies, cancellation details, and shop guidance.",
};

export const revalidate = 300;

export default async function FaqPage() {
  const [page, faqs, policies] = await Promise.all([
    getPageContent("faq", {
      eyebrow: "FAQ & Policies",
      title: "Good to know before you book",
      subtitle: "Answers, booking guidance, and shop policies in one place.",
    }),
    getFaqItems(),
    getPolicyItems(),
  ]);

  return (
    <>
      <PageHeader eyebrow={page.eyebrow ?? "FAQ & Policies"} title={page.title} description={page.subtitle ?? undefined} />
      <section className="section">
        <div className="container grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Reveal as="div">
              <h2 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold">
                <HelpCircle className="h-5 w-5 text-primary" /> Questions
              </h2>
            </Reveal>
            {faqs.length === 0 ? (
              <EmptyState title="No questions published yet" description="Check back soon for booking and shop guidance." />
            ) : (
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <details key={faq.id} className="faq-disclosure rounded-xl border border-border bg-card p-5">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 font-medium">
                      {faq.question}
                      <ChevronDown className="faq-chevron h-4 w-4 shrink-0 text-primary transition-transform duration-300" />
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                  </details>
                ))}
              </div>
            )}
          </div>

          <div>
            <Reveal as="div">
              <h2 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold">
                <ShieldCheck className="h-5 w-5 text-primary" /> Policies
              </h2>
            </Reveal>
            {policies.length === 0 ? (
              <EmptyState title="No policies published yet" description="The shop will add policy details soon." />
            ) : (
              <div className="space-y-3">
                {policies.map((policy) => (
                  <article
                    key={policy.id}
                    className="rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-md"
                  >
                    <h3 className="font-display text-lg font-semibold">{policy.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{policy.body}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
