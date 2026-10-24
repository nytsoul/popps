import { AlertTriangle, ArrowRight, FlaskConical, Loader2, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "../components/ui";
import { productById, useStore } from "../hooks/useStore";
import { inr, isValidEmail, isValidPhone, isValidPincode } from "../lib/format";
import { orderService } from "../services";
import { GIFT_WRAP_PRICE, giftTotal } from "../services/catalog";
import { ApiError } from "../services/api";
import { cn } from "../utils/cn";

interface Fields {
  email: string; fullName: string; phone: string; line1: string; line2: string;
  city: string; state: string; pincode: string;
}

function Field({ k, label, placeholder, type = "text", half, value, error, onChange }: {
  k: keyof Fields; label: string; placeholder: string; type?: string; half?: boolean;
  value: string; error?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={half ? "" : "sm:col-span-2"}>
      <label htmlFor={`f-${k}`} className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">{label}</label>
      <input
        id={`f-${k}`} type={type} value={value} onChange={onChange} placeholder={placeholder}
        aria-invalid={!!error} aria-describedby={error ? `e-${k}` : undefined}
        className={cn("w-full border bg-ivory px-3.5 py-3 text-sm text-darkroast placeholder:text-mutedbrown focus:outline-none", error ? "border-error" : "border-sand focus:border-mocha")}
      />
      {error && <p id={`e-${k}`} className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

function fieldProps(k: keyof Fields, fields: Fields, errors: Partial<Record<keyof Fields, string>>, set: (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => void) {
  return { k, value: fields[k], error: errors[k], onChange: set(k) };
}

const SAVED_ADDRESSES: (Fields & { label: string })[] = [
  { label: "Home (demo)", email: "", fullName: "Asha Iyer", phone: "9876543210", line1: "14 Lakeview Road, Indiranagar", line2: "Near 100 Ft Road", city: "Bengaluru", state: "Karnataka", pincode: "560038" },
  { label: "Parents (demo)", email: "", fullName: "Lakshmi Iyer", phone: "9845012345", line1: "22 Temple Street, Mylapore", line2: "", city: "Chennai", state: "Tamil Nadu", pincode: "600004" },
];

const initial: Fields = { email: "", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

export default function Checkout() {
  const { cart, cartSubtotal, clearCart, user, toast } = useStore();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Fields>({ ...initial, email: user?.email ?? "", fullName: user?.name ?? "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [idemKey] = useState(() => `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [addrChoice, setAddrChoice] = useState<number | "new">("new");
  const chooseAddress = (i: number | "new") => {
    setAddrChoice(i);
    if (i === "new") return;
    const { label: _l, email: _e, ...a } = SAVED_ADDRESSES[i];
    void _l; void _e;
    setFields((f) => ({ ...f, ...a }));
    setErrors({});
  };

  const shipping = cartSubtotal >= 2999 ? 0 : 99;
  const discount = promoApplied ? Math.round(cartSubtotal * 0.05) : 0;
  const giftFee = giftTotal(giftWrap);
  const total = cartSubtotal + shipping - discount + giftFee;

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const validate = (): boolean => {
    const er: Partial<Record<keyof Fields, string>> = {};
    if (!isValidEmail(fields.email)) er.email = "Enter a valid email address.";
    if (fields.fullName.trim().length < 2) er.fullName = "Enter the recipient's full name.";
    if (!isValidPhone(fields.phone)) er.phone = "Enter a valid 10-digit Indian mobile number.";
    if (fields.line1.trim().length < 5) er.line1 = "Enter a complete street address.";
    if (!fields.city.trim()) er.city = "City is required.";
    if (!fields.state.trim()) er.state = "State is required.";
    if (!isValidPincode(fields.pincode)) er.pincode = "Enter a valid 6-digit PIN code.";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === "WELCOME5") {
      setPromoApplied(true);
      toast("WELCOME5 applied — 5% off your first order.");
    } else {
      toast("That code isn't recognised. Try WELCOME5.", "error");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) {
      toast("Please review the highlighted fields.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const order = await orderService.place({
        items: cart.map((i) => {
          const p = productById(i.productId)!;
          return { productId: i.productId, name: p.name, color: i.color, quantity: i.quantity, price: p.price, image: p.images[0] };
        }),
        subtotal: cartSubtotal, shipping, discount, total,
        email: fields.email,
        gift: giftWrap ? { wrap: true, message: giftMessage.trim() || undefined } : { wrap: false },
        address: {
          fullName: fields.fullName, line1: fields.line1, line2: fields.line2 || undefined,
          city: fields.city, state: fields.state, pincode: fields.pincode, phone: fields.phone,
        },
      }, idemKey);
      clearCart();
      navigate(`/order-confirmation/${order.reference}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "We couldn't place the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0 && !submitting) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState title="Nothing to check out" text="Your bag is empty — add a few pieces before heading to checkout." actionLabel="Browse the Collection" actionTo="/shop" />
      </div>
    );
  }

  const fp = (k: keyof Fields) => fieldProps(k, fields, errors, set);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6 lg:py-14">
      <h1 className="font-display text-4xl text-darkroast">Checkout</h1>

      <div className="mt-4 flex items-start gap-3 border border-warning/50 bg-warning/10 p-4 text-xs leading-relaxed text-warmgray">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <p><strong className="text-darkroast">Demo checkout.</strong> This prototype uses a mock order adapter — no real payment is processed, no card details are collected, and orders are stored locally in your browser.</p>
      </div>

      <form onSubmit={submit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 font-display text-2xl text-darkroast">1 · Contact</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field {...fp("email")} label="Email address" placeholder="you@example.com" type="email" />
            </div>
          </section>
          <section>
            <h2 className="mb-4 font-display text-2xl text-darkroast">2 · Shipping Address</h2>
            {user && (
              <fieldset className="mb-5 grid gap-3 sm:grid-cols-3">
                <legend className="sr-only">Choose a saved address</legend>
                {SAVED_ADDRESSES.map((a, i) => (
                  <label key={a.label} className={cn("cursor-pointer border p-3 text-xs", addrChoice === i ? "border-espresso bg-cream" : "border-sand bg-ivory")}>
                    <input type="radio" name="addr" className="sr-only" checked={addrChoice === i} onChange={() => chooseAddress(i)} />
                    <span className="block font-semibold text-darkroast">{a.label}</span>
                    <span className="mt-1 block text-warmgray">{a.fullName}, {a.line1}, {a.city} {a.pincode}</span>
                  </label>
                ))}
                <label className={cn("flex cursor-pointer items-center justify-center border border-dashed p-3 text-xs", addrChoice === "new" ? "border-espresso bg-cream" : "border-sand")}>
                  <input type="radio" name="addr" className="sr-only" checked={addrChoice === "new"} onChange={() => chooseAddress("new")} />
                  + Use a new address
                </label>
              </fieldset>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field {...fp("fullName")} label="Full name" placeholder="Asha Iyer" half />
              <Field {...fp("phone")} label="Mobile number" placeholder="98XXXXXXXX" half />
              <Field {...fp("line1")} label="Address line 1" placeholder="House no., street, area" />
              <Field {...fp("line2")} label="Address line 2 (optional)" placeholder="Landmark" />
              <Field {...fp("city")} label="City" placeholder="Bengaluru" half />
              <Field {...fp("state")} label="State" placeholder="Karnataka" half />
              <Field {...fp("pincode")} label="PIN code" placeholder="560001" half />
            </div>
          </section>
          <section>
            <h2 className="mb-4 font-display text-2xl text-darkroast">3 · Gift options</h2>
            <label className="flex cursor-pointer items-start gap-3 border border-sand bg-ivory p-4">
              <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="mt-1 h-4 w-4 accent-espresso" />
              <span className="text-sm text-darkroast">Add signature gift wrap <span className="text-mutedbrown">({inr(GIFT_WRAP_PRICE)} per order)</span>
                <span className="mt-0.5 block text-xs text-warmgray">Muslin wrap, dried flowers and a hand-written note. Only for gift-eligible pieces.</span>
              </span>
            </label>
            {giftWrap && (
              <div className="mt-3">
                <label htmlFor="gift-msg" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Gift message (optional, 120 characters)</label>
                <textarea id="gift-msg" rows={2} maxLength={120} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="With love, for…" className="w-full border border-sand bg-ivory px-3.5 py-3 text-sm focus:border-mocha focus:outline-none" />
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-4 font-display text-2xl text-darkroast">4 · Payment</h2>
            <div className="flex items-center gap-3 border border-sand bg-ivory p-4 text-sm text-warmgray">
              <Lock className="h-4 w-4 shrink-0 text-olivesage" aria-hidden />
              Mock payment on delivery — the real gateway will be connected with the backend. Nothing is charged.
            </div>
          </section>
        </div>

        <aside className="h-fit border border-sand bg-ivory p-6 lg:sticky lg:top-40">
          <h2 className="font-display text-xl text-darkroast">Order Summary</h2>
          <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
            {cart.map((i) => {
              const p = productById(i.productId);
              if (!p) return null;
              return (
                <li key={`${i.productId}-${i.color}`} className="flex items-center gap-3">
                  <img src={p.images[0]} alt="" className="h-14 w-11 rounded-sm object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-darkroast">{p.name}</p>
                    <p className="text-[11px] text-mutedbrown">{i.color} × {i.quantity}</p>
                  </div>
                  <p className="text-xs font-medium">{inr(p.price * i.quantity)}</p>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex gap-2 border-t border-sand pt-4">
            <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Promo code (try WELCOME5)" aria-label="Promo code" className="min-w-0 flex-1 border border-sand bg-cream px-3 py-2 text-xs focus:border-mocha focus:outline-none" />
            <button type="button" onClick={applyPromo} disabled={promoApplied} className="border border-espresso px-4 py-2 text-xs font-medium text-espresso hover:bg-espresso hover:text-cream disabled:opacity-50">
              {promoApplied ? "Applied" : "Apply"}
            </button>
          </div>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-warmgray">Subtotal</dt><dd>{inr(cartSubtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-warmgray">Shipping</dt><dd className={shipping === 0 ? "text-olivesage" : ""}>{shipping === 0 ? "Free" : inr(shipping)}</dd></div>
            <div className="flex justify-between"><dt className="text-warmgray">Gift wrap</dt><dd>{giftWrap ? inr(giftFee) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-warmgray">Discount {promoApplied && "(WELCOME5)"}</dt><dd className={discount ? "text-olivesage" : ""}>{discount ? `− ${inr(discount)}` : "—"}</dd></div>
            <div className="flex justify-between border-t border-sand pt-3 text-base font-semibold text-darkroast"><dt>Total</dt><dd>{inr(total)}</dd></div>
          </dl>
          {submitError && (
            <p role="alert" className="mt-4 flex items-start gap-2 border border-error/40 bg-error/5 p-3 text-xs text-error">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {submitError}
            </p>
          )}
          <button type="submit" disabled={submitting} className="mt-5 flex w-full items-center justify-center gap-2 bg-espresso py-4 text-xs font-semibold uppercase tracking-[0.18em] text-cream transition-colors hover:bg-mocha disabled:opacity-70">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Placing demo order…</> : <>Place Demo Order <ArrowRight className="h-4 w-4" aria-hidden /></>}
          </button>
          <Link to="/cart" className="mt-3 block text-center text-xs text-mocha underline underline-offset-4">Back to bag</Link>
        </aside>
      </form>
    </div>
  );
}