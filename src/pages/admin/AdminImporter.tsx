/**
 * AdminImporter — Saree Dataset Importer
 * 4-step wizard:
 *   1. Upload (ZIP + optional metadata CSV/JSON)
 *   2. Scan results & summary
 *   3. Preview gallery — review / edit each item
 *   4. Commit & import report
 */
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  FileImage,
  FileJson,
  FilePlus2,
  FileText,
  Filter,
  Grid3X3,
  ImageOff,
  Info,
  Loader2,
  Package,
  RefreshCw,
  SkipForward,
  Trash2,
  Upload,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, btn, btnSolid } from "./AdminLayout";
import { cn } from "../../utils/cn";

const API = "/api/v1";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImportJob {
  id: string;
  name: string;
  status: string;
  source_filename: string | null;
  metadata_filename: string | null;
  total_images: number;
  valid_images: number;
  duplicate_images: number;
  invalid_images: number;
  metadata_errors: number;
  imported_count: number;
  skipped_count: number;
  error_log: string[];
  created_at: string | null;
}

interface ImportItem {
  id: string;
  job_id: string;
  original_filename: string;
  storage_key: string | null;
  image_url: string | null;
  file_hash: string | null;
  file_size_bytes: number | null;
  image_width: number | null;
  image_height: number | null;
  product_name: string | null;
  category: string | null;
  colour: string | null;
  fabric: string | null;
  region: string | null;
  technique: string | null;
  admin_note: string | null;
  review_status: string;
  is_unverified: boolean;
  is_duplicate: boolean;
  duplicate_of_hash: string | null;
  product_id: string | null;
}

interface ItemsPage {
  total: number;
  page: number;
  page_size: number;
  items: ImportItem[];
}

// ── API helpers ───────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem("ss_access_token");
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: "Pending",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
    approved:   { label: "Approved",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected:   { label: "Rejected",   cls: "bg-red-50 text-red-600 border-red-200" },
    duplicate:  { label: "Duplicate",  cls: "bg-purple-50 text-purple-700 border-purple-200" },
    invalid:    { label: "Invalid",    cls: "bg-gray-100 text-gray-500 border-gray-200" },
    imported:   { label: "Imported ✓", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    scanning:   { label: "Scanning…",  cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    ready:      { label: "Ready",      cls: "bg-teal-50 text-teal-700 border-teal-200" },
    committing: { label: "Committing", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    done:       { label: "Done ✓",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    failed:     { label: "Failed",     cls: "bg-red-50 text-red-600 border-red-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={cn("inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", cls)}>
      {label}
    </span>
  );
}

function FileSizeBadge({ bytes }: { bytes: number | null }) {
  if (bytes == null) return null;
  const kb = bytes / 1024;
  const text = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  return <span className="text-[10px] text-warmgray">{text}</span>;
}

function ScanSummaryCard({ job }: { job: ImportJob }) {
  const stats = [
    { label: "Total images", value: job.total_images, icon: FileImage, tone: "neutral" as const },
    { label: "Valid & unique", value: job.valid_images, icon: CheckCircle2, tone: "good" as const },
    { label: "Duplicates", value: job.duplicate_images, icon: Copy, tone: job.duplicate_images > 0 ? "warn" as const : "neutral" as const },
    { label: "Invalid / corrupt", value: job.invalid_images, icon: XCircle, tone: job.invalid_images > 0 ? "bad" as const : "neutral" as const },
    { label: "Missing metadata", value: job.metadata_errors, icon: AlertTriangle, tone: job.metadata_errors > 0 ? "warn" as const : "neutral" as const },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {stats.map(({ label, value, icon: Icon, tone }) => (
        <div
          key={label}
          className={cn(
            "flex flex-col gap-1 border p-3",
            tone === "good" ? "border-emerald-200 bg-emerald-50" :
            tone === "warn" ? "border-amber-200 bg-amber-50" :
            tone === "bad"  ? "border-red-200 bg-red-50" :
            "border-sand bg-white"
          )}
        >
          <Icon className={cn("h-4 w-4", tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : tone === "bad" ? "text-red-500" : "text-mutedbrown")} />
          <span className={cn("font-display text-2xl", tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : tone === "bad" ? "text-red-700" : "text-darkroast")}>{value}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-mutedbrown">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Item Edit Drawer ──────────────────────────────────────────────────────────

function ItemDrawer({
  item,
  onClose,
  onSave,
}: {
  item: ImportItem;
  onClose: () => void;
  onSave: (updated: ImportItem) => void;
}) {
  const [form, setForm] = useState({
    product_name: item.product_name || "",
    category: item.category || "",
    colour: item.colour || "",
    fabric: item.fabric || "",
    region: item.region || "",
    technique: item.technique || "",
    admin_note: item.admin_note || "",
    review_status: item.review_status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await apiJson<ImportItem>(
        `/admin/importer/jobs/${item.job_id}/items/${item.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }
      );
      onSave(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof typeof form, label: string, placeholder = "") => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-mutedbrown">{label}</label>
      <input
        className="border border-sand bg-cream px-3 py-1.5 text-xs text-darkroast placeholder:text-mutedbrown focus:border-espresso focus:outline-none"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="flex h-full w-full max-w-md flex-col overflow-auto bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-sand bg-cream p-4">
          <div>
            <h3 className="font-display text-base text-darkroast">Edit Import Item</h3>
            <p className="mt-0.5 text-[10px] text-mutedbrown truncate max-w-[280px]">{item.original_filename}</p>
          </div>
          <button onClick={onClose} className="text-mutedbrown hover:text-espresso"><X className="h-5 w-5" /></button>
        </div>

        {/* Image preview */}
        {item.image_url ? (
          <img src={item.image_url} alt={item.original_filename} className="h-48 w-full object-contain bg-sand/30" />
        ) : (
          <div className="flex h-48 items-center justify-center bg-sand/20">
            <ImageOff className="h-10 w-10 text-mutedbrown" />
          </div>
        )}

        {/* Form */}
        <div className="flex flex-col gap-3 p-4">
          {item.is_unverified && (
            <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span><strong>Unverified metadata.</strong> No metadata matched this file. Fill in the fields below or reject this item.</span>
            </div>
          )}
          {item.is_duplicate && (
            <div className="flex items-start gap-2 border border-purple-200 bg-purple-50 p-3 text-xs text-purple-700">
              <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span><strong>Possible duplicate.</strong> A file with the same content hash was already detected.</span>
            </div>
          )}

          {field("product_name", "Product Name", "e.g. Kanchipuram Silk Saree")}
          {field("category", "Category / Type", "e.g. Banarasi, Patola, Chikankari")}
          {field("colour", "Primary Colour", "e.g. Crimson, Ivory, Teal")}
          {field("fabric", "Fabric / Material", "e.g. Pure Silk, Cotton, Chanderi")}
          {field("region", "Region / State", "e.g. Tamil Nadu, Uttar Pradesh")}
          {field("technique", "Technique", "e.g. Zari, Block Print, Handloom")}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-mutedbrown">Admin Note</label>
            <textarea
              className="border border-sand bg-cream px-3 py-1.5 text-xs text-darkroast placeholder:text-mutedbrown focus:border-espresso focus:outline-none resize-none"
              rows={2}
              value={form.admin_note}
              onChange={(e) => setForm((f) => ({ ...f, admin_note: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-mutedbrown">Review Decision</label>
            <select
              className="border border-sand bg-cream px-3 py-1.5 text-xs text-darkroast focus:border-espresso focus:outline-none"
              value={form.review_status}
              onChange={(e) => setForm((f) => ({ ...f, review_status: e.target.value }))}
            >
              <option value="pending">Pending review</option>
              <option value="approved">Approved — include in import</option>
              <option value="rejected">Rejected — skip</option>
            </select>
          </div>

          {/* Image meta */}
          <div className="rounded border border-sand bg-sand/20 p-3 text-[11px] text-mutedbrown space-y-0.5">
            <div className="flex gap-2"><span className="w-24 text-[10px] uppercase tracking-wider">Filename</span><span className="truncate">{item.original_filename}</span></div>
            {item.image_width && <div className="flex gap-2"><span className="w-24 text-[10px] uppercase tracking-wider">Dimensions</span><span>{item.image_width}×{item.image_height}px</span></div>}
            {item.file_size_bytes && <div className="flex gap-2"><span className="w-24 text-[10px] uppercase tracking-wider">Size</span><FileSizeBadge bytes={item.file_size_bytes} /></div>}
            {item.file_hash && <div className="flex gap-2"><span className="w-24 text-[10px] uppercase tracking-wider">SHA-256</span><span className="truncate font-mono text-[9px]">{item.file_hash.slice(0, 16)}…</span></div>}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2 border-t border-sand p-4">
          <button onClick={onClose} className={cn(btn, "flex-1")}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={cn(btnSolid, "flex-1")}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Gallery card ──────────────────────────────────────────────────────────────

function ItemCard({
  item,
  onEdit,
  onQuickApprove,
  onQuickReject,
}: {
  item: ImportItem;
  onEdit: () => void;
  onQuickApprove: () => void;
  onQuickReject: () => void;
}) {
  const statusColors: Record<string, string> = {
    approved: "ring-2 ring-emerald-400",
    rejected: "ring-2 ring-red-400 opacity-60",
    duplicate: "ring-2 ring-purple-400",
    invalid: "ring-2 ring-gray-300 opacity-50",
    pending: "",
    imported: "ring-2 ring-blue-400",
  };

  return (
    <div className={cn("group relative flex flex-col border border-sand bg-white overflow-hidden transition-shadow hover:shadow-md", statusColors[item.review_status])}>
      {/* Image */}
      <div className="relative aspect-[3/4] bg-sand/30 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.original_filename}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageOff className="h-8 w-8 text-mutedbrown/40" />
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors">
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="flex items-center gap-1 bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold text-espresso shadow hover:bg-white"
            >
              <Eye className="h-3 w-3" /> Edit
            </button>
          </div>
        </div>

        {/* Status badge top-right */}
        <div className="absolute top-1.5 right-1.5">
          <StatusBadge status={item.review_status} />
        </div>

        {/* Unverified flag */}
        {item.is_unverified && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <AlertTriangle className="h-2.5 w-2.5" /> UNVERIFIED
          </div>
        )}
        {item.is_duplicate && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-purple-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <Copy className="h-2.5 w-2.5" /> DUP
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-2 gap-0.5">
        <p className="text-[11px] font-semibold text-darkroast truncate">{item.product_name || <span className="italic text-mutedbrown">No name</span>}</p>
        {item.category && <p className="text-[10px] text-mutedbrown truncate">{item.category}</p>}
        {item.colour && <p className="text-[10px] text-mutedbrown">{item.colour}{item.fabric ? ` · ${item.fabric}` : ""}</p>}
        {item.region && <p className="text-[10px] text-mutedbrown truncate">{item.region}</p>}
        <p className="text-[9px] text-mutedbrown/60 truncate mt-0.5">{item.original_filename}</p>
      </div>

      {/* Quick action buttons */}
      {item.review_status !== "imported" && item.review_status !== "invalid" && (
        <div className="flex border-t border-sand">
          <button
            onClick={onQuickApprove}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 py-1.5 text-[10px] font-semibold transition-colors",
              item.review_status === "approved"
                ? "bg-emerald-100 text-emerald-700"
                : "text-emerald-600 hover:bg-emerald-50"
            )}
          >
            <CheckCircle2 className="h-3 w-3" />
            {item.review_status === "approved" ? "Approved" : "Approve"}
          </button>
          <div className="w-px bg-sand" />
          <button
            onClick={onQuickReject}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 py-1.5 text-[10px] font-semibold transition-colors",
              item.review_status === "rejected"
                ? "bg-red-100 text-red-700"
                : "text-red-600 hover:bg-red-50"
            )}
          >
            <XCircle className="h-3 w-3" />
            {item.review_status === "rejected" ? "Rejected" : "Reject"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminImporter() {
  const [step, setStep] = useState<"upload" | "scan" | "gallery" | "report">("upload");
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Upload form
  const [jobName, setJobName] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [metaFile, setMetaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Gallery
  const [items, setItems] = useState<ImportItem[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<ImportItem | null>(null);

  // Bulk actions
  const [bulkLoading, setBulkLoading] = useState(false);

  // Commit
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);

  const zipRef = useRef<HTMLInputElement>(null);
  const metaRef = useRef<HTMLInputElement>(null);

  // ── Fetch job list ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setJobsLoading(true);
    try {
      const list = await apiJson<ImportJob[]>("/admin/importer/jobs");
      setJobs(list);
    } catch {
      // ignore — user might not be logged in yet
    } finally {
      setJobsLoading(false);
    }
  }

  // ── Fetch gallery ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeJob && step === "gallery") {
      fetchItems();
    }
  }, [activeJob, galleryPage, galleryFilter, step]);

  async function fetchItems() {
    if (!activeJob) return;
    setGalleryLoading(true);
    try {
      const params = new URLSearchParams({ page: String(galleryPage), page_size: "48" });
      if (galleryFilter !== "all") params.set("status", galleryFilter);
      const data = await apiJson<ItemsPage>(`/admin/importer/jobs/${activeJob.id}/items?${params}`);
      setItems(data.items);
      setItemsTotal(data.total);
    } catch (e: any) {
      console.error(e);
    } finally {
      setGalleryLoading(false);
    }
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!zipFile) { setUploadError("Please select a ZIP file."); return; }
    if (!jobName.trim()) { setUploadError("Please enter a job name."); return; }
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("name", jobName.trim());
      fd.append("zip_file", zipFile);
      if (metaFile) fd.append("metadata_file", metaFile);

      const job = await fetch(`${API}/admin/importer/jobs`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.detail || `HTTP ${r.status}`);
        }
        return r.json() as Promise<ImportJob>;
      });

      setActiveJob(job);
      setJobs((prev) => [job, ...prev]);
      setStep("scan");
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  }

  // ── Quick item update ───────────────────────────────────────────────────────
  async function quickUpdateItem(item: ImportItem, status: string) {
    try {
      const updated = await apiJson<ImportItem>(
        `/admin/importer/jobs/${item.job_id}/items/${item.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ review_status: status }) }
      );
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e: any) {
      console.error(e);
    }
  }

  // ── Bulk action ─────────────────────────────────────────────────────────────
  async function bulkAction(action: "approve" | "reject", filter: string) {
    if (!activeJob) return;
    setBulkLoading(true);
    try {
      await apiJson(`/admin/importer/jobs/${activeJob.id}/items/bulk-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, filter }),
      });
      await fetchItems();
    } catch (e: any) {
      console.error(e);
    } finally {
      setBulkLoading(false);
    }
  }

  // ── Commit ──────────────────────────────────────────────────────────────────
  async function handleCommit() {
    if (!activeJob) return;
    setCommitting(true);
    try {
      const result = await apiJson(`/admin/importer/jobs/${activeJob.id}/commit`, { method: "POST" });
      setCommitResult(result);
      setStep("report");
      fetchJobs();
    } catch (e: any) {
      setCommitResult({ error: e.message });
      setStep("report");
    } finally {
      setCommitting(false);
    }
  }

  // ── Delete job ──────────────────────────────────────────────────────────────
  async function deleteJob(jobId: string) {
    if (!confirm("Delete this import job and all its staged images?")) return;
    try {
      await fetch(`${API}/admin/importer/jobs/${jobId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      if (activeJob?.id === jobId) {
        setActiveJob(null);
        setStep("upload");
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  // ── Approved count ─────────────────────────────────────────────────────────
  const approvedCount = items.filter((i) => i.review_status === "approved").length;

  // ── Steps indicator ─────────────────────────────────────────────────────────
  const STEPS = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "scan", label: "Scan Results", icon: Zap },
    { id: "gallery", label: "Review Gallery", icon: Grid3X3 },
    { id: "report", label: "Import Report", icon: FileText },
  ];

  // ── Drag-drop ───────────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".zip")) setZipFile(file);
  }, []);

  return (
    <div className="space-y-6 pb-16">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-darkroast">Saree Dataset Importer</h1>
          <p className="mt-1 text-xs text-mutedbrown max-w-2xl">
            Import images and metadata from a ZIP archive. All imported products land as{" "}
            <strong>drafts</strong> — nothing is auto-published. Images without matching metadata are
            flagged <em>"Unverified — needs review"</em>.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-mutedbrown border border-sand bg-sand/30 px-3 py-2">
          <Info className="h-3.5 w-3.5 text-mocha shrink-0" />
          <span>Dataset images are never treated as verified commercial claims. Price and authenticity must be set manually.</span>
        </div>
      </div>

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-0 overflow-x-auto">
        {STEPS.map((s, idx) => {
          const isActive = s.id === step;
          const isPast = STEPS.findIndex((x) => x.id === step) > idx;
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                  isActive ? "bg-espresso text-cream" :
                  isPast   ? "bg-espresso/20 text-espresso cursor-pointer" : "bg-sand/40 text-mutedbrown"
                )}
                onClick={() => isPast && setStep(s.id as any)}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              {idx < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-mutedbrown/40 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════
          STEP 1: UPLOAD
      ════════════════════════════════════════════ */}
      {step === "upload" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Panel title="Upload Dataset" subtitle="Upload a ZIP archive of saree images + optional metadata file">
            <div className="space-y-4">
              {/* Job name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-mutedbrown">Import Job Name *</label>
                <input
                  className="border border-sand bg-cream px-3 py-2 text-sm text-darkroast placeholder:text-mutedbrown focus:border-espresso focus:outline-none"
                  placeholder="e.g. Hugging Face Saree Dataset — Oct 2024"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                />
              </div>

              {/* ZIP drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => zipRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-10 text-center transition-colors",
                  dragging ? "border-espresso bg-espresso/5" : "border-sand hover:border-espresso/40 hover:bg-sand/20"
                )}
              >
                <input ref={zipRef} type="file" accept=".zip" className="hidden" onChange={(e) => setZipFile(e.target.files?.[0] || null)} />
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", zipFile ? "bg-espresso text-cream" : "bg-sand/60 text-mutedbrown")}>
                  {zipFile ? <CheckCircle2 className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                </div>
                {zipFile ? (
                  <div>
                    <p className="font-semibold text-espresso text-sm">{zipFile.name}</p>
                    <p className="text-xs text-mutedbrown">{(zipFile.size / (1024 * 1024)).toFixed(1)} MB · Click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-darkroast text-sm">Drop ZIP archive here</p>
                    <p className="text-xs text-mutedbrown">or click to browse · JPG, PNG, WebP images inside</p>
                  </div>
                )}
              </div>

              {/* Metadata file */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-mutedbrown">
                  Metadata File <span className="normal-case font-normal">(optional — CSV or JSON)</span>
                </label>
                <div
                  onClick={() => metaRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 border border-sand p-3 text-sm transition-colors hover:border-espresso/40 hover:bg-sand/10",
                    metaFile ? "text-darkroast" : "text-mutedbrown"
                  )}
                >
                  <input ref={metaRef} type="file" accept=".csv,.json" className="hidden" onChange={(e) => setMetaFile(e.target.files?.[0] || null)} />
                  {metaFile ? <FileJson className="h-4 w-4 text-espresso" /> : <FilePlus2 className="h-4 w-4 text-mutedbrown" />}
                  {metaFile ? (
                    <span className="flex-1 truncate">{metaFile.name} <span className="text-xs text-mutedbrown">({(metaFile.size / 1024).toFixed(0)} KB)</span></span>
                  ) : (
                    <span className="flex-1">Click to attach metadata CSV / JSON</span>
                  )}
                  {metaFile && (
                    <button onClick={(e) => { e.stopPropagation(); setMetaFile(null); }} className="text-mutedbrown hover:text-espresso">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-mutedbrown">
                  Expected columns: <code className="bg-sand/40 px-1 text-[9px]">name / product_name</code> <code className="bg-sand/40 px-1 text-[9px]">category</code> <code className="bg-sand/40 px-1 text-[9px]">colour</code> <code className="bg-sand/40 px-1 text-[9px]">fabric</code> <code className="bg-sand/40 px-1 text-[9px]">region</code> <code className="bg-sand/40 px-1 text-[9px]">technique</code>
                </p>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {uploadError}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading || !zipFile || !jobName.trim()}
                className={cn(btnSolid, "w-full justify-center py-3 text-sm gap-2")}
              >
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading & Scanning…</> : <><Upload className="h-4 w-4" /> Upload & Scan Images</>}
              </button>
            </div>
          </Panel>

          {/* Past jobs sidebar */}
          <Panel title="Previous Imports" subtitle="Resume or review a past import job">
            {jobsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-mutedbrown" /></div>
            ) : jobs.length === 0 ? (
              <p className="text-xs text-mutedbrown py-4 text-center">No import jobs yet.</p>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => (
                  <div key={job.id} className="border border-sand p-3 hover:border-espresso/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-darkroast truncate">{job.name}</p>
                        <p className="text-[10px] text-mutedbrown">{job.total_images} images · {job.created_at ? new Date(job.created_at).toLocaleDateString() : ""}</p>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        onClick={() => { setActiveJob(job); setStep(job.status === "done" ? "report" : "scan"); }}
                        className={cn(btn, "flex-1 text-[10px] py-1")}
                      >
                        <Eye className="h-3 w-3" /> Open
                      </button>
                      <button onClick={() => deleteJob(job.id)} className="border border-red-200 p-1 text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ════════════════════════════════════════════
          STEP 2: SCAN RESULTS
      ════════════════════════════════════════════ */}
      {step === "scan" && activeJob && (
        <div className="space-y-6">
          <Panel title={`Scan Results — ${activeJob.name}`} subtitle="Review the analysis before proceeding to the gallery">
            <ScanSummaryCard job={activeJob} />

            {activeJob.error_log.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-mutedbrown">Scan Warnings / Errors ({activeJob.error_log.length})</p>
                <div className="max-h-40 overflow-auto border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-800 space-y-0.5 font-mono">
                  {activeJob.error_log.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => { setGalleryPage(1); setGalleryFilter("all"); setStep("gallery"); }} className={cn(btnSolid, "gap-2")}>
                <Grid3X3 className="h-4 w-4" /> Open Review Gallery
              </button>
              <button onClick={() => setStep("upload")} className={cn(btn, "gap-2")}>
                <ChevronLeft className="h-4 w-4" /> Back to Upload
              </button>
            </div>
          </Panel>

          {/* Info banner */}
          <div className="border border-sand/80 bg-cream p-4 text-xs text-mutedbrown">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-mocha" />
              <div>
                <strong className="text-darkroast">What happens next?</strong>
                <p className="mt-1">In the gallery you can approve, reject, or edit each image individually. Duplicate and invalid images are pre-flagged. Once you're satisfied, click <strong>Commit Import</strong> to create draft products for all approved items. Draft products must be manually published by an admin — they will never appear on the storefront automatically.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          STEP 3: GALLERY
      ════════════════════════════════════════════ */}
      {step === "gallery" && activeJob && (
        <div className="space-y-4">
          {/* Gallery controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border border-sand bg-cream p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-mutedbrown" />
              {["all", "pending", "approved", "rejected", "duplicate", "invalid"].map((f) => (
                <button
                  key={f}
                  onClick={() => { setGalleryFilter(f); setGalleryPage(1); }}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors border",
                    galleryFilter === f ? "border-espresso bg-espresso text-cream" : "border-sand text-mutedbrown hover:border-espresso/40"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {bulkLoading && <Loader2 className="h-4 w-4 animate-spin text-mutedbrown" />}
              <button onClick={() => bulkAction("approve", "pending")} disabled={bulkLoading} className={cn(btn, "text-[10px] gap-1 py-1")}>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Approve All Pending
              </button>
              <button onClick={() => bulkAction("reject", "duplicate")} disabled={bulkLoading} className={cn(btn, "text-[10px] gap-1 py-1")}>
                <SkipForward className="h-3 w-3 text-purple-500" /> Reject All Duplicates
              </button>
              <button onClick={fetchItems} className={cn(btn, "text-[10px] gap-1 py-1")}>
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
          </div>

          {/* Approved counter + commit bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="text-sm text-emerald-700">
              <strong>{approvedCount}</strong> item{approvedCount !== 1 ? "s" : ""} approved on this page
              {" · "}
              <span className="text-[11px] text-mutedbrown">Total gallery: {itemsTotal}</span>
            </div>
            <button
              onClick={handleCommit}
              disabled={committing}
              className={cn(btnSolid, "gap-2 bg-emerald-700 hover:bg-emerald-800")}
            >
              {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              Commit Import → Create Draft Products
            </button>
          </div>

          {/* Unverified warning */}
          {items.some((i) => i.is_unverified && i.review_status !== "rejected") && (
            <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Some items have unverified metadata.</strong> These will be imported as
                "Unverified — needs review" drafts. Price, authenticity, and saree type must be
                verified by an admin before publishing. <em>Dataset labels are not commercial claims.</em>
              </div>
            </div>
          )}

          {/* Grid */}
          {galleryLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-mutedbrown" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditingItem(item)}
                  onQuickApprove={() => quickUpdateItem(item, item.review_status === "approved" ? "pending" : "approved")}
                  onQuickReject={() => quickUpdateItem(item, item.review_status === "rejected" ? "pending" : "rejected")}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {itemsTotal > 48 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button disabled={galleryPage <= 1} onClick={() => setGalleryPage((p) => p - 1)} className={cn(btn, "gap-1")}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="text-xs text-mutedbrown">Page {galleryPage} of {Math.ceil(itemsTotal / 48)}</span>
              <button disabled={galleryPage >= Math.ceil(itemsTotal / 48)} onClick={() => setGalleryPage((p) => p + 1)} className={cn(btn, "gap-1")}>
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          STEP 4: REPORT
      ════════════════════════════════════════════ */}
      {step === "report" && (
        <div className="space-y-6">
          {commitResult && !commitResult.error && (
            <div className="border border-emerald-200 bg-emerald-50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h2 className="mt-3 font-display text-xl text-emerald-800">Import Complete</h2>
              <p className="mt-1 text-sm text-emerald-700">
                <strong>{commitResult.imported}</strong> draft product{commitResult.imported !== 1 ? "s" : ""} created ·{" "}
                <strong>{commitResult.skipped}</strong> item{commitResult.skipped !== 1 ? "s" : ""} skipped
              </p>
              <p className="mt-2 text-xs text-emerald-600">
                Go to <strong>Products → Drafts</strong> to review, edit metadata, set prices, and publish.
              </p>
            </div>
          )}

          {commitResult?.error && (
            <div className="border border-red-200 bg-red-50 p-6 text-center">
              <XCircle className="mx-auto h-10 w-10 text-red-400" />
              <h2 className="mt-3 font-display text-xl text-red-700">Commit Failed</h2>
              <p className="mt-1 text-sm text-red-600">{commitResult.error}</p>
            </div>
          )}

          {commitResult?.errors?.length > 0 && (
            <Panel title="Error Log">
              <div className="max-h-48 overflow-auto space-y-1">
                {commitResult.errors.map((e: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-700 border-b border-red-100 pb-1">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{e}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {activeJob && (
            <Panel title="Scan Summary">
              <ScanSummaryCard job={activeJob} />
            </Panel>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={() => { setStep("upload"); setActiveJob(null); setZipFile(null); setMetaFile(null); setJobName(""); setCommitResult(null); }} className={cn(btnSolid, "gap-2")}>
              <Upload className="h-4 w-4" /> Start New Import
            </button>
            {activeJob && (
              <button onClick={() => { setGalleryPage(1); setGalleryFilter("all"); setStep("gallery"); }} className={cn(btn, "gap-2")}>
                <Grid3X3 className="h-4 w-4" /> Back to Gallery
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Edit drawer ── */}
      {editingItem && (
        <ItemDrawer
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
