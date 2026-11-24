"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { beginProductCheckout } from "@/app/checkout/actions";

export type CartItem = { id: string; title: string; itemType: "class" | "camp" | "product" | "membership"; priceCents: number; quantity: number };
type CartContextValue = { items: CartItem[]; addItem: (item: Omit<CartItem, "quantity">) => void; removeItem: (id: string) => void; count: number; total: number };
const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "allens-lane-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const rawCart = useSyncExternalStore(
    (notify) => { window.addEventListener("storage", notify); window.addEventListener("allens-lane-cart-change", notify); return () => { window.removeEventListener("storage", notify); window.removeEventListener("allens-lane-cart-change", notify); }; },
    () => window.localStorage.getItem(storageKey) ?? "[]",
    () => "[]",
  );
  const items = useMemo<CartItem[]>(() => { try { return JSON.parse(rawCart); } catch { return []; } }, [rawCart]);
  const writeItems = (next: CartItem[]) => { window.localStorage.setItem(storageKey, JSON.stringify(next)); window.dispatchEvent(new Event("allens-lane-cart-change")); };
  const value = useMemo<CartContextValue>(() => ({
    items,
    addItem: (item) => {
      const existing = items.find((entry) => entry.id === item.id);
      if (!existing) writeItems([...items, { ...item, quantity: 1 }]);
      else if (item.itemType === "product") writeItems(items.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry));
    },
    removeItem: (id) => writeItems(items.filter((item) => item.id !== id)),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("CartProvider is missing");
  return cart;
}

export function CartLink() {
  const { count } = useCart();
  return <Link className="cart-link" href="/cart">Cart{count ? ` (${count})` : ""}</Link>;
}

export function CartAddButton({ item, label = "Add to cart", unavailableLabel = "Coming soon" }: { item: Omit<CartItem, "quantity"> | null; label?: string; unavailableLabel?: string }) {
  const { addItem } = useCart();
  if (!item) return <button className="button button-primary" disabled>{unavailableLabel}</button>;
  return <button className="button button-primary" onClick={() => addItem(item)}>{label}</button>;
}

export function CartContents({ signedIn }: { signedIn?: boolean }) {
  const { items, removeItem, total } = useCart();
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const productItems = items.filter((item) => item.itemType === "product");
  const experienceItems = items.filter((item) => item.itemType !== "product");
  if (!items.length) return <section className="cart-empty"><h1>Your cart is ready when you are.</h1><p>Browse classes, camp, and the shop—nothing requires an account until checkout.</p><Link className="button button-primary" href="/classes">Browse experiences</Link></section>;
  return <section className="cart-panel"><div className="cart-items">{items.map((item) => <article key={item.id}><div><p className="eyebrow">{item.itemType}</p><h2>{item.title}</h2><p>{item.quantity} × {money.format(item.priceCents / 100)}</p></div><button onClick={() => removeItem(item.id)}>Remove</button></article>)}</div><aside><p className="eyebrow">Order summary</p><strong>{money.format(total / 100)}</strong>{experienceItems.length ? <p>Classes and camp need participant details before payment. Complete those from their details page or your account.</p> : null}<p>{signedIn ? "Your shop purchase will be completed through Stripe’s secure checkout." : "Sign in only when you’re ready to complete checkout."}</p>{signedIn && productItems.length ? <form action={beginProductCheckout}><input name="cart" type="hidden" value={JSON.stringify(productItems)} /><button className="button button-primary">Pay securely</button></form> : signedIn ? <Link className="button button-primary" href="/classes">Choose an experience</Link> : <Link className="button button-primary" href="/checkout">Checkout</Link>}</aside></section>;
}
