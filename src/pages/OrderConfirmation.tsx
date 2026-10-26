import { CheckCircle2, FlaskConical, Package } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/ui";
import { inr, shortDate } from "../lib/format";
import { orderService } from "../services";

export default function OrderConfirmation() {
  const { reference = "" } = useParams();
  const order = orderService.byReference(reference);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState title="Order not found" text="We couldn't find that order reference in this browser. Orders are stored locally." actionLabel="Back to Shop" actionTo="/shop" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 lg:py-20">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-olivesage/15 text-olivesage">
          <CheckCircle2 className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-4xl text-darkroast">Thank you, {order.address.fullName.split(" ")[0]}.</h1>
        <p className="mt-3 text-sm text-warmgray">Your order has been recorded. A confirmation would be emailed to <strong className="text-darkroast">{order.email}</strong> once email service is available.</p>
        <p className="mt-4 inline-block border border-sand bg-ivory px-5 py-2.5 font-mono text-sm tracking-wider text-espresso">{order.reference}</p>
      </div>

      {order.mock && (
        <p className="mt-6 flex items-start gap-2 border border-warning/50 bg-warning/10 p-3.5 text-xs text-warmgray">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          This order was created locally. No payment was taken and nothing will ship.
        </p>
      )}

      <div className="mt-8 border border-sand bg-ivory">
        <div className="border-b border-sand px-6 py-4">
          <h2 className="flex items-center gap-2 font-display text-xl text-darkroast"><Package className="h-5 w-5 text-mocha" aria-hidden /> Order Details</h2>
          <p className="mt-1 text-xs text-mutedbrown">Placed {shortDate(order.createdAt)} · Status: <span className="font-medium capitalize text-olivesage">{order.status.replace("_", " ")}</span></p>
        </div>
        <ul className="divide-y divide-sand px-6">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex items-center gap-4 py-4">
              <img src={i.image} alt="" className="h-16 w-12 rounded-sm object-cover" loading="lazy" />
              <div className="flex-1">
                <p className="text-sm font-medium text-darkroast">{i.name}</p>
                <p className="text-xs text-mutedbrown">{i.color} × {i.quantity}</p>
              </div>
              <p className="text-sm font-medium">{inr(i.price * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-sand px-6 py-4 text-sm">
          <div className="flex justify-between"><dt className="text-warmgray">Subtotal</dt><dd>{inr(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-warmgray">Shipping</dt><dd>{order.shipping === 0 ? "Free" : inr(order.shipping)}</dd></div>
          {order.gift?.wrap && <div className="flex justify-between"><dt className="text-warmgray">Gift wrap</dt><dd>Yes{order.gift.message ? ` — “${order.gift.message}”` : ""}</dd></div>}
          {order.discount > 0 && <div className="flex justify-between"><dt className="text-warmgray">Discount</dt><dd className="text-olivesage">− {inr(order.discount)}</dd></div>}
          <div className="flex justify-between text-base font-semibold text-darkroast"><dt>Total</dt><dd>{inr(order.total)}</dd></div>
        </dl>
        <div className="border-t border-sand bg-cream/50 px-6 py-4 text-xs leading-relaxed text-warmgray">
          <strong className="text-darkroast">Shipping to:</strong> {order.address.fullName}, {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city}, {order.address.state} — {order.address.pincode}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link to={`/track?ref=${order.reference}&email=${encodeURIComponent(order.email)}`} className="bg-espresso px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-cream hover:bg-mocha">Track Order Live</Link>
        <Link to="/shop" className="border border-espresso px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-espresso hover:bg-espresso hover:text-cream">Continue Shopping</Link>
      </div>
    </div>
  );
}