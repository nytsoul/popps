import { ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { CartLineItems } from "../components/cart/CartDrawer";
import { EmptyState } from "../components/ui";
import { useStore } from "../hooks/useStore";
import { inr } from "../lib/format";

export default function CartPage() {
  const { cart, cartSubtotal, cartCount } = useStore();
  const shipping = cartSubtotal === 0 || cartSubtotal >= 2999 ? 0 : 99;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6 lg:py-14">
      <h1 className="font-display text-4xl text-darkroast">Your Bag</h1>
      <p className="mt-2 text-sm text-warmgray">{cartCount} item{cartCount === 1 ? "" : "s"} — reserved with care.</p>

      {cart.length === 0 ? (
        <div className="mt-10 max-w-xl">
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" aria-hidden />}
            title="Your bag is empty"
            text="Explore the collection and add something beautiful — your saved wishlist is a lovely place to start."
            actionLabel="Continue Shopping"
            actionTo="/shop"
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="border-t border-sand"><CartLineItems /></div>
          <aside className="h-fit border border-sand bg-ivory p-6 lg:sticky lg:top-40">
            <h2 className="font-display text-xl text-darkroast">Order Summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-warmgray">Subtotal</dt><dd className="font-medium">{inr(cartSubtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-warmgray">Shipping</dt><dd className={shipping === 0 ? "font-medium text-olivesage" : "font-medium"}>{shipping === 0 ? "Free" : inr(shipping)}</dd></div>
              {shipping > 0 && <p className="text-[11px] text-mutedbrown">Add {inr(2999 - cartSubtotal)} more for complimentary shipping.</p>}
              <div className="flex justify-between border-t border-sand pt-3 text-base"><dt className="font-medium text-darkroast">Total</dt><dd className="font-semibold text-darkroast">{inr(cartSubtotal + shipping)}</dd></div>
            </dl>
            <Link to="/checkout" className="mt-6 flex items-center justify-center gap-2 bg-espresso py-4 text-xs font-semibold uppercase tracking-[0.18em] text-cream transition-colors hover:bg-mocha">
              Proceed to Checkout <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link to="/shop" className="mt-3 block text-center text-xs text-mocha underline underline-offset-4">Continue shopping</Link>
          </aside>
        </div>
      )}
    </div>
  );
}