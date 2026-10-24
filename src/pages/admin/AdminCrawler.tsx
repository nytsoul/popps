import { Check, Loader2, Play, Radar, ShieldCheck, ShieldX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../../hooks/useStore";
import { shortDate } from "../../lib/format";
import { crawlerService } from "../../services";
import type { CrawlRun } from "../../types";
import { cn } from "../../utils/cn";
import { Panel, Stat, btn, btnSolid } from "./AdminLayout";

const STATUS: Record<CrawlRun["status"], string> = {
  queued: "bg-sand text-warmgray", running: "bg-info/10 text-info", completed: "bg-olivesage/15 text-olivesage",
  failed: "bg-error/10 text-error", blocked: "bg-terracotta/10 text-terracotta",
};

export default function AdminCrawler() {
  const { toast } = useStore();
  const [runs, setRuns] = useState<CrawlRun[]>(() => crawlerService.runs());
  const [seed, setSeed] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const running = runs.some((r) => r.status === "running");
    if (running && !timer.current) timer.current = window.setInterval(() => setRuns(crawlerService.tick()), 1500);
    if (!running && timer.current) { window.clearInterval(timer.current); timer.current = null; }
  }, [runs]);
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const start = async () => {
    try { const u = new URL(seed); if (!/^https?:$/.test(u.protocol)) throw new Error(); }
    catch { setErr("Enter a valid http(s) seed URL, e.g. https://partner-weaves.example/catalog"); return; }
    setErr(null); setStarting(true);
    const run = await crawlerService.start(seed.trim());
    setRuns(crawlerService.runs());
    toast(run.robotsAllowed ? "robots.txt allows crawling — job started." : "Blocked: robots.txt disallows this site. No pages were fetched.", run.robotsAllowed ? "success" : "error");
    setSeed(""); setStarting(false);
  };

  const totals = runs.reduce((a, r) => ({ d: a.d + r.discovered, p: a.p + r.processed, f: a.f + r.failed, dup: a.dup + r.duplicates, rev: a.rev + r.pendingReview, imp: a.imp + r.imported }), { d: 0, p: 0, f: 0, dup: 0, rev: 0, imp: 0 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-darkroast">Web Crawler</h1>
        <p className="mt-1 text-xs text-mutedbrown">Crawl approved public partner pages only. The crawler checks robots.txt, throttles its request rate, deduplicates URLs and products, and queues extracted items for manual review. Protected images and copyrighted descriptions are never imported without permission.</p>
      </header>
      <Panel title="Start a crawl job" subtitle='Simulated. Try a host containing "private" to see a robots.txt block.'>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <input value={seed} onChange={(e) => { setSeed(e.target.value); setErr(null); }} placeholder="https://partner-weaves.example/catalog" aria-label="Seed URL" aria-invalid={!!err}
              className={cn("w-full border bg-cream/40 px-3.5 py-2.5 text-sm", err ? "border-error" : "border-sand")} />
            {err && <p className="mt-1 text-xs text-error">{err}</p>}
          </div>
          <button onClick={start} disabled={starting} className={btnSolid}>{starting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />} Check robots.txt & start</button>
        </div>
        <ul className="mt-4 grid gap-2 text-[11px] text-warmgray sm:grid-cols-4">
          <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-olivesage" aria-hidden /> robots.txt respected</li>
          <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-olivesage" aria-hidden /> ≤ 1 req/s per host</li>
          <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-olivesage" aria-hidden /> URL & product dedupe</li>
          <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-olivesage" aria-hidden /> Manual review before import</li>
        </ul>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Discovered" value={totals.d.toLocaleString("en-IN")} />
        <Stat label="Processed" value={totals.p.toLocaleString("en-IN")} />
        <Stat label="Failed" value={String(totals.f)} tone="bad" />
        <Stat label="Duplicates" value={String(totals.dup)} />
        <Stat label="Pending review" value={String(totals.rev)} tone="warn" />
        <Stat label="Imported" value={String(totals.imp)} tone="good" />
      </div>
      {runs.filter((r) => r.status === "running").map((r) => (
        <div key={r.id} className="border border-info/40 bg-info/5 p-4">
          <p className="flex items-center gap-2 text-sm"><Radar className="h-4 w-4 animate-pulse text-info" aria-hidden /> Crawling {r.seed}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand"><div className="h-full bg-coffee transition-all duration-700" style={{ width: `${Math.min(100, (r.processed / 400) * 100)}%` }} /></div>
          <p className="mt-1.5 text-xs text-warmgray">{r.processed} processed · {r.discovered} discovered · {r.duplicates} duplicates skipped · {r.pendingReview} awaiting review</p>
        </div>
      ))}
      <Panel title="Crawl jobs & review queue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-mutedbrown"><tr>{["Seed", "Started", "robots.txt", "Status", "Discovered", "Processed", "Failed", "Dupes", "Review", "Imported", "Actions"].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-sand/70">
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="max-w-52 truncate py-2.5 pr-3 font-mono text-[11px] text-espresso">{r.seed}</td>
                  <td className="pr-3 text-warmgray">{shortDate(r.startedAt)}</td>
                  <td className="pr-3">{r.robotsAllowed ? <ShieldCheck className="h-4 w-4 text-olivesage" aria-label="Allowed" /> : <ShieldX className="h-4 w-4 text-terracotta" aria-label="Disallowed" />}</td>
                  <td className="pr-3"><span className={cn("px-2 py-0.5 text-[10px] font-medium capitalize", STATUS[r.status])}>{r.status}</span></td>
                  <td className="pr-3">{r.discovered}</td><td className="pr-3">{r.processed}</td><td className="pr-3 text-error">{r.failed}</td><td className="pr-3">{r.duplicates}</td>
                  <td className="pr-3 font-medium text-mocha">{r.pendingReview}</td><td className="pr-3 text-olivesage">{r.imported}</td>
                  <td className="whitespace-nowrap">
                    {r.pendingReview > 0 && r.status !== "running" ? (
                      <span className="flex gap-1.5">
                        <button onClick={() => { setRuns(crawlerService.approve(r.id, r.pendingReview)); toast(`Approved ${r.pendingReview} items for import (metadata only).`); }} className={btn}><Check className="h-3 w-3" aria-hidden /> Approve</button>
                        <button onClick={() => { setRuns(crawlerService.reject(r.id)); toast("Review queue cleared.", "info"); }} className={btn}><X className="h-3 w-3" aria-hidden /> Reject</button>
                      </span>
                    ) : <span className="text-mutedbrown">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}