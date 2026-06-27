import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { GalleryManager } from "@/components/admin/gallery-manager";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  await requireRole("ADMIN");
  const images = await db.galleryImage.findMany({ orderBy: { displayOrder: "asc" }, take: 120 });
  return <GalleryManager images={images} />;
}
