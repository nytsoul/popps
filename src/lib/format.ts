export const inr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const discountPct = (price: number, original?: number) =>
  original && original > price ? Math.round(((original - price) / original) * 100) : 0;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

export const isValidPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ""));

export const isValidPincode = (pin: string) => /^\d{6}$/.test(pin.trim());

/** Pexels image helper — consistent crops without huge assets. */
export const px = (id: number, w = 700, h = 933, ext: "jpeg" | "png" = "jpeg") =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.${ext}?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;