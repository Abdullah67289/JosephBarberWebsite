"use client";

import * as React from "react";
import { Search, PackageOpen } from "lucide-react";
import { ProductCard, type ProductCardData } from "./product-card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface ShopProduct extends ProductCardData {
  categoryId: string | null;
}

export function ShopBrowser({
  products,
  categories,
}: {
  products: ShopProduct[];
  categories: { id: string; name: string }[];
}) {
  const [category, setCategory] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");

  const filtered = products.filter((p) => {
    const matchCat = category === "all" || p.categoryId === category;
    const matchQuery = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </FilterChip>
          {categories.map((c) => (
            <FilterChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
              {c.name}
            </FilterChip>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={PackageOpen} title="No products found" description="Try a different category or search term." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <div key={p.id} className="animate-fade-up">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 active:scale-95",
        active ? "border-primary bg-primary text-primary-foreground shadow-glow" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
