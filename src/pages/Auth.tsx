import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { STORY_IMAGE_2 } from "../data/products";
import { useStore } from "../hooks/useStore";
import { isValidEmail } from "../lib/format";
import { authService } from "../services";
import { ApiError } from "../services/api";
import { cn } from "../utils/cn";

type Mode = "signin" | "register" | "forgot";

const input =
  "w-full border border-sand bg-ivory px-3.5 py-3 pr-11 text-sm text-darkroast placeholder:text-mutedbrown focus:border-mocha focus:outline-none";
const inputPlain =
  "w-full border border-sand bg-ivory px-3.5 py-3 text-sm text-darkroast placeholder:text-mutedbrown focus:border-mocha focus:outline-none";

function GoogleButton() {
  const { toast } = useStore();
  return (
    <button
      type="button"
      onClick={() => toast("Google sign-in is a visual placeholder in this prototype — please use email sign-in for the demo.", "info")}
      className="flex w-full items-center justify-center gap-2.5 border border-sand bg-white py-3 text-sm text-darkroast transition-colors hover:border-mocha"
      aria-label="Continue with Google (demo placeholder)"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c0 1.1-.8 2.7-2.4 3.8l-.1.3 3.4 2.6.2.1c2.1-1.9 3.9-4.8 3.9-9z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.2.1-3.5 2.7v.2C3.5 21.3 7.4 24 12 24z" />
        <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.3-3.4-2.6-.1.1C.6 8.9 0 10.3 0 12s.6 3.1 1.6 4.4l3.6-2z" />
        <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.5 2.7 1.6 6.6l3.6 2.8c1-2.8 3.7-4.7 6.8-4.7z" />
      </svg>
      Continue with Google
      <span className="border border-warning/50 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-warning">Demo</span>
    </button>
  );
}

export default function Auth({ mode: initial, forgot = false }: { mode: "signin" | "register"; forgot?: boolean }) {
  const { setUser, toast } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(forgot ? "forgot" : initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const isRegister = mode === "register";
  const isForgot = mode === "forgot";

  const switchMode = (m: Mode) => {
    setMode(m); setErrors({}); setApiError(null); setResetSent(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!isValidEmail(email)) er.email = "Enter a valid email address.";
    if (isForgot) {
      setErrors(er);
      if (Object.keys(er).length) return;
      setLoading(true);
      try {
        await authService.forgotPassword(email.trim());
        setResetSent(true);
      } catch (err) {
        setApiError(err instanceof ApiError ? err.message : "Could not send the reset link. Please try again.");
      } finally { setLoading(false); }
      return;
    }
    if (isRegister && name.trim().length < 2) er.name = "Please enter your full name.";
    if (password.length < 6) er.password = "Password must be at least 6 characters.";
    if (isRegister && confirm !== password) er.confirm = "Passwords do not match.";
    if (isRegister && !terms) er.terms = "Please accept the Terms & Privacy Policy to continue.";
    setErrors(er);
    setApiError(null);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      const user = isRegister
        ? await authService.register(name.trim(), email.trim(), password)
        : await authService.signIn(email.trim(), password);
      setUser(user);
      toast(`Welcome ${isRegister ? "to ShopScale" : "back"}, ${user.name}.`);
      navigate("/account");
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Authentication failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-0 px-4 py-10 lg:grid-cols-[1.1fr_1fr] lg:py-16">
      {/* Editorial panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src={STORY_IMAGE_2} alt="Weaver's hands at a traditional loom" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso/90 via-espresso/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="font-display text-2xl font-semibold tracking-[0.06em] text-ivory">SHOPSCALE</p>
          <p className="mt-1 font-display text-sm italic text-champagne">a world woven in tradition</p>
          <p className="mt-4 max-w-sm font-display text-3xl leading-snug text-ivory">
            {isRegister ? "Begin your collection." : isForgot ? "We'll help you back in." : "Welcome Back."}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-champagne">
            {isRegister
              ? "Save sarees to your wishlist, track orders and check out faster."
              : isForgot
                ? "Enter your account email and we'll send a demo reset link."
                : "Continue discovering timeless sarees and beautiful traditions."}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="border border-sand bg-ivory p-7 sm:p-10 lg:border-l-0">
        <p className="eyebrow">{isRegister ? "Join ShopScale" : isForgot ? "Reset Password" : "Customer Login"}</p>
        <h1 className="mt-2 font-display text-3xl text-darkroast">
          {isRegister ? "Create your account" : isForgot ? "Forgot password" : "Welcome Back"}
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-mutedbrown">
          Demo authentication — accounts live only in this browser. Any email with a 6+ character password works. No real credentials are verified.
        </p>

        {isForgot && resetSent ? (
          <div className="mt-7 border border-olivesage/40 bg-olivesage/10 p-6 text-center" role="status">
            <CheckCircle2 className="mx-auto h-9 w-9 text-olivesage" aria-hidden />
            <p className="mt-3 font-display text-xl text-darkroast">Reset link sent (demo)</p>
            <p className="mt-2 text-sm text-warmgray">
              If <strong>{email}</strong> had an account, a reset email would arrive shortly. In this prototype no email is sent.
            </p>
            <button onClick={() => switchMode("signin")} className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-espresso underline underline-offset-4">
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-7 space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="auth-name" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Full name *</label>
                <input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} className={inputPlain} placeholder="Asha Iyer" autoComplete="name" aria-invalid={!!errors.name} />
                {errors.name && <p className="mt-1 text-xs text-error">{errors.name}</p>}
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Email *</label>
              <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputPlain} placeholder="you@example.com" autoComplete="email" aria-invalid={!!errors.email} />
              {errors.email && <p className="mt-1 text-xs text-error">{errors.email}</p>}
            </div>
            {!isForgot && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="auth-password" className="block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Password *</label>
                  {!isRegister && (
                    <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-mocha underline underline-offset-4">Forgot password?</button>
                  )}
                </div>
                <div className="relative">
                  <input id="auth-password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={input} placeholder="At least 6 characters" autoComplete={isRegister ? "new-password" : "current-password"} aria-invalid={!!errors.password} />
                  <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedbrown hover:text-darkroast">
                    {showPw ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-error">{errors.password}</p>}
              </div>
            )}
            {isRegister && (
              <div>
                <label htmlFor="auth-confirm" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Confirm password *</label>
                <div className="relative">
                  <input id="auth-confirm" type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} placeholder="Repeat your password" autoComplete="new-password" aria-invalid={!!errors.confirm} />
                  <button type="button" onClick={() => setShowConfirm((s) => !s)} aria-label={showConfirm ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedbrown hover:text-darkroast">
                    {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
                {errors.confirm && <p className="mt-1 text-xs text-error">{errors.confirm}</p>}
              </div>
            )}
            {!isForgot && (
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-warmgray">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-espresso" />
                Remember me on this device {remember ? "" : <span className="text-[11px] text-mutedbrown">(demo — sessions always persist locally)</span>}
              </label>
            )}
            {isRegister && (
              <div>
                <label className="flex cursor-start items-start gap-2.5 text-xs leading-relaxed text-warmgray">
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-espresso" aria-invalid={!!errors.terms} />
                  <span>I accept the <Link to="/heritage#legal" className="text-espresso underline underline-offset-2">Terms of Service</Link> and <Link to="/heritage#legal" className="text-espresso underline underline-offset-2">Privacy Policy</Link> (demo).</span>
                </label>
                {errors.terms && <p className="mt-1 text-xs text-error">{errors.terms}</p>}
              </div>
            )}
            {apiError && (
              <p role="alert" className="flex items-start gap-2 border border-error/40 bg-error/5 p-3 text-xs text-error">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {apiError}
              </p>
            )}
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 bg-espresso py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-cream transition-colors hover:bg-mocha disabled:opacity-70">
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isForgot ? "Send Reset Link" : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>
        )}

        {!resetSent && (
          <>
            {!isForgot && (
              <>
                <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-mutedbrown" aria-hidden>
                  <span className="h-px flex-1 bg-sand" /> or <span className="h-px flex-1 bg-sand" />
                </div>
                <GoogleButton />
              </>
            )}
            <p className="mt-6 text-center text-xs text-warmgray">
              {isRegister ? (
                <>Already have an account? <button onClick={() => switchMode("signin")} className="font-medium text-espresso underline underline-offset-4">Sign in</button></>
              ) : isForgot ? (
                <>Remembered it? <button onClick={() => switchMode("signin")} className="font-medium text-espresso underline underline-offset-4">Sign in</button></>
              ) : (
                <>New to ShopScale? <button onClick={() => switchMode("register")} className="font-medium text-espresso underline underline-offset-4">Create an account</button></>
              )}
            </p>
          </>
        )}

        <Link to="/shop" className={cn("mt-8 flex items-center justify-center gap-2 text-xs text-mutedbrown hover:text-espresso")}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to Shopping
        </Link>
      </div>
    </div>
  );
}
