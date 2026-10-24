import { ArrowLeft, ArrowRight, Check, Eye, ImagePlus, Loader2, Save, Send, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FABRICS, OCCASION_INFO, TECHNIQUE_GROUP, VARIETIES, ZONES, occasionLabel } from "../../data/catalogue";
import { useStore } from "../../hooks/useStore";
import { inr } from "../../lib/format";
import { EMPTY_INPUT, SAMPLE_IMAGES, productCatalog, validateProductInput, type ProductInput } from "../../services/catalog";
import type { Border, CareType, Colour, Composition, FabricFamily, Loom, Motif, PublicationStatus, Technique, Weight } from "../../types";
import { img } from "../../data/catalogue";
import { cn } from "../../utils/cn";
import { Panel } from "./AdminLayout";

const COLOURS: Colour[] = ["Red", "Maroon", "Pink", "Orange", "Yellow", "Green", "Blue", "Purple", "Black", "White", "Ivory", "Beige", "Gold", "Multicolour"];
const TECHNIQUES = Object.keys(TECHNIQUE_GROUP) as Technique[];
const GROUP_OF = (t: Technique) => TECHNIQUE_GROUP[t];

const lbl = "mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray";
const inp = "w-full border border-sand bg-white px-3 py-2.5 text-sm text-darkroast focus:border-mocha focus:outline-none";
const inpErr = "w-full border border-error bg-white px-3 py-2.5 text-sm text-darkroast focus:outline-none";
const err = "mt-1 text-xs text-error";
const secTitle = "font-display text-xl text-darkroast";

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className={err} role="alert">{msg}</p> : null;
}

function inputFromProduct(id: string): ProductInput | null {
  const p = productCatalog.get(id);
  if (!p) return null;
  return {
    name: p.name, variety: p.variety, description: p.description,
    fabric: p.fabric, fabricDetail: p.fabricDetail, composition: p.composition, loom: p.loom,
    techniques: [...p.techniques], colours: [...p.colours], colorVariants: [...p.colors],
    motif: p.motif, border: p.border, weight: p.weight, weightG: p.weightG ?? null,
    care: p.care, price: p.price, originalPrice: p.originalPrice, stock: p.stock,
    lowStockThreshold: p.lowStockThreshold ?? 3, images: [...p.images], occasion: [...p.occasion],
    collections: [...p.collections], originVerified: p.originVerified, artisan: p.artisan,
    length: p.length, blousePiece: p.blousePiece, pallu: p.pallu, story: p.story,
    badge: p.badge, giftEligible: p.giftEligible ?? true,
  };
}

export default function AdminProductForm() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const existing = !isNew ? productCatalog.get(id!) : undefined;
  const navigate = useNavigate();
  const { toast } = useStore();

  const [form, setForm] = useState<ProductInput>(() => (existing ? inputFromProduct(existing.id) ?? { ...EMPTY_INPUT } : { ...EMPTY_INPUT }));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [section, setSection] = useState(0);
  const [preview, setPreview] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const variety = VARIETIES.find((v) => v.name === form.variety);
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k as string]: undefined }));
  };
  const toggleList = <T,>(k: "techniques" | "colours" | "occasion" | "collections", v: T) => {
    const list = form[k] as T[];
    set(k, (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]) as ProductInput[typeof k]);
  };

  const addImage = (url: string) => {
    const u = url.trim();
    if (!u) return;
    if (form.images.includes(u)) { toast("That image is already added.", "info"); return; }
    if (form.images.length >= 8) { toast("Maximum 8 images in this demo.", "error"); return; }
    set("images", [...form.images, u]);
  };
  const moveImage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= form.images.length) return;
    const next = [...form.images];
    [next[i], next[j]] = [next[j], next[i]];
    set("images", next);
  };

  const validate = (_forPublish: boolean) => {
    void _forPublish;
    const e = validateProductInput(form);
    setErrors(e);
    return e;
  };

  const save = async (status: PublicationStatus | null, asNew = false) => {
    const forPublish = status === "published";
    const e = validate(forPublish);
    if (Object.keys(e).length) {
      toast(forPublish ? "Fix validation errors before publishing." : "Fix validation errors before saving.", "error");
      const firstBad = ["name", "variety", "description", "fabricDetail", "price", "stock", "images", "techniques", "colours", "occasion", "length"].find((k) => e[k]);
      setSection(firstBad && ["price", "stock"].includes(firstBad) ? 2 : firstBad === "images" ? 3 : ["techniques", "colours", "occasion", "length"].includes(firstBad ?? "") ? 1 : 0);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    try {
      if (isNew || asNew) {
        const p = productCatalog.create(form);
        if (status) productCatalog.setStatus(p.id, status);
        toast(`“${p.name}” created as ${status ?? p.publication}. ${status === "published" ? "It is now live in the storefront." : "It stays hidden until published."}`);
        navigate(`/admin/products/${p.id}/edit`);
      } else if (existing) {
        productCatalog.update(existing.id, form);
        if (status) productCatalog.setStatus(existing.id, status);
        toast(status === "published" ? "Published — the storefront now shows it." : status ? `Status → ${status}.` : "Draft saved.");
      }
    } finally { setSaving(false); }
  };

  const sections = ["Basic information", "Specifications", "Pricing & inventory", "Images", "Publishing"];
  const pub = existing?.publication ?? "draft";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      <header>
        <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-xs text-mutedbrown hover:text-espresso">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All products
        </Link>
        <h1 className="mt-2 font-display text-3xl text-darkroast">{isNew ? "Add Saree" : `Edit — ${existing?.name ?? "Not found"}`}</h1>
        <p className="mt-1 text-xs text-mutedbrown">
          {existing ? <>SKU <span className="font-mono">{existing.sku}</span> · Status: <strong className="capitalize">{pub}</strong> · Changes apply instantly with cache invalidation (demo).</>
            : "New products start as drafts and stay hidden until published."}
        </p>
      </header>

      {!existing && !isNew && (
        <Panel title="Product not found">
          <p className="text-sm text-warmgray">This product may have been deleted.</p>
          <Link to="/admin/products/new" className="mt-3 inline-block bg-espresso px-5 py-2.5 text-xs text-cream">Add a new saree</Link>
        </Panel>
      )}
      {(isNew || existing) && (
        <>
          {/* Section nav */}
          <nav className="sticky top-0 z-10 -mx-1 overflow-x-auto bg-cream/95 px-1 py-2 backdrop-blur" aria-label="Form sections">
            <ol className="flex min-w-max gap-1">
              {sections.map((s, i) => (
                <li key={s}>
                  <button onClick={() => setSection(i)} aria-current={section === i ? "step" : undefined}
                    className={cn("flex items-center gap-2 px-3.5 py-2 text-xs font-medium", section === i ? "bg-espresso text-cream" : "bg-white text-warmgray hover:text-espresso")}>
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px]", section === i ? "bg-cream text-espresso" : "bg-cream text-warmgray")}>
                      {i < section ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
                    </span> {s}
                  </button>
                </li>
              ))}
              <li>
                <button onClick={() => setPreview((p) => !p)} aria-pressed={preview}
                  className={cn("flex items-center gap-2 px-3.5 py-2 text-xs font-medium", preview ? "bg-mocha text-cream" : "bg-white text-warmgray")}>
                  <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
                </button>
              </li>
            </ol>
          </nav>

          {preview ? (
            <ProductPreview form={form} varietyBlurb={variety?.blurb} />
          ) : (
            <div className="border border-sand bg-white p-6 sm:p-8">
              {section === 0 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <h2 className={`${secTitle} sm:col-span-2`}>1 · Basic information</h2>
                  <div className="sm:col-span-2">
                    <label htmlFor="f-name" className={lbl}>Product name *</label>
                    <input id="f-name" value={form.name} onChange={(e) => set("name", e.target.value)} className={errors.name ? inpErr : inp} placeholder="e.g. Temple Peacock Kanjivaram" />
                    <FieldError msg={errors.name} />
                  </div>
                  <div>
                    <label htmlFor="f-variety" className={lbl}>Traditional variety *</label>
                    <input id="f-variety" list="variety-list" value={form.variety} onChange={(e) => set("variety", e.target.value)} className={errors.variety ? inpErr : inp} placeholder="Start typing — Kanchipuram Silk…" />
                    <datalist id="variety-list">{VARIETIES.map((v) => <option key={v.slug} value={v.name}>{`${v.state}${v.status === "inspired" ? " (inspired)" : ""}`}</option>)}</datalist>
                    <FieldError msg={errors.variety} />
                  </div>
                  <div>
                    <label className={lbl}>Region auto-fill</label>
                    <p className="border border-sand bg-cream/60 px-3 py-2.5 text-sm text-warmgray">{variety ? `${variety.state} · ${variety.zone} · ${variety.kind}` : "Select a variety to fill region, zone and garment type."}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="f-desc" className={lbl}>Short description *</label>
                    <textarea id="f-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={errors.description ? inpErr : inp} placeholder="Customer-facing summary (min 20 characters)." />
                    <FieldError msg={errors.description} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="f-story" className={lbl}>Artisan / heritage story</label>
                    <textarea id="f-story" rows={3} value={form.story} onChange={(e) => set("story", e.target.value)} className={inp} placeholder="Who wove it, where, and how — or leave blank for the catalogue fallback." />
                  </div>
                  <div>
                    <label htmlFor="f-badge" className={lbl}>Badge</label>
                    <select id="f-badge" value={form.badge ?? ""} onChange={(e) => set("badge", (e.target.value || undefined) as ProductInput["badge"])} className={inp}>
                      <option value="">None</option><option>Bestseller</option><option>New Arrival</option><option>Limited Edition</option><option>Sale</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Collections</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["Premium", "Wedding", "Festive", "Sustainable", "Designer", "Office"].map((c) => (
                        <button key={c} type="button" onClick={() => toggleList("collections", c)} aria-pressed={form.collections.includes(c)}
                          className={cn("border px-2.5 py-1.5 text-xs", form.collections.includes(c) ? "border-espresso bg-espresso text-cream" : "border-sand")}>{c}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {section === 1 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <h2 className={`${secTitle} sm:col-span-2`}>2 · Saree specifications</h2>
                  <div>
                    <label htmlFor="f-fabric" className={lbl}>Fabric *</label>
                    <select id="f-fabric" value={form.fabric} onChange={(e) => set("fabric", e.target.value as FabricFamily)} className={inp}>
                      {FABRICS.map((f) => <option key={f.name}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="f-fabricdetail" className={lbl}>Fabric & composition detail *</label>
                    <input id="f-fabricdetail" value={form.fabricDetail} onChange={(e) => set("fabricDetail", e.target.value)} className={errors.fabricDetail ? inpErr : inp} placeholder="e.g. Pure mulberry silk with zari" />
                    <FieldError msg={errors.fabricDetail} />
                  </div>
                  <div>
                    <label htmlFor="f-comp" className={lbl}>Composition class *</label>
                    <select id="f-comp" value={form.composition} onChange={(e) => set("composition", e.target.value as Composition)} className={inp}>
                      <option>Pure</option><option>Blend</option><option>Natural Fibre</option><option>Art Silk / Synthetic</option>
                    </select>
                    <p className="mt-1 text-[11px] text-mutedbrown">Never list art silk as Pure — the storefront states this verbatim.</p>
                  </div>
                  <div>
                    <label htmlFor="f-loom" className={lbl}>Loom *</label>
                    <select id="f-loom" value={form.loom} onChange={(e) => set("loom", e.target.value as Loom)} className={inp}>
                      <option>Handloom</option><option>Powerloom</option><option>Machine-woven</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <span className={lbl} id="tech-label">Techniques * (grouped: weave / print & dye / embroidery)</span>
                    <div className="grid gap-3 sm:grid-cols-3" role="group" aria-labelledby="tech-label">
                      {(["Weave", "Print & Dye", "Embroidery & Surface"] as const).map((g) => (
                        <fieldset key={g} className="border border-sand p-3">
                          <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mutedbrown">{g}</legend>
                          <div className="space-y-1.5">
                            {TECHNIQUES.filter((t) => GROUP_OF(t) === g).map((t) => (
                              <label key={t} className="flex cursor-pointer items-center gap-2 text-[13px] text-warmgray">
                                <input type="checkbox" checked={form.techniques.includes(t)} onChange={() => toggleList("techniques", t)} className="h-4 w-4 accent-espresso" /> {t}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                    <FieldError msg={errors.techniques} />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={lbl}>Main colours *</span>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOURS.map((c) => (
                        <button key={c} type="button" onClick={() => toggleList("colours", c)} aria-pressed={form.colours.includes(c)}
                          className={cn("border px-2.5 py-1.5 text-xs", form.colours.includes(c) ? "border-espresso bg-espresso text-cream" : "border-sand")}>{c}</button>
                      ))}
                    </div>
                    <FieldError msg={errors.colours} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="f-variants" className={lbl}>Colour variants (comma separated)</label>
                    <input id="f-variants" value={form.colorVariants.join(", ")} onChange={(e) => set("colorVariants", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className={inp} placeholder="Maroon & Gold, Emerald & Gold" />
                  </div>
                  <div>
                    <label htmlFor="f-motif" className={lbl}>Motif</label>
                    <select id="f-motif" value={form.motif} onChange={(e) => set("motif", e.target.value as Motif)} className={inp}>
                      {["Floral", "Geometric", "Checks", "Stripes", "Paisley", "Temple", "Traditional", "Contemporary", "Figurative"].map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="f-border" className={lbl}>Border</label>
                    <select id="f-border" value={form.border} onChange={(e) => set("border", e.target.value as Border)} className={inp}>
                      {["Zari", "Temple", "Contrast", "Plain", "Embroidered"].map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="f-pallu" className={lbl}>Pallu design</label>
                    <input id="f-pallu" value={form.pallu} onChange={(e) => set("pallu", e.target.value)} className={inp} placeholder="e.g. Rich brocaded pallu with paisley jaal" />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={lbl}>Occasions *</span>
                    <div className="flex flex-wrap gap-1.5">
                      {OCCASION_INFO.map((o) => (
                        <button key={o.key} type="button" onClick={() => toggleList("occasion", o.key)} aria-pressed={form.occasion.includes(o.key)}
                          className={cn("border px-2.5 py-1.5 text-xs", form.occasion.includes(o.key) ? "border-espresso bg-espresso text-cream" : "border-sand")}>{o.label}</button>
                      ))}
                    </div>
                    <FieldError msg={errors.occasion} />
                  </div>
                  <div>
                    <label htmlFor="f-length" className={lbl}>Length & blouse piece *</label>
                    <input id="f-length" value={form.length} onChange={(e) => set("length", e.target.value)} className={errors.length ? inpErr : inp} placeholder="5.5 m + 0.8 m blouse piece" />
                    <FieldError msg={errors.length} />
                  </div>
                  <div>
                    <label htmlFor="f-blouse" className={lbl}>Blouse piece included?</label>
                    <select id="f-blouse" value={form.blousePiece == null ? "" : form.blousePiece ? "yes" : "no"} onChange={(e) => set("blousePiece", e.target.value === "" ? null : e.target.value === "yes")} className={inp}>
                      <option value="">To be confirmed</option><option value="yes">Yes</option><option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="f-weight" className={lbl}>Weight class</label>
                    <select id="f-weight" value={form.weight} onChange={(e) => set("weight", e.target.value as Weight)} className={inp}>
                      <option>Lightweight</option><option>Medium</option><option>Heavy</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="f-weightg" className={lbl}>Approx. weight (g, optional)</label>
                    <input id="f-weightg" inputMode="numeric" value={form.weightG ?? ""} onChange={(e) => set("weightG", e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")))} className={errors.weightG ? inpErr : inp} placeholder="e.g. 650" />
                    <FieldError msg={errors.weightG} />
                  </div>
                  <div>
                    <label htmlFor="f-care" className={lbl}>Care</label>
                    <select id="f-care" value={form.care} onChange={(e) => set("care", e.target.value as CareType)} className={inp}>
                      <option>Dry clean</option><option>Hand wash</option><option>Machine washable</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="f-artisan" className={lbl}>Artisan / cluster</label>
                    <input id="f-artisan" value={form.artisan} onChange={(e) => set("artisan", e.target.value)} className={inp} placeholder="Leave blank for “(unverified)”" />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5 border border-sand p-3 text-sm sm:col-span-2">
                    <input type="checkbox" checked={form.originVerified} onChange={(e) => set("originVerified", e.target.checked)} className="h-4 w-4 accent-espresso" />
                    <span>Origin verified <span className="text-mutedbrown">(only tick with supporting records — never invent certification)</span></span>
                  </label>
                </div>
              )}

              {section === 2 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <h2 className={`${secTitle} sm:col-span-2`}>3 · Pricing & inventory</h2>
                  <div>
                    <label htmlFor="f-price" className={lbl}>Selling price (₹) *</label>
                    <input id="f-price" inputMode="numeric" value={form.price || ""} onChange={(e) => set("price", Number(e.target.value.replace(/\D/g, "")) || 0)} className={errors.price ? inpErr : inp} placeholder="8999" />
                    <FieldError msg={errors.price} />
                  </div>
                  <div>
                    <label htmlFor="f-oprice" className={lbl}>Original price (₹, optional)</label>
                    <input id="f-oprice" inputMode="numeric" value={form.originalPrice ?? ""} onChange={(e) => set("originalPrice", e.target.value === "" ? undefined : Number(e.target.value.replace(/\D/g, "")) || undefined)} className={errors.originalPrice ? inpErr : inp} placeholder="Must exceed selling price" />
                    <FieldError msg={errors.originalPrice} />
                  </div>
                  <p className="border border-sand bg-cream/60 px-3 py-2.5 text-xs text-mutedbrown sm:col-span-2">Tax configuration is a placeholder in this prototype — prices are treated as inclusive of taxes.</p>
                  <div>
                    <label htmlFor="f-stock" className={lbl}>Stock quantity *</label>
                    <input id="f-stock" inputMode="numeric" value={form.stock === 0 && !errors.stock ? "0" : form.stock || ""} onChange={(e) => set("stock", Number(e.target.value.replace(/\D/g, "")) || 0)} className={errors.stock ? inpErr : inp} placeholder="12" />
                    <FieldError msg={errors.stock} />
                  </div>
                  <div>
                    <label htmlFor="f-thresh" className={lbl}>Low-stock threshold *</label>
                    <input id="f-thresh" inputMode="numeric" value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value.replace(/\D/g, "")) || 0)} className={errors.lowStockThreshold ? inpErr : inp} />
                    <FieldError msg={errors.lowStockThreshold} />
                  </div>
                  <div className="border border-sand bg-cream/60 p-3 text-xs text-warmgray sm:col-span-2">
                    Availability is derived: <strong>0 → Out of stock</strong> · <strong>≤ threshold → Low stock</strong> · otherwise In stock. Discount % is derived from the two prices — never entered manually.
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5 border border-sand p-3 text-sm sm:col-span-2">
                    <input type="checkbox" checked={form.giftEligible} onChange={(e) => set("giftEligible", e.target.checked)} className="h-4 w-4 accent-espresso" />
                    Eligible for gift wrap at checkout
                  </label>
                </div>
              )}

              {section === 3 && (
                <div>
                  <h2 className={secTitle}>4 · Images</h2>
                  <p className="mt-1 text-xs text-mutedbrown">First image is the primary. JPG/PNG/WebP under ~2 MB work best in this demo (URLs or catalogue samples).</p>
                  <FieldError msg={errors.images} />
                  {form.images.length > 0 ? (
                    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {form.images.map((src, i) => (
                        <li key={`${src}-${i}`} className={cn("relative border-2", i === 0 ? "border-espresso" : "border-sand")}>
                          <img src={src} alt={`Preview ${i + 1}`} className="aspect-[3/4] w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.25"; }} />
                          {i === 0 && <span className="absolute left-1.5 top-1.5 bg-espresso px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-cream">Primary</span>}
                          <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                            <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Move left" className="bg-white/90 p-1 disabled:opacity-40"><ArrowRight className="h-3 w-3 rotate-180" aria-hidden /></button>
                            <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} aria-label="Move right" className="bg-white/90 p-1 disabled:opacity-40"><ArrowRight className="h-3 w-3" aria-hidden /></button>
                            <button type="button" onClick={() => set("images", form.images.filter((_, j) => j !== i))} aria-label={`Remove image ${i + 1}`} className="bg-white/90 p-1 text-error"><Trash2 className="h-3 w-3" aria-hidden /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 border border-dashed border-sand p-8 text-center text-xs text-mutedbrown">No images yet — add a catalogue sample or paste an image URL below.</p>
                  )}
                  <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-darkroast">Catalogue samples</h3>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {SAMPLE_IMAGES.map((s) => {
                      const url = img(s.id, 700, 933);
                      const added = form.images.includes(url);
                      return (
                        <button key={s.id} type="button" onClick={() => (added ? set("images", form.images.filter((x) => x !== url)) : addImage(url))}
                          aria-pressed={added} title={s.label} className={cn("relative overflow-hidden border-2", added ? "border-espresso" : "border-sand")}>
                          <img src={url} alt={s.label} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                          {added && <span className="absolute inset-x-0 bottom-0 bg-espresso/90 py-0.5 text-center text-[9px] uppercase text-cream"><Check className="mx-auto h-3 w-3" aria-hidden /></span>}
                        </button>
                      );
                    })}
                  </div>
                  <form className="mt-4 flex gap-2" onSubmit={(e: FormEvent) => { e.preventDefault(); addImage(customUrl); setCustomUrl(""); }}>
                    <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://… image URL (validated on preview)" aria-label="Image URL" className={inp} />
                    <button className="inline-flex shrink-0 items-center gap-1.5 border border-espresso px-4 text-xs font-medium text-espresso hover:bg-espresso hover:text-cream">
                      <ImagePlus className="h-3.5 w-3.5" aria-hidden /> Add
                    </button>
                  </form>
                </div>
              )}

              {section === 4 && (
                <div>
                  <h2 className={secTitle}>5 · Publishing</h2>
                  <ol className="mt-4 space-y-3 text-sm">
                    {[
                      ["Draft", "Private working copy. Hidden everywhere."],
                      ["In Review", "Ready for a second pair of eyes. Still hidden from shoppers."],
                      ["Published", "Live in the storefront, search and collections immediately."],
                      ["Archived", "Retired. Hidden from shoppers but kept for records."],
                    ].map(([s, d]) => (
                      <li key={s} className={cn("flex items-center gap-3 border p-3", (existing?.publication ?? "draft") === s.toLowerCase().replace(" ", "-") ? "border-espresso bg-cream/60" : "border-sand")}>
                        <span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-[0.1em]">{s}</span>
                        <span className="text-xs text-warmgray">{d}</span>
                      </li>
                    ))}
                  </ol>
                  {!isNew && existing && (
                    <button type="button" onClick={() => setConfirmDelete(true)} className="mt-5 inline-flex items-center gap-2 text-xs text-error underline underline-offset-4">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete this product…
                    </button>
                  )}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between border-t border-sand pt-5">
                <button type="button" onClick={() => setSection((s) => Math.max(0, s - 1))} disabled={section === 0} className="border border-sand px-5 py-2.5 text-xs uppercase tracking-[0.14em] disabled:opacity-40">← Back</button>
                {section < 4 ? (
                  <button type="button" onClick={() => setSection((s) => Math.min(4, s + 1))} className="bg-espresso px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-cream hover:bg-mocha">Continue →</button>
                ) : (
                  <button type="button" onClick={() => setPreview(true)} className="inline-flex items-center gap-2 border border-espresso px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-espresso"><Eye className="h-3.5 w-3.5" aria-hidden /> Preview product</button>
                )}
              </div>
            </div>
          )}

          {/* Sticky action bar */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-ivory/95 backdrop-blur">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
              <span className="mr-auto hidden text-xs text-mutedbrown sm:block">
                {Object.keys(errors).length ? <span className="text-error">{Object.keys(errors).length} field(s) need attention</span> : "All required fields look good"}
              </span>
              <button onClick={() => save(isNew ? "draft" : null)} disabled={saving} className="inline-flex items-center gap-1.5 border border-espresso px-4 py-2.5 text-xs font-medium text-espresso hover:bg-espresso hover:text-cream disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />} {isNew ? "Save Draft" : "Save"}
              </button>
              {!isNew && <button onClick={() => save("in-review")} disabled={saving} className="border border-sand px-4 py-2.5 text-xs text-warmgray hover:border-mocha disabled:opacity-50">Submit for Review</button>}
              <button onClick={() => save("published")} disabled={saving} className="inline-flex items-center gap-1.5 bg-espresso px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-cream hover:bg-mocha disabled:opacity-50">
                <Send className="h-3.5 w-3.5" aria-hidden /> {isNew ? "Save & Publish" : "Publish"}
              </button>
            </div>
          </div>

          {confirmDelete && existing && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-darkroast/55 p-4" role="alertdialog" aria-modal="true" aria-label="Delete product">
              <div className="w-full max-w-sm border border-sand bg-ivory p-6">
                <h2 className="font-display text-xl text-darkroast">Delete “{existing.name}”?</h2>
                <p className="mt-2 text-sm text-warmgray">Type DELETE to confirm. This cannot be undone in the demo.</p>
                <DeleteConfirm name={existing.name} onConfirm={() => { productCatalog.remove(existing.id); toast("Product deleted.", "info"); navigate("/admin/products"); }} onCancel={() => setConfirmDelete(false)} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-4">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Type DELETE" aria-label="Type DELETE to confirm" className="w-full border border-sand bg-white px-3 py-2.5 text-sm" />
      <div className="mt-4 flex gap-3">
        <button onClick={onConfirm} disabled={v !== "DELETE"} className="flex-1 bg-error py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-ivory disabled:opacity-40">Delete {name.slice(0, 12)}…</button>
        <button onClick={onCancel} className="flex-1 border border-sand py-2.5 text-xs uppercase tracking-[0.14em]">Cancel</button>
      </div>
    </div>
  );
}

function ProductPreview({ form, varietyBlurb }: { form: ProductInput; varietyBlurb?: string }) {
  const primary = form.images[0];
  const discount = form.originalPrice && form.originalPrice > form.price ? Math.round(((form.originalPrice - form.price) / form.originalPrice) * 100) : 0;
  const occasion = useMemo(() => form.occasion.map(occasionLabel), [form.occasion]);
  void occasion;
  return (
    <div className="border border-sand bg-white p-6 sm:p-8">
      <p className="mb-4 inline-block bg-mocha px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream">Storefront preview — not yet saved</p>
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          {primary ? <img src={primary} alt="Primary preview" className="aspect-[3/4] w-full rounded-card object-cover" /> : <div className="flex aspect-[3/4] items-center justify-center rounded-card bg-sand text-xs text-mutedbrown">No primary image</div>}
          {form.images.length > 1 && (
            <div className="mt-3 flex gap-2">{form.images.slice(1, 5).map((s, i) => <img key={i} src={s} alt="" className="h-16 w-12 object-cover" />)}</div>
          )}
        </div>
        <div>
          <p className="eyebrow">{form.variety || "Variety"} · {ZONES[0]}</p>
          <h2 className="mt-2 font-display text-3xl text-darkroast">{form.name || "Untitled saree"}</h2>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl text-darkroast">{inr(form.price || 0)}</span>
            {form.originalPrice ? <><span className="text-mutedbrown line-through">{inr(form.originalPrice)}</span><span className="text-sm font-medium text-terracotta">{discount}% off</span></> : null}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-warmgray">{form.description || varietyBlurb || "No description yet."}</p>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {[["Fabric", form.fabricDetail || form.fabric], ["Composition", form.composition], ["Loom", form.loom], ["Techniques", form.techniques.join(", ") || "—"], ["Colours", form.colours.join(", ") || "—"], ["Occasions", form.occasion.map(occasionLabel).join(", ") || "—"], ["Length", form.length || "—"], ["Stock", String(form.stock)]].map(([k, v]) => (
              <div key={k}><dt className="text-mutedbrown">{k}</dt><dd className="text-darkroast">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-6 flex gap-3">
            <span className="flex-1 bg-espresso py-3.5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-cream">Add to Cart</span>
            <span className="border border-espresso px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-espresso">Wishlist</span>
          </div>
        </div>
      </div>
    </div>
  );
}
