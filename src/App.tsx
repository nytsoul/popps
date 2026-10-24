import { MotionConfig } from "framer-motion";
import { Suspense, lazy, useEffect } from "react";
import { HashRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import CartDrawer from "./components/cart/CartDrawer";
import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";
import QuickView from "./components/products/QuickView";
import ToastStack from "./components/ui/Toast";
import PWAStatus from "./components/pwa/PWAStatus";
import { StoreProvider } from "./hooks/useStore";

const named = <T extends Record<string, React.ComponentType>>(loader: () => Promise<T>, key: keyof T) =>
  lazy(() => loader().then((m) => ({ default: m[key] as React.ComponentType })));

const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const CartPage = lazy(() => import("./pages/CartPage"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Account = lazy(() => import("./pages/Account"));
const Auth = lazy(() => import("./pages/Auth"));
const ComparePage = lazy(() => import("./pages/Compare"));
import { CompareTray } from "./pages/Compare";
const GuidePage = lazy(() => import("./pages/Guide"));
const browse = () => import("./pages/Browse");
const RegionsPage = named(browse, "RegionsPage");
const FabricsPage = named(browse, "FabricsPage");
const TechniquesPage = named(browse, "TechniquesPage");
const OccasionsPage = named(browse, "OccasionsPage");
const CollectionsPage = named(browse, "CollectionsPage");
const content = () => import("./pages/Content");
const HeritagePage = named(content, "HeritagePage");
const StoriesPage = named(content, "StoriesPage");
const ContactPage = named(content, "ContactPage");
const TrackOrderPage = named(content, "TrackOrderPage");
const RateLimitedPage = named(content, "RateLimitedPage");
const ShortLinkRedirect = named(content, "ShortLinkRedirect");
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLayout").then((m) => ({ default: m.AdminLoginPage })));
const commerce = () => import("./pages/admin/AdminCommerce");
const AdminOverview = named(commerce, "AdminOverview");
const AdminCatalogue = named(commerce, "AdminCatalogue");
const AdminOrders = named(commerce, "AdminOrders");
const AdminLinks = named(commerce, "AdminLinks");
const lab = () => import("./pages/admin/AdminLab");
const AdminInfra = named(lab, "AdminInfra");
const AdminEvents = named(lab, "AdminEvents");
const AdminPerformance = named(lab, "AdminPerformance");
const AdminCrawler = lazy(() => import("./pages/admin/AdminCrawler"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminProductForm = lazy(() => import("./pages/admin/AdminProductForm"));
const AdminImporter = lazy(() => import("./pages/admin/AdminImporter"));
const manage = () => import("./pages/admin/AdminManage");
const AdminDashboard = named(manage, "AdminDashboard");
const AdminInventory = named(manage, "AdminInventory");
const AdminContent = named(manage, "AdminContent");
const AdminSupport = named(manage, "AdminSupport");

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [pathname]);
  return null;
}

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
      <div className="flex flex-col items-center gap-3">
        <span className="font-display text-2xl tracking-[0.06em] text-espresso">SHOPSCALE</span>
        <span className="h-0.5 w-24 overflow-hidden rounded-full bg-sand"><span className="skeleton block h-full w-full" /></span>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow">Lost the Thread</p>
      <h1 className="mt-3 font-display text-5xl text-darkroast">404</h1>
      <p className="mt-4 text-sm text-warmgray">This page has slipped off the loom. Let's weave you back to something beautiful.</p>
      <Link to="/" className="mt-8 inline-block bg-espresso px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-cream hover:bg-mocha">Return Home</Link>
    </div>
  );
}

function Storefront() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-espresso focus:px-4 focus:py-2 focus:text-cream">Skip to content</a>
      <Navbar />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/search" element={<Shop mode="search" />} />
            <Route path="/regions" element={<RegionsPage />} />
            <Route path="/fabrics" element={<FabricsPage />} />
            <Route path="/techniques" element={<TechniquesPage />} />
            <Route path="/occasions" element={<OccasionsPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation/:reference" element={<OrderConfirmation />} />
            <Route path="/track" element={<TrackOrderPage />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/account" element={<Account />} />
            <Route path="/login" element={<Auth mode="signin" />} />
            <Route path="/signin" element={<Navigate to="/login" replace />} />
            <Route path="/register" element={<Auth mode="register" />} />
            <Route path="/forgot-password" element={<Auth mode="signin" forgot />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/heritage" element={<HeritagePage />} />
            <Route path="/about" element={<Navigate to="/heritage" replace />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/rate-limited" element={<RateLimitedPage />} />
            <Route path="/s/:code" element={<ShortLinkRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <QuickView />
      <CompareTray />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <HashRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/new" element={<AdminProductForm />} />
                <Route path="products/:id/edit" element={<AdminProductForm />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="content" element={<AdminContent />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="overview" element={<AdminOverview />} />
                <Route path="catalogue" element={<AdminCatalogue />} />
                <Route path="links" element={<AdminLinks />} />
                <Route path="crawler" element={<AdminCrawler />} />
                <Route path="importer" element={<AdminImporter />} />
                <Route path="infra" element={<AdminInfra />} />
                <Route path="events" element={<AdminEvents />} />
                <Route path="performance" element={<AdminPerformance />} />
              </Route>
              <Route path="*" element={<Storefront />} />
            </Routes>
          </Suspense>
          <ToastStack />
          <PWAStatus />
        </HashRouter>
      </StoreProvider>
    </MotionConfig>
  );
}