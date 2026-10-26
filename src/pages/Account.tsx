import { LogOut, MapPin, Package, Pencil, Plus, RotateCcw, Trash2, User as UserIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { EmptyState } from "../components/ui";
import { useStore } from "../hooks/useStore";
import { inr, isValidPhone, isValidPincode, shortDate } from "../lib/format";
import { orderService } from "../services";
import { addressService, alertService, returnService as returns } from "../services/catalog";
import type { Order, SavedAddress } from "../types";
import { cn } from "../utils/cn";

const STATUS_STYLE: Record<Order["status"], string> = {
  placed: "bg-champagne/60 text-espresso",
  confirmed: "bg-champagne/60 text-espresso",
  cancelled: "bg-error/10 text-error",
  processing: "bg-warning/15 text-warmgray",
  packed: "bg-warning/15 text-warmgray",
  shipped: "bg-info/10 text-info",
  delivered: "bg-olivesage/15 text-olivesage",
};

const TIMELINE: Order["status"][] = ["placed", "confirmed", "processing", "packed", "shipped", "delivered"];
const TABS = ["Overview", "Profile", "Addresses", "Orders", "Returns"] as const;

const RETURN_REASONS = ["Size / fit issue", "Damaged in transit", "Wrong item received", "Colour / look different", "Changed my mind", "Other"];

export default function Account() {
  const { user, setUser, signOut, wishlist } = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [orders] = useState(() => orderService.history());
  const [expanded, setExpanded] = useState<string | null>(orders[0]?.id ?? null);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My Account</p>
          <h1 className="mt-2 font-display text-4xl text-darkroast">Namaste, {user.name}.</h1>
        </div>
        <button onClick={signOut} className="inline-flex items-center gap-2 border border-sand px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-warmgray transition-colors hover:border-error hover:text-error">
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </div>

      <div role="tablist" aria-label="Account sections" className="mt-8 flex gap-1 overflow-x-auto border-b border-sand">
        {TABS.map((t) => (
          <button
            key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn("-mb-px shrink-0 border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]", tab === t ? "border-espresso text-espresso" : "border-transparent text-mutedbrown hover:text-espresso")}
          >
            {t}
            {t === "Orders" && orders.length > 0 && <span className="ml-1.5 rounded-full bg-cream px-1.5 text-[10px]">{orders.length}</span>}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "Overview" && <OverviewTab user={user} wishlistCount={wishlist.length} orders={orders} go={setTab} />}
        {tab === "Profile" && <ProfileTab user={user} setName={(name) => setUser({ ...user, name })} />}
        {tab === "Addresses" && <AddressesTab email={user.email} />}
        {tab === "Orders" && <OrdersTab orders={orders} expanded={expanded} setExpanded={setExpanded} />}
        {tab === "Returns" && <ReturnsTab email={user.email} orders={orders} />}
      </div>
    </div>
  );
}

/* ------------------------------- Overview -------------------------------- */

function OverviewTab({ user, wishlistCount, orders, go }: { user: { name: string; email: string }; wishlistCount: number; orders: Order[]; go: (t: (typeof TABS)[number]) => void }) {
  const alerts = alertService.list().length;
  const cards = [
    { title: "Profile", text: user.name, sub: user.email, action: () => go("Profile") },
    { title: "Orders", text: orders.length ? `${orders.length} order${orders.length > 1 ? "s" : ""}` : "No orders yet", sub: orders[0] ? `Latest: ${orders[0].reference}` : "Your orders will appear here", action: () => go("Orders") },
    { title: "Wishlist", text: `${wishlistCount} saved`, sub: "Pieces you're dreaming of", action: undefined as (() => void) | undefined, to: "/wishlist" },
    { title: "Stock alerts", text: alerts ? `${alerts} active` : "None set", sub: "Back-in-stock notifications", action: undefined as (() => void) | undefined, to: "/shop" },
  ];
  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const inner = (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mutedbrown">{c.title}</p>
              <p className="mt-2 font-display text-xl text-darkroast">{c.text}</p>
              <p className="mt-1 text-xs text-mutedbrown">{c.sub}</p>
            </>
          );
          const cls = "border border-sand bg-ivory p-6 text-left transition-colors hover:border-latte";
          return c.to ? <Link key={c.title} to={c.to} className={cls}>{inner}</Link>
            : <button key={c.title} onClick={c.action} className={cls}>{inner}</button>;
        })}
      </div>
      <div className="mt-6 flex items-center gap-2 border border-sand bg-ivory p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-espresso font-display text-sm text-cream">{user.name[0]?.toUpperCase()}</span>
        <p className="text-xs text-mutedbrown">Signed in as <strong className="text-darkroast">{user.email}</strong> · Profile stored only in this browser.</p>
      </div>
    </div>
  );
}

/* -------------------------------- Profile -------------------------------- */

function ProfileTab({ user, setName }: { user: { name: string; email: string }; setName: (n: string) => void }) {
  const { toast } = useStore();
  const [name, setNameLocal] = useState(user.name);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { setError("Please enter your full name."); return; }
    setError(null);
    setName(name.trim());
    try {
      const raw = localStorage.getItem("shopscale.user.v1");
      if (raw) localStorage.setItem("shopscale.user.v1", JSON.stringify({ ...JSON.parse(raw), name: name.trim() }));
    } catch { /* ignore */ }
    setEditing(false);
    toast("Profile updated and stored locally.");
  };

  return (
    <div className="max-w-xl border border-sand bg-ivory p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl text-darkroast"><UserIcon className="h-5 w-5 text-mocha" aria-hidden /> Personal Profile</h2>
        {!editing && (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-xs text-mocha underline underline-offset-4">
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <form onSubmit={save} className="mt-5 space-y-4">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Full name</label>
            <input id="profile-name" value={name} onChange={(e) => setNameLocal(e.target.value)} className="w-full border border-sand bg-white px-3.5 py-3 text-sm focus:border-mocha focus:outline-none" />
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
          </div>
          <div className="flex gap-3">
            <button className="bg-espresso px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-cream hover:bg-mocha">Save</button>
            <button type="button" onClick={() => { setEditing(false); setNameLocal(user.name); setError(null); }} className="border border-sand px-6 py-2.5 text-xs uppercase tracking-[0.14em] text-warmgray">Cancel</button>
          </div>
        </form>
      ) : (
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between border-b border-sand/70 pb-3"><dt className="text-mutedbrown">Name</dt><dd className="text-darkroast">{user.name}</dd></div>
          <div className="flex justify-between border-b border-sand/70 pb-3"><dt className="text-mutedbrown">Email</dt><dd className="text-darkroast">{user.email}</dd></div>
          <div className="flex justify-between"><dt className="text-mutedbrown">Role</dt><dd className="text-darkroast">Customer</dd></div>
        </dl>
      )}
      <p className="mt-5 text-[11px] leading-relaxed text-mutedbrown">Email verification and password change arrive with real authentication. Customer registration can never grant admin privileges.</p>
    </div>
  );
}

/* ------------------------------- Addresses ------------------------------- */

const addrInput = "w-full border border-sand bg-white px-3 py-2.5 text-sm focus:border-mocha focus:outline-none";

function AddressesTab({ email }: { email: string }) {
  const { toast } = useStore();
  const [list, setList] = useState<SavedAddress[]>(() => addressService.list(email));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const blank = { label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openNew = () => { setEditing(null); setForm(blank); setErrors({}); setFormOpen(true); };
  const openEdit = (a: SavedAddress) => {
    setEditing(a);
    setForm({ label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, pincode: a.pincode });
    setErrors({}); setFormOpen(true);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!form.label.trim()) er.label = "Give this address a label.";
    if (form.fullName.trim().length < 2) er.fullName = "Enter the recipient's name.";
    if (!isValidPhone(form.phone)) er.phone = "Enter a valid 10-digit mobile number.";
    if (form.line1.trim().length < 5) er.line1 = "Enter a complete street address.";
    if (!form.city.trim()) er.city = "City is required.";
    if (!form.state.trim()) er.state = "State is required.";
    if (!isValidPincode(form.pincode)) er.pincode = "Enter a valid 6-digit PIN code.";
    setErrors(er);
    if (Object.keys(er).length) return;
    const next = addressService.save(email, { ...form, line2: form.line2 || undefined, id: editing?.id, isDefault: editing?.isDefault ?? list.length === 0 });
    setList(next); setFormOpen(false);
    toast(editing ? "Address updated." : "Address saved.");
  };

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl text-darkroast"><MapPin className="h-5 w-5 text-mocha" aria-hidden /> Saved Addresses</h2>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 border border-espresso px-4 py-2 text-xs font-medium text-espresso hover:bg-espresso hover:text-cream">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add address
        </button>
      </div>
      {list.length === 0 && !formOpen ? (
        <EmptyState title="No saved addresses" text="Save your delivery addresses here and reuse them at checkout." actionLabel="Add your first address" onAction={openNew} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <li key={a.id} className={cn("border bg-ivory p-5", a.isDefault ? "border-espresso" : "border-sand")}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-darkroast">{a.label}</p>
                {a.isDefault && <span className="bg-espresso px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-cream">Default</span>}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-warmgray">{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} — {a.pincode}<br />{a.phone}</p>
              <div className="mt-3 flex gap-3 text-xs">
                <button onClick={() => openEdit(a)} className="text-mocha underline underline-offset-4">Edit</button>
                {!a.isDefault && <button onClick={() => setList(addressService.save(email, { ...a, isDefault: true }))} className="text-mocha underline underline-offset-4">Set default</button>}
                <button onClick={() => { setList(addressService.remove(email, a.id)); toast("Address removed.", "info"); }} className="inline-flex items-center gap-1 text-error"><Trash2 className="h-3 w-3" aria-hidden /> Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {formOpen && (
        <form onSubmit={save} noValidate className="mt-6 grid gap-4 border border-sand bg-ivory p-6 sm:grid-cols-2">
          {([["label", "Label (e.g. Home)"], ["fullName", "Full name"], ["phone", "Mobile number"], ["line1", "Address line 1"], ["line2", "Address line 2 (optional)"], ["city", "City"], ["state", "State"], ["pincode", "PIN code"]] as const).map(([k, label]) => (
            <div key={k} className={["line1", "line2"].includes(k) ? "sm:col-span-2" : ""}>
              <label htmlFor={`addr-${k}`} className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">{label}</label>
              <input id={`addr-${k}`} value={form[k]} onChange={set(k)} className={addrInput} aria-invalid={!!errors[k]} />
              {errors[k] && <p className="mt-1 text-xs text-error">{errors[k]}</p>}
            </div>
          ))}
          <div className="flex gap-3 sm:col-span-2">
            <button className="bg-espresso px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-cream hover:bg-mocha">{editing ? "Save changes" : "Save address"}</button>
            <button type="button" onClick={() => setFormOpen(false)} className="border border-sand px-6 py-2.5 text-xs uppercase tracking-[0.14em] text-warmgray">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

/* -------------------------------- Orders --------------------------------- */

function OrdersTab({ orders, expanded, setExpanded }: { orders: Order[]; expanded: string | null; setExpanded: (id: string | null) => void }) {
  if (orders.length === 0) {
    return <EmptyState title="No orders yet" text="Your orders will appear here after checkout — with live tracking and returns." actionLabel="Start Shopping" actionTo="/shop" />;
  }
  return (
    <div>
      <h2 className="flex items-center gap-2 font-display text-2xl text-darkroast"><Package className="h-5 w-5 text-mocha" aria-hidden /> Order History</h2>
      <p className="mt-1 text-xs text-mutedbrown">Orders are stored locally. Select an order for items, tracking and the event trail.</p>
      <ul className="mt-6 space-y-4">
        {orders.map((o) => {
          const open = expanded === o.id;
          const stepIdx = TIMELINE.indexOf(o.status);
          return (
            <li key={o.id} className="border border-sand bg-ivory">
              <button onClick={() => setExpanded(open ? null : o.id)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm text-espresso">{o.reference}</p>
                  <p className="text-xs text-mutedbrown">{shortDate(o.createdAt)} · {o.items.reduce((a, i) => a + i.quantity, 0)} item(s) · {inr(o.total)}</p>
                </div>
                <span className={cn("px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]", STATUS_STYLE[o.status])}>{o.status}</span>
              </button>
              {open && (
                <div className="border-t border-sand px-5 py-4">
                  <ol className="mb-5 flex items-center gap-1" aria-label="Order progress">
                    {TIMELINE.map((s, i) => (
                      <li key={s} className="flex flex-1 flex-col items-center gap-1.5">
                        <span className={cn("h-1.5 w-full rounded-full", i <= stepIdx ? "bg-olivesage" : "bg-sand")} />
                        <span className={cn("hidden text-[9px] uppercase tracking-wide sm:block", i <= stepIdx ? "text-olivesage" : "text-stone")}>{s}</span>
                      </li>
                    ))}
                  </ol>
                  <ul className="divide-y divide-sand/70">
                    {o.items.map((i, idx) => (
                      <li key={idx} className="flex items-center gap-3 py-3">
                        <img src={i.image} alt="" className="h-14 w-11 rounded-sm object-cover" loading="lazy" />
                        <div className="flex-1">
                          <p className="text-sm text-darkroast">{i.name}</p>
                          <p className="text-xs text-mutedbrown">{i.color} × {i.quantity}</p>
                        </div>
                        <p className="text-sm font-medium">{inr(i.price * i.quantity)}</p>
                      </li>
                    ))}
                  </ul>
                  {o.gift?.wrap && (
                    <p className="mt-2 border border-gold/50 bg-gold/10 p-3 text-xs text-warmgray">🎁 Gift wrapped{o.gift.message ? ` with message: “${o.gift.message}”` : ""}.</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 border-t border-sand pt-3 text-xs">
                    <Link to={`/track?ref=${o.reference}&email=${encodeURIComponent(o.email)}`} className="font-semibold uppercase tracking-[0.14em] text-espresso underline underline-offset-4">Live tracking →</Link>
                    <span className="text-mutedbrown">Ship to: {o.address.fullName}, {o.address.city} — {o.address.pincode}</span>
                  </div>
                  <div className="mt-3 space-y-1 border-t border-sand pt-3">
                    {o.events.map((ev, idx) => (
                      <p key={idx} className="text-[11px] text-mutedbrown"><span className="text-warmgray">{shortDate(ev.at)}</span> — {ev.note}</p>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------- Returns -------------------------------- */

function ReturnsTab({ email, orders }: { email: string; orders: Order[] }) {
  const { toast } = useStore();
  const [list, setList] = useState(() => returns.byEmail(email));
  const [formOpen, setFormOpen] = useState(false);
  const [orderRef, setOrderRef] = useState(orders[0]?.reference ?? "");
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!orderRef.trim()) { setError("Select an order."); return; }
    if (details.trim().length < 10) { setError("Please describe the issue in at least 10 characters."); return; }
    try {
      const r = returns.create({ orderRef, email, reason, details, orders });
      setList(returns.byEmail(email));
      setFormOpen(false); setDetails(""); setError(null);
      toast(`Return requested (${r.id}). Our support queue has it.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the request.");
    }
  };

  const badge = (s: string) => cn("px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
    s === "requested" ? "bg-warning/15 text-warmgray" : s === "approved" ? "bg-info/10 text-info" : s === "refunded" ? "bg-olivesage/15 text-olivesage" : "bg-error/10 text-error");

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl text-darkroast"><RotateCcw className="h-5 w-5 text-mocha" aria-hidden /> Returns & Refunds</h2>
        <button onClick={() => setFormOpen((o) => !o)} className="border border-espresso px-4 py-2 text-xs font-medium text-espresso hover:bg-espresso hover:text-cream">
          {formOpen ? "Close" : "Request a return"}
        </button>
      </div>
      {formOpen && (
        <form onSubmit={submit} noValidate className="mb-6 grid gap-4 border border-sand bg-ivory p-6 sm:grid-cols-2">
          <div>
            <label htmlFor="ret-order" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Order</label>
            <select id="ret-order" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} className={addrInput}>
              {orders.map((o) => <option key={o.id} value={o.reference}>{o.reference} · {inr(o.total)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ret-reason" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Reason</label>
            <select id="ret-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={addrInput}>
              {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ret-details" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Details</label>
            <textarea id="ret-details" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} className={addrInput} placeholder="What happened? (min 10 characters)" />
          </div>
          {error && <p role="alert" className="text-xs text-error sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2"><button className="bg-espresso px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-cream hover:bg-mocha">Submit request</button></div>
        </form>
      )}
      {list.length === 0 ? (
        <EmptyState title="No return requests" text="If a saree isn't right, request a return here. Refunds are not available yet." actionLabel="Browse Sarees" actionTo="/shop" />
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 border border-sand bg-ivory p-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-espresso">{r.orderRef}</p>
                <p className="mt-1 text-xs text-warmgray">{r.reason} — {r.details}</p>
                <p className="mt-1 text-[11px] text-mutedbrown">{shortDate(r.createdAt)} · {r.id}</p>
              </div>
              <span className={badge(r.status)}>{r.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
