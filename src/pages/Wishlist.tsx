import { Heart } from "lucide-react";
import ProductCard from "../components/products/ProductCard";
import { EmptyState, Reveal } from "../components/ui";
import { productById, useStore } from "../hooks/useStore";

export default function Wishlist() {
  const { wishlist } = useStore();
  const products = wishlist.map(productById).filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6 lg:py-14">
      <p className="eyebrow">Saved for Later</p>
      <h1 className="mt-2 font-display text-4xl text-darkroast">Your Wishlist</h1>
      <p className="mt-2 text-sm text-warmgray">{products.length} piece{products.length === 1 ? "" : "s"} you're dreaming of. Use the heart to remove, or quick-add straight to your bag.</p>

      {products.length === 0 ? (
        <div className="mt-10 max-w-xl">
          <EmptyState
            icon={<Heart className="h-6 w-6" aria-hidden />}
            title="Nothing saved yet"
            text="Tap the heart on any piece you love and it will wait for you here."
            actionLabel="Discover the Collection"
            actionTo="/shop"
          />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
          {products.map((p, i) => p && (
            <Reveal key={p.id} delay={i * 0.04}><ProductCard product={p} /></Reveal>
          ))}
        </div>
      )}
    </div>
  );
}