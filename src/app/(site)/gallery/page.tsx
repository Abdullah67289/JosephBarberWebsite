import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { getGalleryImages, getPageContent } from "@/lib/queries";
import { PageHeader } from "@/components/site/page-header";
import { GalleryMasonry } from "@/components/site/gallery-masonry";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Gallery",
  description: "A look at the cuts, fades and shaves coming out of Joseph & Mike's chairs.",
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const [page, images] = await Promise.all([
    getPageContent("gallery", {
      eyebrow: "Gallery",
      title: "The work speaks for itself",
      subtitle: "Fresh cuts, sharp fades and clean shaves from the chairs at Joseph & Mike's.",
    }),
    getGalleryImages(),
  ]);

  return (
    <>
      <PageHeader eyebrow={page.eyebrow ?? "Gallery"} title={page.title} description={page.subtitle ?? undefined} />
      <section className="section">
        <div className="container">
          {images.length === 0 ? (
            <EmptyState title="Gallery coming soon" description="Check back shortly for a look at our latest work." />
          ) : (
            <GalleryMasonry images={images} />
          )}
          <div className="mt-12 text-center">
            <Button asChild size="lg">
              <Link href="/book">
                <CalendarCheck className="h-5 w-5" /> Book your cut
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
