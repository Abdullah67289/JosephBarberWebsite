import { SectionHeading } from "@/components/site/section-heading";
import { ExpandableGallery, type GalleryPhoto } from "@/components/ui/expandable-gallery";

export function CraftDetail({
  photos,
  eyebrow = "The Craft",
  title = "In Detail",
}: {
  photos: GalleryPhoto[];
  eyebrow?: string;
  title?: string;
}) {
  if (photos.length === 0) return null;
  return (
    <section className="parchment relative overflow-hidden border-y border-primary/25">
      <span className="tool-pattern absolute inset-0 opacity-70" aria-hidden />
      <div className="container relative section-tight">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description="Where old-school discipline meets the modern gentleman — every detail, considered."
        />
        <div className="mt-12">
          <ExpandableGallery photos={photos} />
        </div>
      </div>
    </section>
  );
}
