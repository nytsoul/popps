import { BadgeCheck, Eye, Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../../hooks/useStore";
import { discountPct } from "../../lib/format";
import type { Product } from "../../types";
import { cn } from "../../utils/cn";
import { PriceDisplay, ProductBadge } from "../ui";

export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addToCart, toggleWishlist, isWishlisted, setQuickView } = useStore();
  const wished = isWishlisted(product.id);
  const out = product.stock <= 0;
  const pct = discountPct(product.price, product.originalPrice);
  const origin = product.country === "India" ? product.state : `${product.state === product.country ? "" : `${product.state}, `}${product.country}`;
  const technique = product.techniques.find((t) => t !== "Handloom") ?? product.loom;

  return (
    <article className="group relative">
      <div className="relative overflow-hidden rounded-card bg-sand/60">
        <Link to={`/product/${product.slug}`} className="block" aria-label={`${product.name} — view details`}>
          <div className="aspect-[3/4] w-full overflow-hidden">
            <img
              src={product.images[0]}
              alt={`${product.name}, ${product.variety} from ${origin} (representative styling image)`}
              loading={priority ? "eager" : "lazy"}
              className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
            />
          </div>
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.badge && <ProductBadge badge={product.badge} />}
          {pct > 0 && product.badge !== "Sale" && <span className="bg-terracotta px-2 py-1 text-[10px] font-semibold text-ivory">−{pct}%</span>}
          {product.kind !== "Saree" && <span className="bg-olivesage px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ivory">{product.kind}</span>}
          {out && <span className="bg-darkroast/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-cream">Out of stock</span>}
        </div>

        <button
          onClick={() => toggleWishlist(product)}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={wished}
          className={cn("absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-card transition-all hover:scale-110", wished ? "text-terracotta" : "text-warmgray hover:text-terracotta")}
        >
          <Heart className={cn("h-4 w-4", wished && "fill-terracotta")} aria-hidden />
        </button>
        <button
          onClick={() => setQuickView(product)}
          aria-label={`Quick view ${product.name}`}
          className="absolute right-3 top-14 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-warmgray shadow-card transition-all hover:scale-110 hover:text-espresso md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <Eye className="h-4 w-4" aria-hidden />
        </button>

        <div className="absolute inset-x-3 bottom-3 hidden translate-y-2 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 md:flex">
          <button
            onClick={() => addToCart(product)}
            disabled={out}
            className="flex flex-1 items-center justify-center gap-1.5 bg-espresso/95 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream hover:bg-mocha disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden /> {out ? "Sold out" : "Add to bag"}
          </button>
          <Link to={`/product/${product.slug}`} className="flex items-center justify-center bg-ivory/95 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-espresso hover:bg-white">
            Details
          </Link>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="flex items-center gap-1 text-[10.5px] uppercase tracking-[0.14em] text-mutedbrown">
          <span className="truncate">{product.variety} · {origin}</span>
          {product.originVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-olivesage" aria-label="Origin verified" />}
        </p>
        <Link to={`/product/${product.slug}`} className="block">
          <h3 className="font-display text-[15.5px] leading-snug text-darkroast transition-colors group-hover:text-espresso">{product.name}</h3>
        </Link>
        <p className="truncate text-xs text-warmgray">{product.fabricDetail} · {technique}</p>
        <PriceDisplay price={product.price} originalPrice={product.originalPrice} />
        {!out && product.stock <= 3 && <p className="text-[11px] font-medium text-terracotta">Only {product.stock} left</p>}
        <div className="flex gap-3 pt-0.5 md:hidden">
          {!out && (
            <button onClick={() => addToCart(product)} className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-espresso">
              <ShoppingBag className="h-3 w-3" aria-hidden /> Add
            </button>
          )}
          <button onClick={() => setQuickView(product)} className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-mocha">
            <Eye className="h-3 w-3" aria-hidden /> Quick view
          </button>
        </div>
      </div>
    </article>
  );
}