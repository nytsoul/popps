import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CartItem, Product, User } from "../types";
import { authService, cartService, wishlistService } from "../services";
import { compareService } from "../services/catalog";
import type { Locale } from "../lib/i18n";
import { makeT } from "../lib/i18n";
import { PRODUCTS } from "../data/products";

export interface Toast {
  id: number;
  message: string;
  kind: "success" | "error" | "info";
}

interface StoreValue {
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (product: Product, quantity?: number, color?: string, openDrawer?: boolean) => boolean;
  quickView: Product | null;
  setQuickView: (p: Product | null) => void;
  updateQuantity: (productId: string, color: string, quantity: number) => void;
  removeFromCart: (productId: string, color: string) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  wishlist: string[];
  toggleWishlist: (product: Product) => void;
  isWishlisted: (id: string) => boolean;
  user: User | null;
  setUser: (u: User | null) => void;
  signOut: () => void;
  compareIds: string[];
  toggleCompare: (product: Product) => void;
  clearCompare: () => void;
  isCompared: (id: string) => boolean;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (k: Parameters<ReturnType<typeof makeT>>[0]) => string;
  toasts: Toast[];
  toast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => cartService.load());
  const [wishlist, setWishlist] = useState<string[]>(() => wishlistService.load());
  const [user, setUser] = useState<User | null>(() => authService.current());
  const [cartOpen, setCartOpen] = useState(false);
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>(() => compareService.get());
  const [locale, setLocaleState] = useState<Locale>(() => {
    try { return (localStorage.getItem("shopscale.locale") as Locale) === "ta" ? "ta" : "en"; } catch { return "en"; }
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => cartService.save(cart), [cart]);
  useEffect(() => wishlistService.save(wishlist), [wishlist]);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, message, kind }]);
    window.setTimeout(() => dismissToast(id), 3800);
  }, [dismissToast]);

  const addToCart = useCallback(
    (product: Product, quantity = 1, color?: string, openDrawer = true) => {
      if (product.stock <= 0) {
        toast(`${product.name} is currently out of stock.`, "error");
        return false;
      }
      const chosen = color ?? product.colors[0];
      let ok = true;
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id && i.color === chosen);
        const currentQty = existing?.quantity ?? 0;
        if (currentQty + quantity > product.stock) {
          ok = false;
          return prev;
        }
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id && i.color === chosen ? { ...i, quantity: i.quantity + quantity } : i
          );
        }
        return [...prev, { productId: product.id, color: chosen, quantity }];
      });
      if (!ok) {
        toast(`Only ${product.stock} available for ${product.name}.`, "error");
        return false;
      }
      toast(`${product.name} added to your bag.`);
      if (openDrawer) setCartOpen(true);
      return true;
    },
    [toast]
  );

  const updateQuantity = useCallback((productId: string, color: string, quantity: number) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    const max = product?.stock ?? 99;
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId && i.color === color
            ? { ...i, quantity: Math.max(0, Math.min(quantity, max)) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: string, color: string) => {
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.color === color)));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback(
    (product: Product) => {
      setWishlist((prev) => {
        const has = prev.includes(product.id);
        toast(has ? `${product.name} removed from wishlist.` : `${product.name} saved to wishlist.`, has ? "info" : "success");
        return has ? prev.filter((id) => id !== product.id) : [...prev, product.id];
      });
    },
    [toast]
  );

  const toggleCompare = useCallback(
    (product: Product) => {
      const { ids, added, full } = compareService.toggle(product.id);
      setCompareIds(ids);
      if (full) toast(`Compare tray is full (3 max). Remove one to add ${product.name}.`, "error");
      else toast(added ? `${product.name} added to compare.` : `${product.name} removed from compare.`, added ? "success" : "info");
    },
    [toast]
  );

  const clearCompare = useCallback(() => {
    compareService.clear();
    setCompareIds([]);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem("shopscale.locale", l); } catch { /* ignore */ }
  }, []);

  const t = useMemo(() => makeT(locale), [locale]);

  const signOut = useCallback(() => {
    authService.signOut();
    setUser(null);
    toast("Signed out. See you soon.", "info");
  }, [toast]);

  const { cartCount, cartSubtotal } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    for (const item of cart) {
      const p = PRODUCTS.find((x) => x.id === item.productId);
      if (!p) continue;
      count += item.quantity;
      subtotal += p.price * item.quantity;
    }
    return { cartCount: count, cartSubtotal: subtotal };
  }, [cart]);

  const value: StoreValue = {
    cart, cartCount, cartSubtotal, addToCart, quickView, setQuickView, updateQuantity, removeFromCart, clearCart,
    cartOpen, setCartOpen,
    wishlist, toggleWishlist, isWishlisted: (id) => wishlist.includes(id),
    user, setUser, signOut,
    compareIds, toggleCompare, clearCompare, isCompared: (id) => compareIds.includes(id),
    locale, setLocale, t,
    toasts, toast, dismissToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);