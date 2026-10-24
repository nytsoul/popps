import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Heart, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../hooks/useStore";
import { occasionLabel } from "../../data/catalogue";
import { cn } from "../../utils/cn";
import { PriceDisplay, ProductBadge } from "../ui";

export default function QuickView() {
  const { quickView: p, setQuickView, addToCart, toggleWishlist, isWishlisted } = useStore();
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState("");

  useEffect(() => {
    if (!p) return;
    setImg(0); setQty(1); setColor(p.colors[0]);
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setQuickView(null);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [p, setQuickView]);

  return (
    <AnimatePresence>
      {p && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-darkroast/55 p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQuickView(null)}>
          <motion.div
            role="dialog" aria-modal="true" aria-label={`Quick view: ${p.name}`}
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative grid max-h-[92vh] w-full max-w-4xl overflow-y-auto bg-ivory sm:grid-cols-2"
          >
            <button onClick={() => setQuickView(null)} aria-label="Close quick view" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-darkroast shadow-card">
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div className="bg-sand/50">
              <div className="relative">
                <img src={p.images[img]} alt={`${p.name} — ${p.imageCaptions[img] ?? `image ${img + 1}`} (representative)`} className="aspect-[4/5] w-full object-cover" />
                <span className="absolute bottom-3 left-3 bg-darkroast/80 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-cream">{p.imageCaptions[img] ?? `View ${img + 1}`}</span>
              </div>
              <div className="flex gap-2 p-3">
                {p.images.map((src, i) => (
                  <button key={i} onClick={() => setImg(i)} aria-label={p.imageCaptions[i] ?? `Image ${i + 1}`} className={cn("overflow-hidden border-2", img === i ? "border-espresso" : "border-transparent")}>
                    <img src={src} alt="" className="h-16 w-12 object-cover" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col p-6 sm:p-8">
              {p.badge && <div className="mb-2"><ProductBadge badge={p.badge} /></div>}
              <p className="eyebrow">{p.variety} · {p.state}{p.country !== "India" && p.state !== p.country ? `, ${p.country}` : ""}</p>
              <h2 className="mt-2 font-display text-2xl text-darkroast">{p.name}</h2>
              <div className="mt-3"><PriceDisplay price={p.price} originalPrice={p.originalPrice} size="lg" /></div>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {[["Fabric", p.fabricDetail], ["Composition", p.composition], ["Loom", p.loom], ["Technique", p.techniques.join(", ")], ["Weight", p.weight], ["Occasion", p.occasion.slice(0, 2).map(occasionLabel).join(", ")]].map(([k, v]) => (
                  <div key={k}><dt className="text-mutedbrown">{k}</dt><dd className="text-darkroast">{v}</dd></div>
                ))}
              </dl>
              {p.colors.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.colors.map((c) => (
                    <button key={c} onClick={() => setColor(c)} aria-pressed={color === c} className={cn("border px-3 py-1.5 text-xs", color === c ? "border-espresso bg-espresso text-cream" : "border-sand")}>{c}</button>
                  ))}
                </div>
              )}
              <p className={cn("mt-4 text-xs font-medium", p.stock <= 0 ? "text-error" : p.stock <= 3 ? "text-terracotta" : "text-olivesage")}>
                {p.stock <= 0 ? "Out of stock" : p.stock <= 3 ? `Low stock — ${p.stock} left` : "In stock"}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center border border-sand bg-white" role="group" aria-label="Quantity">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="flex h-10 w-10 items-center justify-center"><Minus className="h-3.5 w-3.5" aria-hidden /></button>
                  <span className="w-8 text-center text-sm">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(Math.max(1, p.stock), q + 1))} disabled={qty >= p.stock} aria-label="Increase quantity" className="flex h-10 w-10 items-center justify-center disabled:opacity-40"><Plus className="h-3.5 w-3.5" aria-hidden /></button>
                </div>
                <button
                  onClick={() => { if (addToCart(p, qty, color)) setQuickView(null); }}
                  disabled={p.stock <= 0}
                  className="flex flex-1 items-center justify-center gap-2 bg-espresso py-3 text-xs font-semibold uppercase tracking-[0.16em] text-cream hover:bg-mocha disabled:opacity-50"
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden /> Add to bag
                </button>
                <button onClick={() => toggleWishlist(p)} aria-pressed={isWishlisted(p.id)} aria-label="Toggle wishlist" className="flex h-11 w-11 items-center justify-center border border-sand bg-white">
                  <Heart className={cn("h-4 w-4", isWishlisted(p.id) ? "fill-terracotta text-terracotta" : "text-warmgray")} aria-hidden />
                </button>
              </div>
              <Link to={`/product/${p.slug}`} onClick={() => setQuickView(null)} className="mt-auto inline-flex items-center gap-1.5 pt-6 text-xs font-semibold uppercase tracking-[0.16em] text-espresso hover:text-terracotta">
                View full details <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}