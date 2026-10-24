import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import type { Product } from "../../types";
import ProductCard from "./ProductCard";
import { ProductCardSkeleton, Reveal } from "../ui";

export function ProductGrid({ products, loading, cols = 4 }: { products: Product[]; loading?: boolean; cols?: 3 | 4 }) {
  if (loading) {
    return (
      <div className={`grid grid-cols-2 gap-4 md:gap-6 ${cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {Array.from({ length: cols * 2 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 ${cols === 4 ? "lg:grid-cols-4" : "md:grid-cols-3"}`}>
      {products.map((p, i) => (
        <Reveal key={p.id} delay={Math.min(i % 4, 3) * 0.06}>
          <ProductCard product={p} />
        </Reveal>
      ))}
    </div>
  );
}

export function ProductCarousel({ products, loading }: { products: Product[]; loading?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 640), behavior: "smooth" });
  };
  if (loading) return <ProductGrid products={[]} loading />;
  return (
    <div className="relative">
      <div
        ref={ref}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-6 md:px-0"
        role="region"
        aria-label="Product carousel — scroll horizontally"
        tabIndex={0}
      >
        {products.map((p) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[38%] md:w-[30%] lg:w-[23.5%]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      <button
        onClick={() => scroll(-1)}
        aria-label="Scroll products left"
        className="absolute -left-4 top-[32%] hidden h-10 w-10 items-center justify-center rounded-full border border-sand bg-white text-espresso shadow-card transition-all hover:bg-espresso hover:text-cream lg:flex"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        onClick={() => scroll(1)}
        aria-label="Scroll products right"
        className="absolute -right-4 top-[32%] hidden h-10 w-10 items-center justify-center rounded-full border border-sand bg-white text-espresso shadow-card transition-all hover:bg-espresso hover:text-cream lg:flex"
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}

export function CategoryCard({ name, image, blurb, index }: { name: string; image: string; blurb: string; index: number }) {
  return (
    <Reveal delay={index * 0.05}>
      <Link
        to={`/shop?category=${encodeURIComponent(name)}`}
        className="group relative block overflow-hidden rounded-card"
      >
        <div className="aspect-[4/5] w-full overflow-hidden bg-sand">
          <img
            src={image}
            alt={`Shop ${name} — ${blurb}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-darkroast/75 via-darkroast/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-xl text-ivory">{name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-champagne">
            {blurb}
            <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
          </p>
        </div>
      </Link>
    </Reveal>
  );
}