import { Activity, ArrowLeft, Boxes, Database, Eye, EyeOff, Gauge, LayoutDashboard, LifeBuoy, Link2, Loader2, Lock, LogOut, Megaphone, Package, Radar, Radio, ShieldAlert, Upload } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { IMG, img } from "../../data/catalogue";
import { authService, DEMO_ADMIN } from "../../services";
import { ApiError, BACKEND_CONFIGURED } from "../../services/api";
import { cn } from "../../utils/cn";

const GROUPS = [
  { title: "Commerce", links: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/products", label: "Products", icon: Boxes },
    { to: "/admin/inventory", label: "Inventory", icon: Package },
    { to: "/admin/orders", label: "Orders", icon: Package },
    { to: "/admin/content", label: "Content", icon: Megaphone },
    { to: "/admin/support", label: "Support", icon: LifeBuoy },
    { to: "/admin/catalogue", label: "Catalogue & Regions", icon: Boxes },
    { to: "/admin/links", label: "URL Shortener", icon: Link2 },
    { to: "/admin/importer", label: "Dataset Importer", icon: Upload },
  ] },
  { title: "System Design Lab", links: [
    { to: "/admin/crawler", label: "Web Crawler", icon: Radar },
    { to: "/admin/infra", label: "Redis & Rate Limiter", icon: Database },
    { to: "/admin/events", label: "Kafka Events", icon: Radio },
    { to: "/admin/performance", label: "JMeter & Health", icon: Gauge },
  ] },
];

export function DataBadge({ kind = "simulated" }: { kind?: "simulated" | "sample" | "local" }) {
  const label = BACKEND_CONFIGURED ? "Live backend" : kind === "simulated" ? "Simulated in browser" : kind === "sample" ? "Sample data" : "Local demo data";
  return (
    <span className="inline-flex items-center gap-1 border border-warning/60 bg-warning/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-warmgray">
      <Activity className="h-3 w-3 text-warning" aria-hidden /> {label}
    </span>
  );
}

export function Panel({ title, subtitle, children, className, kind, action }: { title: string; subtitle?: string; children: ReactNode; className?: string; kind?: "simulated" | "sample" | "local"; action?: ReactNode }) {
  return (
    <section className={cn("border border-sand bg-white p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg text-darkroast">{title}</h2>
          {subtitle && <p className="text-[11px] text-mutedbrown">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">{action}<DataBadge kind={kind} /></div>
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="border border-sand bg-white p-4">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-mutedbrown">{label}</p>
      <p className={cn("mt-1.5 font-display text-2xl", tone === "good" ? "text-olivesage" : tone === "warn" ? "text-mocha" : tone === "bad" ? "text-error" : "text-darkroast")}>{value}</p>
      {note && <p className="mt-0.5 text-[11px] text-mutedbrown">{note}</p>}
    </div>
  );
}

export const btn = "inline-flex items-center justify-center gap-2 border border-espresso px-3.5 py-2 text-xs font-medium text-espresso transition-colors hover:bg-espresso hover:text-cream disabled:opacity-50";
export const btnSolid = "inline-flex items-center justify-center gap-2 bg-espresso px-3.5 py-2 text-xs font-medium text-cream transition-colors hover:bg-mocha disabled:opacity-50";
export const tooltipStyle = { backgroundColor: "#FDF9F6", border: "1px solid #E6DAD3", borderRadius: 4, fontSize: 12, fontFamily: "Poppins" };
export const PALETTE = { espresso: "#683B2B", mocha: "#8B5E3C", latte: "#B88A70", terracotta: "#C46A4B", sage: "#55745B", gold: "#D4A373", champagne: "#D9C0AD" };

function AdminEmblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect x="6" y="6" width="28" height="28" transform="rotate(45 20 20)" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="12" width="16" height="16" transform="rotate(45 20 20)" fill="none" stroke="#D4A373" strokeWidth="1.2" />
      <path d="M8 20h24M20 8v24" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1.5 2" />
      <circle cx="20" cy="20" r="2.4" fill="#C46A4B" />
    </svg>
  );
}

export function AdminLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) er.email = "Enter a valid email address.";
    if (password.length < 4) er.password = "Enter your password.";
    setErrors(er);
    setError(null);
    if (Object.keys(er).length) return;
    setLoading(true);
    try { await authService.adminSignIn(email, password); onDone(); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Sign-in failed."); }
    finally { setLoading(false); }
  };

  const input = "w-full border border-sand bg-white px-3.5 py-3 pr-11 text-sm text-darkroast placeholder:text-mutedbrown focus:border-mocha focus:outline-none";
  const inputPlain = "w-full border border-sand bg-white px-3.5 py-3 text-sm text-darkroast placeholder:text-mutedbrown focus:border-mocha focus:outline-none";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* Editorial panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src={img(IMG.loom, 1000, 1400)} alt="A traditional wooden loom threaded for weaving" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-darkroast via-darkroast/55 to-darkroast/20" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <div className="flex items-center gap-3 text-ivory">
            <AdminEmblem className="h-9 w-9 text-gold" />
            <span className="font-display text-2xl font-semibold tracking-[0.06em]">SHOPSCALE</span>
          </div>
          <p className="mt-1.5 ml-[3.25rem] font-display italic text-champagne">a world woven in tradition</p>
          <h2 className="mt-8 font-display text-4xl leading-tight text-ivory">Administration<br />Portal</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-champagne">
            Manage the catalogue, inventory, orders and the system-design lab — from one refined workspace.
          </p>
          <ul className="mt-6 space-y-2 text-xs text-champagne/80">
            {["Product & catalogue management", "Inventory with low-stock alerts", "Orders, returns & refunds", "Cache, events & load-test lab"].map((f) => (
              <li key={f} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-gold" aria-hidden /> {f}</li>
            ))}
          </ul>
        </div>
        <div className="absolute right-8 top-8 rounded-sm border border-gold/40 bg-darkroast/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold backdrop-blur">Restricted area</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-cream px-5 py-10 sm:px-10">
        <form onSubmit={submit} noValidate className="w-full max-w-md">
          <div className="flex items-center gap-3 lg:hidden">
            <AdminEmblem className="h-8 w-8 text-espresso" />
            <span className="font-display text-xl font-semibold tracking-[0.06em] text-espresso">SHOPSCALE</span>
          </div>
          <p className="mt-8 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-mocha">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Administration Portal
          </p>
          <h1 className="mt-3 font-display text-3xl text-darkroast md:text-4xl">Welcome back, admin.</h1>
          <p className="mt-2 text-sm leading-relaxed text-warmgray">
            Sign in to manage ShopScale. Demo credentials:{" "}
            <span className="font-mono text-espresso">{DEMO_ADMIN.email}</span> / <span className="font-mono text-espresso">{DEMO_ADMIN.password}</span>
          </p>

          <div className="mt-8 space-y-4">
            <div>
              <label htmlFor="adm-email" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Email</label>
              <input id="adm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? inputPlain + " border-error" : inputPlain}
                autoComplete="username" placeholder="admin@shopscale.dev" aria-invalid={!!errors.email} />
              {errors.email && <p className="mt-1 text-xs text-error">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="adm-pass" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Password</label>
              <div className="relative">
                <input id="adm-pass" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={errors.password ? input + " border-error" : input}
                  autoComplete="current-password" placeholder="••••••••" aria-invalid={!!errors.password} />
                <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedbrown hover:text-darkroast">
                  {showPw ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-error">{errors.password}</p>}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-warmgray">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-espresso" />
                Remember me
              </label>
              <span className="text-xs text-mutedbrown" title="Demo reset is not available for admin">Forgot password?</span>
            </div>
            {error && (
              <p role="alert" className="flex items-start gap-2 border border-error/40 bg-error/5 p-3 text-xs text-error">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {error}
              </p>
            )}
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 bg-espresso py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-cream shadow-card transition-all hover:bg-mocha hover:shadow-lift disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {loading ? "Verifying…" : "Sign In"}
            </button>
            <button type="button" onClick={() => { setEmail(DEMO_ADMIN.email); setPassword(DEMO_ADMIN.password); setErrors({}); setError(null); }}
              className="w-full border border-sand bg-white py-3 text-xs font-medium text-mocha transition-colors hover:border-mocha hover:text-espresso">
              Use demo credentials
            </button>
          </div>

          <div className="mt-8 border-t border-sand pt-5">
            <p className="text-[11px] leading-relaxed text-mutedbrown">
              This portal is a prototype. Admin sessions are a local browser flag; a production deployment must enforce roles server-side. There is no public admin registration.
            </p>
          </div>
          <NavLink to="/" className="mt-6 flex items-center gap-1.5 text-xs text-mutedbrown transition-colors hover:text-espresso">
            <ArrowLeft className="h-3 w-3" aria-hidden /> Return to Store
          </NavLink>
        </form>
      </div>
    </div>
  );
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  return <AdminLogin onDone={() => navigate("/admin/dashboard", { replace: true })} />;
}

export default function AdminLayout() {
  const [authed, setAuthed] = useState(() => authService.isAdmin());
  if (!authed) return <AdminLogin onDone={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="bg-darkroast lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-5 lg:block">
          <div>
            <p className="font-display text-xl tracking-[0.06em] text-ivory">SHOPSCALE</p>
            <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.26em] text-gold"><Database className="h-3 w-3" aria-hidden /> Engineering Console</p>
          </div>
          <NavLink to="/" className="inline-flex items-center gap-1.5 text-xs text-champagne hover:text-gold lg:mt-5"><ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Storefront</NavLink>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:pb-0" aria-label="Admin">
          {GROUPS.map((g) => (
            <div key={g.title} className="flex gap-1 lg:mb-5 lg:block">
              <p className="hidden px-3 pb-2 text-[9.5px] font-semibold uppercase tracking-[0.24em] text-stone lg:block">{g.title}</p>
              {g.links.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("flex shrink-0 items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors", isActive ? "bg-espresso text-cream" : "text-champagne hover:bg-warmgray/30 hover:text-ivory")}>
                  <Icon className="h-4 w-4" aria-hidden /> {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="hidden px-5 pb-6 lg:block">
          <button onClick={() => { authService.adminSignOut(); setAuthed(false); }} className="flex items-center gap-2 text-xs text-champagne hover:text-gold"><LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out</button>
          <p className="mt-4 text-[10px] leading-relaxed text-stone">Infrastructure metrics are kept here — separate from the customer shopping experience.</p>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 lg:px-8 lg:py-8"><Outlet /></main>
    </div>
  );
}