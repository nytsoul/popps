import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      const checkUpdate = () => registration.update().catch(() => undefined);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdate(registration);
        });
      });
      window.setInterval(checkUpdate, 60 * 60 * 1000);
    }).catch(() => {
      // A service worker is an enhancement; the storefront remains usable without it.
    });
  }, []);

  const install = async () => {
    if (!installEvent) return false;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === "accepted") setIsInstalled(true);
    return choice.outcome === "accepted";
  };

  const refresh = () => {
    update?.waiting?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  };

  return { canInstall: !!installEvent && !isInstalled, isInstalled, isOffline, install, hasUpdate: !!update, refresh };
}
