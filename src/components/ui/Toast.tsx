import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useStore } from "../../hooks/useStore";

const icons = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-olivesage" aria-hidden />,
  error: <XCircle className="h-4 w-4 shrink-0 text-error" aria-hidden />,
  info: <Info className="h-4 w-4 shrink-0 text-info" aria-hidden />,
};

export default function ToastStack() {
  const { toasts, dismissToast } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-[90] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-auto flex items-center gap-3 rounded-card border border-sand bg-white px-4 py-3 shadow-lift"
          >
            {icons[t.kind]}
            <p className="flex-1 text-xs leading-relaxed text-darkroast">{t.message}</p>
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss notification" className="text-mutedbrown transition-colors hover:text-darkroast">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}