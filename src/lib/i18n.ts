import { createContext, useContext } from "react";

/* ===========================================================================
   Minimal EN/TA localisation infrastructure.
   `en` is complete for the covered chrome strings; `ta` covers the same keys
   (beta — catalogue content such as product names stays in its source language).
   To translate a new surface: add the key to both dictionaries and use t().
=========================================================================== */

export type Locale = "en" | "ta";

const en = {
  announcement_fallback: "Celebrate India's weaving heritage",
  nav_shop_all: "Shop All",
  nav_region: "By Region",
  nav_fabric: "By Fabric",
  nav_weave: "By Weave",
  nav_occasion: "By Occasion",
  nav_collections: "Collections",
  nav_stories: "Heritage Stories",
  nav_guide: "Fabric Guide",
  search_placeholder: "Search Kanjivaram, ikat, Bengal…",
  account: "Account",
  signin: "Sign in",
  wishlist: "Wishlist",
  bag: "Bag",
  hero_eyebrow: "ShopScale · World of Sarees",
  hero_cta_primary: "Explore Sarees",
  hero_cta_secondary: "Discover Our Heritage",
  footer_shop: "Shop by Category",
  footer_region: "Shop by Region",
  footer_help: "Heritage & Help",
  footer_newsletter: "A Note from ShopScale.",
  newsletter_subscribe: "Subscribe",
  compare: "Compare",
  view_details: "View Details",
  add_to_bag: "Add to Bag",
  language: "Language",
  tamil_beta: "Tamil (beta)",
};

export type I18nKey = keyof typeof en;

const ta: Record<I18nKey, string> = {
  announcement_fallback: "இந்திய நெசவு பாரம்பரியத்தைக் கொண்டாடுங்கள்",
  nav_shop_all: "அனைத்தும்",
  nav_region: "பிராந்தியம்",
  nav_fabric: "துணி வகை",
  nav_weave: "நெசவு முறை",
  nav_occasion: "சந்தர்ப்பம்",
  nav_collections: "தொகுப்புகள்",
  nav_stories: "பாரம்பரியக் கதைகள்",
  nav_guide: "துணி வழிகாட்டி",
  search_placeholder: "காஞ்சிபுரம், இக்கட், வங்காளம் தேடுக…",
  account: "கணக்கு",
  signin: "உள்நுழைக",
  wishlist: "விருப்பப் பட்டியல்",
  bag: "பை",
  hero_eyebrow: "ஷாப்ஸ்கேல் · புடவை உலகம்",
  hero_cta_primary: "புடவைகளைப் பார்க்க",
  hero_cta_secondary: "பாரம்பரியத்தை அறிக",
  footer_shop: "வகை வாரியாக",
  footer_region: "பிராந்தியம் வாரியாக",
  footer_help: "பாரம்பரியம் & உதவி",
  footer_newsletter: "ஷாப்ஸ்கேல் குறிப்பு.",
  newsletter_subscribe: "பதிவு",
  compare: "ஒப்பிடுக",
  view_details: "விவரங்கள்",
  add_to_bag: "பையில் சேர்",
  language: "மொழி",
  tamil_beta: "தமிழ் (பீட்டா)",
};

const DICTS: Record<Locale, Record<I18nKey, string>> = { en, ta };

export interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (k: I18nKey) => string;
}

export const LocaleContext = createContext<LocaleCtx>({
  locale: "en",
  setLocale: () => undefined,
  t: (k) => DICTS.en[k],
});

export const useLocale = () => useContext(LocaleContext);

export function makeT(locale: Locale) {
  return (k: I18nKey) => DICTS[locale][k] ?? DICTS.en[k];
}
