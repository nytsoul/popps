import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { productById, useStore } from "../../hooks/useStore";
import { inr } from "../../lib/format";

export function CartLineItems({ compact = false }: { compact?: boolean }) {
  const { cart, updateQuantity, removeFromCart } = useStore();
  return (
    <ul className="divide-y divide-sand">
      {cart.map((item) => {
        const p = productById(item.productId);
        if (!p) return null;
        return (
          <li key={`${item.productId}-${item.color}`} className="flex gap-4 py-4">
            <Link to={`/product/${p.slug}`} className="shrink-0">
              <img src={p.images[0]} alt={p.name} className={`rounded-sm object-cover ${compact ? "h-24 w-[4.5rem]" : "h-32 w-24"}`} loading="lazy" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/product/${p.slug}`} className="block truncate font-display text-sm text-darkroast hover:text-espresso">{p.name}</Link>
                  <p className="mt-0.5 text-xs text-mutedbrown">{item.color} · {p.category}</p>
                </div>
                <button
                  onClick={() => removeFromCart(item.productId, item.color)}
                  aria-label={`Remove ${p.name} from bag`}
                  className="p-1 text-mutedbrown transition-colors hover:text-error"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex items-center border border-sand" role="group" aria-label={`Quantity for ${p.name}`}>
                  <button
                    onClick={() => updateQuantity(item.productId, item.color, item.quantity - 1)}
                    aria-label="Decrease quantity"
                    className="flex h-8 w-8 items-center justify-center text-warmgray hover:bg-cream"
                  ><Minus className="h-3 w-3" aria-hidden /></button>
                  <span className="w-8 text-center text-sm" aria-live="polite">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.color, item.quantity + 1)}
                    disabled={item.quantity >= p.stock}
                    aria-label="Increase quantity"
                    className="flex h-8 w-8 items-center justify-center text-warmgray hover:bg-cream disabled:opacity-40"
                  ><Plus className="h-3 w-3" aria-hidden /></button>
                </div>
                <p className="text-sm font-semibold text-darkroast">{inr(p.price * item.quantity)}</p>
              </div>
              {item.quantity >= p.stock && <p className="mt-1 text-[11px] text-terracotta">Maximum available quantity reached</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function CartDrawer() {
  const { cartOpen, setCartOpen, cart, cartSubtotal, cartCount } = useStore();

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCartOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [cartOpen, setCartOpen]);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-darkroast/50" onClick={() => setCartOpen(false)} aria-hidden />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-ivory"
            role="dialog" aria-label="Shopping bag"
          >
            <div className="flex items-center justify-between border-b border-sand px-5 py-4">
              <h2 className="font-display text-xl text-darkroast">Your Bag {cartCount > 0 && <span className="text-sm text-mutedbrown">({cartCount})</span>}</h2>
              <button onClick={() => setCartOpen(false)} aria-label="Close bag" className="p-1 text-warmgray hover:text-darkroast"><X className="h-5 w-5" aria-hidden /></button>
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-champagne/50 text-mocha"><ShoppingBag className="h-7 w-7" aria-hidden /></span>
                <p className="font-display text-2xl text-darkroast">Your bag is empty</p>
                <p className="text-sm text-warmgray">Beautiful things await — begin with our bestsellers.</p>
                <Link to="/shop" onClick={() => setCartOpen(false)} className="mt-2 bg-espresso px-7 py-3 text-xs font-medium uppercase tracking-[0.18em] text-cream hover:bg-mocha">
                  Continue Shopping
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5">
                  <CartLineItems compact />
                </div>
                <div className="border-t border-sand bg-cream/60 px-5 py-4">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-warmgray">Subtotal</span>
                    <span className="font-semibold text-darkroast">{inr(cartSubtotal)}</span>
                  </div>
                  <p className="mb-4 text-[11px] text-mutedbrown">Shipping and any discounts are calculated at checkout.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/cart" onClick={() => setCartOpen(false)} className="border border-espresso py-3 text-center text-xs font-medium uppercase tracking-[0.16em] text-espresso transition-colors hover:bg-espresso hover:text-cream">
                      View Bag
                    </Link>
                    <Link to="/checkout" onClick={() => setCartOpen(false)} className="inline-flex items-center justify-center gap-2 bg-espresso py-3 text-xs font-medium uppercase tracking-[0.16em] text-cream transition-colors hover:bg-mocha">
                      Checkout <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}