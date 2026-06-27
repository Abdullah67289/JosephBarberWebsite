import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReviewsManager } from "@/components/admin/reviews-manager";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireRole("ADMIN");
  const reviews = await db.testimonial.findMany({ orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }], take: 100 });
  return <ReviewsManager reviews={reviews} />;
}
