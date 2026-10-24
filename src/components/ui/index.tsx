import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Hourglass, PackageOpen, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { discountPct, inr } from "../../lib/format";
import type { Badge } from "../../types";
import { cn } from "../../utils/cn";

export function PriceDisplay({ price, originalPrice, size = "sm" }: { price: number; originalPrice?: number; size?: "sm" | "lg" }) {
  const pct = discountPct(price, originalPrice);
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", size === "lg" ? "text-2xl" : "text-sm")}>
      <span className={cn("font-semibold text-darkroast", size === "lg" && "font-display")}>{inr(price)}</span>
      {pct > 0 && (
        <>
          <span className={cn("text-mutedbrown line-through", size === "lg" ? "text-base" : "text-xs")}>{inr(originalPrice!)}</span>
          <span className={cn("font-medium text-terracotta", size === "lg" ? "text-sm" : "text-xs")}>{pct}% off</span>
        </>
      )}
    </p>
  );
}

const badgeStyles: Record<Badge, string> = {
  Bestseller: "bg-espresso text-cream",
  "New Arrival": "bg-olivesage text-ivory",
  "Limited Edition": "bg-darkroast text-gold",
  Sale: "bg-terracotta text-ivory",
};

export function ProductBadge({ badge }: { badge: Badge }) {
  return (
    <span className={cn("px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]", badgeStyles[badge])}>
      {badge}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, align = "center", action }: {
  eyebrow?: string; title: string; subtitle?: string; align?: "center" | "left"; action?: ReactNode;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-3 md:mb-10", align === "center" ? "items-center text-center" : "items-start", action && "md:flex-row md:items-end md:justify-between")}>
      <div className={cn(align === "center" && "flex flex-col items-center")}>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="font-display text-3xl leading-tight text-darkroast md:text-4xl">{title}</h2>
        {subtitle && <p className="mt-3 max-w-xl text-sm leading-relaxed text-warmgray">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function EmptyState({ title, text, actionLabel, actionTo, onAction, icon }: {
  title: string; text: string; actionLabel?: string; actionTo?: string; onAction?: () => void; icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-sand bg-ivory px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-champagne/50 text-mocha">
        {icon ?? <PackageOpen className="h-6 w-6" aria-hidden />}
      </span>
      <h3 className="font-display text-2xl text-darkroast">{title}</h3>
      <p className="max-w-sm text-sm text-warmgray">{text}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="mt-2 bg-espresso px-6 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-cream transition-colors hover:bg-mocha">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button onClick={onAction} className="mt-2 inline-flex items-center gap-2 bg-espresso px-6 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-cream transition-colors hover:bg-mocha">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-card border border-error/30 bg-ivory px-6 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-error" aria-hidden />
      <p className="max-w-md text-sm text-warmgray">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-2 border border-espresso px-5 py-2 text-xs font-medium uppercase tracking-[0.16em] text-espresso transition-colors hover:bg-espresso hover:text-cream">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Try again
        </button>
      )}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      <div className="skeleton aspect-[3/4] w-full rounded-card" />
      <div className="skeleton h-3 w-1/3 rounded" />
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton h-4 w-1/2 rounded" />
    </div>
  );
}

export function SkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-mutedbrown">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
          {it.to ? <Link to={it.to} className="hover:text-espresso">{it.label}</Link> : <span className="text-darkroast" aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

/** Friendly HTTP 429 handling with a live retry countdown. No automatic retries. */
export function RateLimitNotice({ retryAfter = 10, onRetry, compact }: { retryAfter?: number; onRetry?: () => void; compact?: boolean }) {
  const [left, setLeft] = useState(retryAfter);
  useEffect(() => {
    setLeft(retryAfter);
    const t = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => window.clearInterval(t);
  }, [retryAfter]);
  return (
    <div role="alert" className={`flex flex-col items-center gap-3 border border-warning/50 bg-warning/10 text-center ${compact ? "p-4" : "px-6 py-12"}`}>
      <Hourglass className="h-7 w-7 text-warning" aria-hidden />
      <p className="font-display text-xl text-darkroast">Taking a short breath</p>
      <p className="max-w-md text-sm text-warmgray">
        You've made a lot of requests in a short time, so our rate limiter (HTTP 429) has paused them briefly to keep ShopScale fast for everyone.
        {left > 0 ? ` You can try again in ${left}s.` : " You can try again now."}
      </p>
      {onRetry && (
        <button onClick={onRetry} disabled={left > 0} className="inline-flex items-center gap-2 bg-espresso px-5 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-cream disabled:opacity-50">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {left > 0 ? `Retry in ${left}s` : "Retry now"}
        </button>
      )}
    </div>
  );
}
