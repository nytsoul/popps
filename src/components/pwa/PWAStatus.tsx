import { useState } from "react";
import { usePWA } from "../../hooks/usePWA";

export default function PWAStatus() {
  const { canInstall, isOffline, hasUpdate, install, refresh } = usePWA();
  const [dismissed, setDismissed] = useState(() => window.localStorage.getItem("shopscale.install-dismissed") === "1");

  return (
    <>
      {isOffline && (
        <div className="fixed inset-x-0 bottom-0 z-[120] flex items-center justify-center gap-3 bg-darkroast px-4 py-3 text-center text-xs text-cream" role="status">
          <span>You&apos;re offline. Cached catalogue pages remain available; checkout needs a connection.</span>
          <button type="button" onClick={() => window.location.reload()} className="font-semibold uppercase tracking-wider text-gold">Retry</button>
        </div>
      )}
      {canInstall && !dismissed && !isOffline && (
        <div className="fixed bottom-5 left-5 z-[110] max-w-xs rounded-sm bg-ivory p-4 shadow-lift ring-1 ring-sand">
          <p className="font-display text-lg text-darkroast">Take ShopScale with you</p>
          <p className="mt-1 text-xs leading-5 text-warmgray">Install the storefront for a faster, app-like experience.</p>
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={() => void install()} className="bg-espresso px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-cream">Install</button>
            <button type="button" onClick={() => { window.localStorage.setItem("shopscale.install-dismissed", "1"); setDismissed(true); }} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-warmgray">Not now</button>
          </div>
        </div>
      )}
      {hasUpdate && (
        <div className="fixed right-5 top-5 z-[110] rounded-sm bg-espresso px-4 py-3 text-xs text-cream shadow-lift">
          A new ShopScale version is ready.
          <button type="button" onClick={refresh} className="ml-3 font-semibold uppercase tracking-wider text-gold">Refresh</button>
        </div>
      )}
    </>
  );
}
