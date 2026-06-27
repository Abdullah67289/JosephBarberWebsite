// End-to-end test of the shop checkout flow (mock payment mode).
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const db = new PrismaClient();
let failures = 0;
const check = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) failures++; };

async function main() {
  const product = await db.product.findFirst({ where: { isActive: true, trackInventory: true, stock: { gt: 1 } }, include: { variants: true } });
  if (!product) throw new Error("No stocked product — run the seed.");
  const variant = product.variants[0] ?? null;
  const startStock = variant ? variant.stock : product.stock;
  console.log(`Product: ${product.name}${variant ? ` / ${variant.value}` : ""}  stock=${startStock}`);

  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: product.id, variantId: variant?.id ?? null, quantity: 1 }],
      customer: { name: "Shop Tester", email: `shop_${Date.now()}@test.dev`, phone: "905-555-0150" },
      fulfillmentType: "pickup",
      notes: "E2E test order",
    }),
  });
  const j = await res.json();
  check(res.status === 200 && j.ok, `Checkout succeeded (ref ${j.data?.reference}, ${j.data?.provider})`);
  check(j.data?.provider === "mock", "Ran in mock payment mode (offline)");

  const order = await db.order.findUnique({ where: { reference: j.data.reference }, include: { items: true } });
  check(order?.paymentStatus === "paid", "Order auto-marked paid in mock mode");
  check(order?.taxCents > 0, `Tax applied (${order?.taxCents}¢)`);
  check(order?.items.length === 1, "Order item recorded");

  const after = variant
    ? (await db.productVariant.findUnique({ where: { id: variant.id } }))?.stock
    : (await db.product.findUnique({ where: { id: product.id } }))?.stock;
  check(after === startStock - 1, `Stock decremented ${startStock} → ${after}`);

  const page = await fetch(`${BASE}/shop/order/${j.data.reference}`);
  check(page.status === 200, "Order confirmation page renders");

  console.log(`\n${failures === 0 ? "SHOP FLOW OK ✓" : failures + " CHECK(S) FAILED ✗"}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
