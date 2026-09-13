"use client";

import { StorefrontLayout } from "@/components/StorefrontLayout";
import { supabase } from "@/lib/supabase";
import { salePrice } from "@/types/database";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CartItem = {
  shoe_id: string;
  size: string;
  quantity: number;
  msrp: number;
  sale_percent?: number;
  shoe_name?: string;
  display_image?: string | null;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; discount_amount_cents: number } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [bestOffer, setBestOffer] = useState<{ code: string; discount_amount_cents: number } | null>(null);

  const loadCart = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setCartItems([]);
      setCartLoading(false);
      return;
    }
    const res = await fetch("/api/cart", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!res.ok) {
      setCartItems([]);
      setCartLoading(false);
      return;
    }
    const data = await res.json();
    setCartItems(Array.isArray(data) ? data : []);
    setCartLoading(false);
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const subtotalCents = cartItems.reduce((sum, i) => sum + Math.round(salePrice(i.msrp, i.sale_percent ?? 0) * i.quantity * 100), 0);
  const discountCents = appliedDiscount?.discount_amount_cents ?? 0;
  const totalCents = Math.max(0, subtotalCents - discountCents);

  // Suggest the best available code automatically once we know the subtotal,
  // instead of making shoppers hunt for one.
  useEffect(() => {
    if (cartLoading || subtotalCents <= 0 || appliedDiscount) {
      return;
    }
    let cancelled = false;
    fetch(`/api/discount/best?subtotal_cents=${subtotalCents}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.code) {
          setBestOffer(data);
        }
      })
      .catch(() => {
        // No offer to suggest; the manual code field still works.
      });
    return () => {
      cancelled = true;
    };
  }, [cartLoading, subtotalCents, appliedDiscount]);

  const handleApplyDiscount = useCallback(async () => {
    const code = discountInput.trim().toUpperCase();
    if (!code) {
      setDiscountError("Enter a code");
      return;
    }
    setDiscountError(null);
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal_cents: subtotalCents }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.valid && data.discount_amount_cents != null) {
        setAppliedDiscount({ code: data.code ?? code, discount_amount_cents: data.discount_amount_cents });
      } else {
        setAppliedDiscount(null);
        setDiscountError((data as { message?: string }).message ?? "Invalid code");
      }
    } catch {
      setDiscountError("Could not validate code");
      setAppliedDiscount(null);
    }
  }, [discountInput, subtotalCents]);

  const handleCheckout = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = appliedDiscount ? { discount_code: appliedDiscount.code } : {};
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Checkout failed");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Checkout failed");
    } finally {
      setLoading(false);
    }
  }, [router, appliedDiscount]);

  return (
    <StorefrontLayout>
      <h1 className="font-cabinet text-2xl font-bold uppercase tracking-wide text-[#181818]">
        Checkout
      </h1>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        {/* Left: Contact & delivery + Payment */}
        <div className="flex-1 space-y-10">
          <section>
            <h2 className="font-cabinet text-sm font-bold uppercase text-[#181818]">
              Contact & delivery
            </h2>
            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="checkout-email" className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                  Email
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  placeholder="you@example.com"
                  className="mt-2 w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                  aria-label="Email (optional)"
                />
              </div>
              <div>
                <label htmlFor="checkout-name" className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                  Full name
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  placeholder="First and last name"
                  className="mt-2 w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                  aria-label="Full name (optional)"
                />
              </div>
              <div>
                <label htmlFor="checkout-address1" className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                  Address
                </label>
                <input
                  id="checkout-address1"
                  type="text"
                  placeholder="Street address"
                  className="mt-2 w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                  aria-label="Address (optional)"
                />
              </div>
              <input
                type="text"
                placeholder="Apartment, suite, etc. (optional)"
                className="w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                aria-label="Address line 2 (optional)"
              />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="checkout-city" className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                    City
                  </label>
                  <input
                    id="checkout-city"
                    type="text"
                    placeholder="City"
                    className="mt-2 w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                    aria-label="City (optional)"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-state" className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                    State
                  </label>
                  <input
                    id="checkout-state"
                    type="text"
                    placeholder="State"
                    className="mt-2 w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                    aria-label="State (optional)"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-zip" className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                    ZIP
                  </label>
                  <input
                    id="checkout-zip"
                    type="text"
                    placeholder="ZIP"
                    className="mt-2 w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                    aria-label="ZIP (optional)"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="checkout-country" className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                  Country
                </label>
                <input
                  id="checkout-country"
                  type="text"
                  placeholder="United States"
                  className="mt-2 w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                  aria-label="Country (optional)"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-cabinet text-sm font-bold uppercase text-[#181818]">
              Payment
            </h2>
            <p className="mt-1 font-cabinet text-sm text-neutral-500">Secure payment. This form is for display only.</p>
            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="checkout-card-name" className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                  Name on card
                </label>
                <input
                  id="checkout-card-name"
                  type="text"
                  placeholder="Name as it appears on card"
                  className="mt-2 w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                  aria-label="Name on card (optional)"
                />
              </div>
              <div>
                <label htmlFor="checkout-card-number" className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                  Card number
                </label>
                <input
                  id="checkout-card-number"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="mt-2 w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                  aria-label="Card number (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="checkout-expiry" className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                    Expiry
                  </label>
                  <input
                    id="checkout-expiry"
                    type="text"
                    placeholder="MM / YY"
                    className="mt-2 w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                    aria-label="Expiry (optional)"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-cvv" className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                    CVV
                  </label>
                  <input
                    id="checkout-cvv"
                    type="text"
                    placeholder="123"
                    className="mt-2 w-full border-0 border-b border-neutral-300 bg-transparent py-3 font-cabinet text-base text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-0"
                    aria-label="CVV (optional)"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right: In your bag — same card style as cart summary */}
        <div className="w-full shrink-0 lg:w-80">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="font-cabinet text-sm font-bold uppercase text-neutral-600">
              In your bag
            </h2>
            {cartLoading ? (
              <p className="mt-6 font-cabinet text-sm text-neutral-500">Loading…</p>
            ) : (
              <>
                <div className="mt-6 space-y-4 border-b border-neutral-200 pb-4">
                  {cartItems.length === 0 ? (
                    <p className="font-cabinet text-sm text-neutral-500">Your bag is empty.</p>
                  ) : (
                    cartItems.map((item) => {
                      const unitCents = Math.round(salePrice(item.msrp, item.sale_percent ?? 0) * 100);
                      const lineCents = unitCents * item.quantity;
                      return (
                        <div key={`${item.shoe_id}-${item.size}`} className="flex gap-4 border-b border-neutral-200 pb-4 last:border-0 last:pb-0">
                          <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-[#E9E9EB]">
                            <Image
                              src={item.display_image || "/assets/Sport Shoes.png"}
                              alt=""
                              fill
                              className="object-contain"
                              sizes="96px"
                              unoptimized={(item.display_image ?? "").startsWith("/")}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-cabinet font-bold text-[#181818] truncate">
                              {item.shoe_name || "Product"}
                            </p>
                            <p className="mt-0.5 font-cabinet text-sm text-neutral-500">
                              Size {item.size} · Qty {item.quantity}
                            </p>
                            <p className="mt-1 font-cabinet font-bold text-[#181818]">
                              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(lineCents / 100)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="mt-4 space-y-4">
                  <div className="flex justify-between font-cabinet text-sm">
                    <span className="font-bold uppercase text-neutral-600">Subtotal</span>
                    <span className="font-bold text-[#181818]">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(subtotalCents / 100)}
                    </span>
                  </div>
                  <div className="border-t border-neutral-200 pt-4">
                    <label className="block font-cabinet text-sm font-bold uppercase text-neutral-600">
                      Promo code
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        className="flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2.5 font-cabinet text-sm text-[#181818] placeholder:text-neutral-400 focus:border-[#181818] focus:outline-none focus:ring-1 focus:ring-[#181818]"
                        aria-label="Discount code"
                      />
                      <button
                        type="button"
                        onClick={handleApplyDiscount}
                        className="shrink-0 rounded-full border border-neutral-300 bg-white px-4 py-2.5 font-cabinet text-sm font-bold uppercase text-[#181818] hover:bg-neutral-100"
                      >
                        Apply
                      </button>
                    </div>
                    {discountError && <p className="mt-2 font-cabinet text-xs text-red-600">{discountError}</p>}
                    {bestOffer && !appliedDiscount && (
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountInput(bestOffer.code);
                          setAppliedDiscount(bestOffer);
                        }}
                        className="mt-2 block font-cabinet text-xs font-bold text-blue-700 underline"
                      >
                        Apply best available offer ({bestOffer.code}) and save{" "}
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(bestOffer.discount_amount_cents / 100)}
                      </button>
                    )}
                    {appliedDiscount && (
                      <div className="mt-3 flex justify-between font-cabinet text-sm text-green-700">
                        <span className="font-bold">Discount ({appliedDiscount.code})</span>
                        <span className="font-bold">
                          -{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(appliedDiscount.discount_amount_cents / 100)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 pt-4 font-cabinet">
                    <span className="text-lg font-bold text-[#181818]">Total</span>
                    <span className="text-lg font-bold text-[#181818]">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(totalCents / 100)}
                    </span>
                  </div>
                </div>
                {error && <p className="mt-4 font-cabinet text-sm text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loading || cartLoading || cartItems.length === 0}
                  className="mt-6 w-full rounded-full bg-neutral-900 py-3 font-cabinet text-base font-bold uppercase text-white hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Processing…" : "Place order"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
