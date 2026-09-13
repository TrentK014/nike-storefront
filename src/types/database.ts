import type { Database } from "./supabase";

export type { Database, Json } from "./supabase";

export type Shoe = Database["public"]["Tables"]["shoes"]["Row"];

/** Shoe with sale info from stock: min price across variants, and whether any variant is on sale. */
export type ShoeWithSale = Shoe & { minPrice: number; onSale: boolean };

/** Compute effective price from msrp and sale_percent (0–100). */
export function salePrice(msrp: number, salePercent: number): number {
  return Math.round(msrp * (1 - (salePercent ?? 0) / 100) * 100) / 100;
}

/** From a shoe's msrp and its stock rows (with sale_percent), compute minPrice and onSale. */
export function shoeSaleFromStock(
  msrp: number,
  stock: { sale_percent?: number | null }[]
): { minPrice: number; onSale: boolean } {
  if (!stock?.length) return { minPrice: msrp, onSale: false };
  const prices = stock.map((s) => salePrice(msrp, s.sale_percent ?? 0));
  const minPrice = Math.min(...prices);
  const onSale = stock.some((s) => (s.sale_percent ?? 0) > 0);
  return { minPrice, onSale };
}
export type ShoeInsert = Database["public"]["Tables"]["shoes"]["Insert"];
export type ShoeUpdate = Database["public"]["Tables"]["shoes"]["Update"];

export type Stock = Database["public"]["Tables"]["stock"]["Row"];
export type StockInsert = Database["public"]["Tables"]["stock"]["Insert"];
export type StockUpdate = Database["public"]["Tables"]["stock"]["Update"];

export type UserFavorite = Database["public"]["Tables"]["user_favorites"]["Row"];
export type UserFavoriteInsert = Database["public"]["Tables"]["user_favorites"]["Insert"];

export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];
export type ReviewUpdate = Database["public"]["Tables"]["reviews"]["Update"];

export type CartItem = Database["public"]["Tables"]["cart_items"]["Row"];
export type CartItemInsert = Database["public"]["Tables"]["cart_items"]["Insert"];
export type CartItemUpdate = Database["public"]["Tables"]["cart_items"]["Update"];
