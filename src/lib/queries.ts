import { db } from "./db";
import type { ProductCardData } from "@/components/shop/product-card";

/** Shared read queries for the public site (services, staff, shop, content). */

export async function getActiveServices() {
  return db.service.findMany({
    where: { isActive: true, showOnServicesPage: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      durationMin: true,
      priceCents: true,
      icon: true,
      isBookable: true,
      isFeatured: true,
    },
  });
}

export async function getServiceCategoriesWithServices(args: { bookableOnly?: boolean } = {}) {
  const categories = await db.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      services: {
        where: {
          isActive: true,
          showOnServicesPage: true,
          ...(args.bookableOnly ? { isBookable: true } : {}),
        },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          durationMin: true,
          priceCents: true,
          icon: true,
          isBookable: true,
        },
      },
    },
  });
  // Drop empty categories.
  return categories.filter((c) => c.services.length > 0);
}

export async function getActiveStaff() {
  return db.staff.findMany({
    where: { isActive: true, showOnPublicSite: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true, slug: true, title: true, bio: true, photoUrl: true },
  });
}

export async function getBookableStaff() {
  return db.staff.findMany({
    where: { isActive: true, acceptsBookings: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true, slug: true, title: true, photoUrl: true },
  });
}

function toProductCard(p: Awaited<ReturnType<typeof rawProducts>>[number]): ProductCardData {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    priceCents: p.priceCents,
    salePriceCents: p.salePriceCents,
    imageUrl: p.images[0]?.url ?? null,
    stock: p.stock,
    trackInventory: p.trackInventory,
    lowStockThreshold: p.lowStockThreshold,
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      value: v.value,
      priceDeltaCents: v.priceDeltaCents,
      stock: v.stock,
    })),
  };
}

function rawProducts(args: { featuredOnly?: boolean; categorySlug?: string }) {
  return db.product.findMany({
    where: {
      isActive: true,
      ...(args.featuredOnly ? { isFeatured: true } : {}),
      ...(args.categorySlug ? { category: { slug: args.categorySlug } } : {}),
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      priceCents: true,
      salePriceCents: true,
      stock: true,
      trackInventory: true,
      lowStockThreshold: true,
      images: {
        orderBy: { displayOrder: "asc" },
        take: 1,
        select: { url: true },
      },
      variants: {
        select: {
          id: true,
          name: true,
          value: true,
          priceDeltaCents: true,
          stock: true,
        },
      },
    },
  });
}

export async function getProducts(args: { featuredOnly?: boolean; categorySlug?: string } = {}) {
  const rows = await rawProducts(args);
  return rows.map(toProductCard);
}

export async function getProductCategories() {
  return db.productCategory.findMany({
    where: { isActive: true, products: { some: { isActive: true } } },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function getGalleryImages(args: { featuredOnly?: boolean } = {}) {
  return db.galleryImage.findMany({
    where: { isActive: true, ...(args.featuredOnly ? { isFeatured: true } : {}) },
    orderBy: { displayOrder: "asc" },
    select: { id: true, url: true, title: true, caption: true, category: true, alt: true, displayOrder: true, isFeatured: true },
  });
}

export async function getTestimonials(featuredOnly = false) {
  return db.testimonial.findMany({
    where: { isApproved: true, ...(featuredOnly ? { isFeatured: true } : {}) },
    orderBy: { displayOrder: "asc" },
    select: { id: true, author: true, role: true, sourceLabel: true, rating: true, text: true, avatarUrl: true },
  });
}

export async function getRatingSummary() {
  const summary = await db.testimonial.aggregate({
    where: { isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = summary._count._all;
  const avg = summary._avg.rating ?? 5;
  return { avg, count };
}

export async function getBusinessHours() {
  return db.businessHour.findMany({
    orderBy: { dayOfWeek: "asc" },
    select: { dayOfWeek: true, isOpen: true, openMinute: true, closeMinute: true },
  });
}

export async function getNavigationLinks(area: "header" | "footer") {
  return db.navigationLink.findMany({
    where: { area, isActive: true },
    orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    select: { href: true, label: true, openInNewTab: true },
  });
}

export async function getPageContent(
  pageKey: string,
  fallback: {
    eyebrow?: string | null;
    title: string;
    subtitle?: string | null;
    body?: string | null;
    ctaText?: string | null;
    ctaHref?: string | null;
    secondaryCtaText?: string | null;
    secondaryCtaHref?: string | null;
    heroImageUrl?: string | null;
  },
) {
  const row = await db.pageContent.findUnique({ where: { pageKey } });
  if (!row || !row.isActive) {
    return {
      pageKey,
      eyebrow: fallback.eyebrow ?? null,
      title: fallback.title,
      subtitle: fallback.subtitle ?? null,
      body: fallback.body ?? null,
      ctaText: fallback.ctaText ?? null,
      ctaHref: fallback.ctaHref ?? null,
      secondaryCtaText: fallback.secondaryCtaText ?? null,
      secondaryCtaHref: fallback.secondaryCtaHref ?? null,
      heroImageUrl: fallback.heroImageUrl ?? null,
      heroVideoUrl: null,
      seoTitle: null,
      seoDescription: null,
      ogImageUrl: null,
      isActive: true,
    };
  }
  return row;
}

export async function getHomeSections() {
  return db.homeSection.findMany({
    where: { isVisible: true },
    orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    select: {
      id: true,
      sectionKey: true,
      label: true,
      eyebrow: true,
      title: true,
      subtitle: true,
      ctaText: true,
      ctaHref: true,
      itemLimit: true,
      displayOrder: true,
    },
  });
}

export async function getSiteStats() {
  return db.siteStat.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    select: { id: true, label: true, value: true, suffix: true, icon: true, displayOrder: true },
  });
}

export async function getFaqItems() {
  return db.faqItem.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { question: "asc" }],
    select: { id: true, question: true, answer: true, category: true, displayOrder: true },
  });
}

export async function getPolicyItems() {
  return db.policyItem.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    select: { id: true, key: true, title: true, body: true, displayOrder: true },
  });
}

export async function getTimelineItems() {
  return db.timelineItem.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    select: { id: true, title: true, label: true, body: true, imageUrl: true, displayOrder: true },
  });
}
