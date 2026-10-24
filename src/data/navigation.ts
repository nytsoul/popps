import { IMG, OCCASION_INFO, TECHNIQUE_GROUP, VARIETIES, img } from "./catalogue";
import type { Technique, TechniqueGroup, Zone } from "../types";

export interface NavLinkItem { label: string; to: string; note?: string }
export interface NavGroup { title: string; blurb: string; links: NavLinkItem[] }
export interface NavItem {
  label: string;
  to: string;
  groups?: NavGroup[];
  featured?: { title: string; caption: string; image: string; to: string };
  highlight?: boolean;
}

const q = (key: string, value: string) => `/shop?${key}=${encodeURIComponent(value)}`;
const statesIn = (zones: Zone[]) => [...new Set(VARIETIES.filter((v) => zones.includes(v.zone)).map((v) => v.state))];
const countVarieties = (state: string) => VARIETIES.filter((v) => v.state === state).length;

const regionGroup = (title: string, blurb: string, zones: Zone[]): NavGroup => ({
  title, blurb,
  links: statesIn(zones).map((s) => ({ label: s, to: q("state", s), note: `${countVarieties(s)} traditions` })),
});

const techniqueGroup = (group: TechniqueGroup, title: string, blurb: string): NavGroup => ({
  title, blurb,
  links: (Object.keys(TECHNIQUE_GROUP) as Technique[]).filter((t) => TECHNIQUE_GROUP[t] === group).map((t) => ({
    label: t, to: q(group === "Weave" ? "weave" : group === "Print & Dye" ? "print" : "embellishment", t),
  })),
});

export const NAV_ITEMS: NavItem[] = [
  { label: "Shop All", to: "/shop" },
  {
    label: "By Region",
    to: "/regions",
    groups: [
      regionGroup("South India", "Silks of temple towns and coastal cottons.", ["South India"]),
      regionGroup("West India", "Patola, Paithani, bandhani and blocks.", ["West India"]),
      regionGroup("East India", "Bengal, Odisha, Bihar and Jharkhand.", ["East India"]),
      regionGroup("Northeast India", "Muga, eri and contemporary inspirations.", ["Northeast India"]),
      regionGroup("North & Central", "Banarasi, Chanderi, chikankari and more.", ["North India", "Central India"]),
      regionGroup("Beyond India", "South Asian sarees and related drapes.", ["South Asia", "Southeast Asia"]),
    ],
    featured: { title: "Explore every region", caption: "An atlas of weaving traditions, state by state.", image: img(IMG.goldenTN, 480, 600), to: "/regions" },
  },
  {
    label: "By Fabric",
    to: "/fabrics",
    groups: [
      { title: "Silk Family", blurb: "Pure silks and wild silks — always labelled honestly.", links: ["Silk", "Tussar", "Muga", "Eri", "Organza", "Tissue"].map((f) => ({ label: f, to: q("fabric", f) })) },
      { title: "Cotton & Natural", blurb: "Breathable, everyday and hand-spun.", links: ["Cotton", "Khadi", "Linen", "Silk-Cotton"].map((f) => ({ label: f, to: q("fabric", f) })) },
      { title: "Flowing & Blended", blurb: "Fluid drapes for evenings and travel.", links: ["Chiffon", "Georgette", "Crepe", "Blended"].map((f) => ({ label: f, to: q("fabric", f) })) },
      {
        title: "By Composition", blurb: "Know exactly what you're buying.",
        links: [
          { label: "Pure fibre", to: q("composition", "Pure") }, { label: "Blends", to: q("composition", "Blend") },
          { label: "Natural fibre", to: q("composition", "Natural Fibre") }, { label: "Art silk / synthetic", to: q("composition", "Art Silk / Synthetic") },
          { label: "Handloom only", to: q("loom", "Handloom") }, { label: "Powerloom & machine", to: "/shop?loom=Powerloom&loom=Machine-woven" },
        ],
      },
    ],
    featured: { title: "A guide to saree fabrics", caption: "Pure silk, art silk, blends and handloom explained.", image: img(IMG.goldFabric, 480, 600), to: "/fabrics" },
  },
  {
    label: "By Technique",
    to: "/techniques",
    groups: [
      techniqueGroup("Weave", "Weaving Techniques", "Patterns built into the cloth on the loom."),
      techniqueGroup("Print & Dye", "Printing & Dyeing", "Colour and pattern applied to woven cloth."),
      techniqueGroup("Embroidery & Surface", "Embroidery & Surface", "Needlework and embellishment added after weaving."),
    ],
    featured: { title: "Craft & artisan stories", caption: "Ikat, jamdani, brocade, block printing and more.", image: img(IMG.handLoom, 480, 600), to: "/stories" },
  },
  {
    label: "By Occasion",
    to: "/occasions",
    groups: [{ title: "Styled for Every Moment", blurb: "From bridal heirlooms to summer cottons.", links: OCCASION_INFO.map((o) => ({ label: o.label, to: q("occasion", o.key), note: o.caption })) }],
    featured: { title: "The Bridal Edit", caption: "Kanchipuram, Banarasi, Paithani and heavy zari.", image: img(IMG.bengaliBride, 480, 600), to: q("occasion", "Wedding") },
  },
  {
    label: "Collections",
    to: "/collections",
    groups: [
      {
        title: "Curated", blurb: "Hand-picked edits from the atelier.",
        links: ["Bestsellers", "New Arrivals", "On Sale", "Premium", "Wedding", "Festive", "Sustainable", "Origin Verified", "Designer"].map((c) => ({ label: c, to: q("collection", c) })),
      },
      {
        title: "Saree Types A–Z", blurb: "Over 140 catalogued traditions.",
        links: [
          ...["Kanchipuram Silk", "Banarasi Silk", "Paithani", "Patan Patola", "Chanderi", "Pochampally Ikat", "Bengal Jamdani", "Kerala Kasavu"].map((v) => ({ label: v, to: q("variety", v) })),
          { label: "View all saree types →", to: "/collections" },
        ],
      },
      {
        title: "Beyond Borders", blurb: "South Asian sarees and related draping traditions.",
        links: [
          ...["Bangladesh", "Sri Lanka", "Pakistan", "Nepal"].map((c) => ({ label: c, to: q("country", c), note: "Sarees" })),
          { label: "Related Draping Traditions", to: q("kind", "Related Drape"), note: "Not sarees" },
        ],
      },
    ],
    featured: { title: "Patan Double Ikat Patola", caption: "A limited heirloom from Gujarat.", image: img(IMG.ornate, 480, 600), to: "/product/patan-double-ikat-patola" },
  },
  { label: "Fabric Guide", to: "/guide" },
  { label: "Heritage Stories", to: "/stories" },
  { label: "Sale", to: q("collection", "On Sale"), highlight: true },
];