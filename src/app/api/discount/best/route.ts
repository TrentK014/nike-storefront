import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type DiscountRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order_cents: number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
};

function discountAmountFor(d: DiscountRow, subtotalCents: number): number {
  if (d.type === "percent") {
    const pct = Math.min(100, Math.max(0, Number(d.value)));
    return Math.round((subtotalCents * pct) / 100);
  }
  if (d.type === "fixed") {
    return Math.min(Math.max(0, Math.round(Number(d.value))), subtotalCents);
  }
  return 0;
}

/**
 * GET /api/discount/best?subtotal_cents= - find the single best currently
 * valid discount code for a cart, so shoppers don't have to already know one.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subtotalCents = Math.max(0, Math.round(Number(searchParams.get("subtotal_cents")) || 0));

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: rows, error } = await supabase
    .from("discount_codes")
    .select("id, code, type, value, min_order_cents, valid_from, valid_until, max_uses, used_count");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const eligible = (rows as DiscountRow[]).filter((d) => {
    if (d.valid_from && d.valid_from > now) return false;
    if (d.valid_until && d.valid_until < now) return false;
    if (d.max_uses != null && d.used_count >= d.max_uses) return false;
    if (d.min_order_cents && subtotalCents < d.min_order_cents) return false;
    return true;
  });

  const best = eligible.reduce((top, d) =>
    discountAmountFor(d, subtotalCents) > discountAmountFor(top, subtotalCents) ? d : top,
  );

  return NextResponse.json({
    code: best.code,
    discount_amount_cents: discountAmountFor(best, subtotalCents),
  });
}
