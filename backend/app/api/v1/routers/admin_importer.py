"""Saree Dataset Importer — Admin API endpoints.

Flow:
  POST /admin/importer/jobs              → create job, upload ZIP + optional metadata file
  GET  /admin/importer/jobs              → list all jobs
  GET  /admin/importer/jobs/{job_id}     → job detail + counters
  GET  /admin/importer/jobs/{job_id}/items        → paginated preview gallery
  PATCH /admin/importer/jobs/{job_id}/items/{item_id} → edit metadata or review_status
  POST /admin/importer/jobs/{job_id}/commit       → create draft products for all approved items
  DELETE /admin/importer/jobs/{job_id}            → delete job + uploaded files
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
import shutil
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from PIL import Image as PILImage
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import require_role, UserRole
from app.db.session import get_db
from app.models.importer import DatasetImportItem, DatasetImportJob
from app.models.product import Inventory, Product, ProductImage

router = APIRouter()

# ── Constants ──────────────────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE_MB = 50          # per-image cap for individual files after extraction
MIN_DIMENSION = 100            # pixels
MAX_IMAGES_PER_JOB = 2000

UNVERIFIED_NOTE = "Unverified — needs review"

# Metadata column synonyms (case-insensitive) → canonical field
_COLUMN_MAP = {
    "name": "product_name", "product_name": "product_name", "title": "product_name",
    "category": "category", "type": "category", "saree_type": "category", "variety": "category",
    "colour": "colour", "color": "colour", "primary_colour": "colour", "primary_color": "colour",
    "fabric": "fabric", "material": "fabric", "fabric_name": "fabric",
    "region": "region", "state": "region", "origin": "region",
    "technique": "technique", "weave": "technique", "weaving_technique": "technique",
}


def _uploads_root() -> Path:
    root = Path(settings.local_upload_dir) / "imports"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _job_dir(job_id: uuid.UUID) -> Path:
    d = _uploads_root() / str(job_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-")


def _unique_slug(db: Session, name: str) -> str:
    base = _slugify(name)
    slug, n = base, 1
    while db.query(Product).filter(Product.slug == slug).first():
        slug = f"{base}-{n}"
        n += 1
    return slug


def _unique_sku(db: Session, name: str) -> str:
    base = "DS-" + _slugify(name)[:12].upper().replace("-", "")
    sku, n = base, 1
    while db.query(Product).filter(Product.sku == sku).first():
        sku = f"{base}{n}"
        n += 1
    return sku


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _validate_image(path: Path) -> dict[str, Any]:
    """Return a dict with width, height, and error (or None)."""
    size = path.stat().st_size
    if size > MAX_FILE_SIZE_MB * 1024 * 1024:
        return {"width": None, "height": None, "error": f"File too large ({size // (1024*1024)} MB > {MAX_FILE_SIZE_MB} MB)"}
    try:
        with PILImage.open(path) as img:
            w, h = img.size
            img.verify()
        if w < MIN_DIMENSION or h < MIN_DIMENSION:
            return {"width": w, "height": h, "error": f"Dimensions too small ({w}×{h} px)"}
        return {"width": w, "height": h, "error": None}
    except Exception as exc:
        return {"width": None, "height": None, "error": f"Invalid image: {exc}"}


def _parse_metadata_file(raw_bytes: bytes, filename: str) -> list[dict[str, str]]:
    """Parse CSV or JSON metadata into a list of dicts with canonical keys."""
    fname = filename.lower()
    rows: list[dict[str, str]] = []
    if fname.endswith(".json"):
        data = json.loads(raw_bytes.decode("utf-8-sig"))
        if isinstance(data, list):
            rows = data
        elif isinstance(data, dict):
            rows = list(data.values()) if all(isinstance(v, dict) for v in data.values()) else [data]
    else:
        text = raw_bytes.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)

    # Normalise column names
    normalised = []
    for row in rows:
        norm: dict[str, str] = {}
        for k, v in row.items():
            canonical = _COLUMN_MAP.get(k.lower().strip())
            if canonical:
                norm[canonical] = str(v).strip() if v else ""
        normalised.append(norm)
    return normalised


def _build_meta_index(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    """Index metadata rows by product_name (lower-stripped) for filename matching."""
    idx: dict[str, dict[str, str]] = {}
    for row in rows:
        key = row.get("product_name", "").lower().strip()
        if key:
            idx[key] = row
    return idx


def _match_meta(filename: str, meta_index: dict[str, dict[str, str]]) -> dict[str, str] | None:
    stem = Path(filename).stem.lower().replace("_", " ").replace("-", " ").strip()
    if stem in meta_index:
        return meta_index[stem]
    # Fuzzy: check if any key is a substring of the stem or vice-versa
    for key, row in meta_index.items():
        if key in stem or stem in key:
            return row
    return None


# ── Serialisers ────────────────────────────────────────────────────────────────

def _job_out(job: DatasetImportJob) -> dict:
    return {
        "id": str(job.id),
        "name": job.name,
        "status": job.status,
        "source_filename": job.source_filename,
        "metadata_filename": job.metadata_filename,
        "total_images": job.total_images,
        "valid_images": job.valid_images,
        "duplicate_images": job.duplicate_images,
        "invalid_images": job.invalid_images,
        "metadata_errors": job.metadata_errors,
        "imported_count": job.imported_count,
        "skipped_count": job.skipped_count,
        "error_log": json.loads(job.error_log) if job.error_log else [],
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


def _item_out(item: DatasetImportItem) -> dict:
    # Build a web-accessible URL for the preview image
    img_url = f"/api/v1/admin/importer/images/{item.job_id}/{item.storage_key}" if item.storage_key else None
    return {
        "id": str(item.id),
        "job_id": str(item.job_id),
        "original_filename": item.original_filename,
        "storage_key": item.storage_key,
        "image_url": img_url,
        "file_hash": item.file_hash,
        "file_size_bytes": item.file_size_bytes,
        "image_width": item.image_width,
        "image_height": item.image_height,
        "product_name": item.product_name,
        "category": item.category,
        "colour": item.colour,
        "fabric": item.fabric,
        "region": item.region,
        "technique": item.technique,
        "admin_note": item.admin_note,
        "review_status": item.review_status,
        "is_unverified": item.is_unverified,
        "is_duplicate": item.is_duplicate,
        "duplicate_of_hash": item.duplicate_of_hash,
        "product_id": str(item.product_id) if item.product_id else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/admin/importer/jobs")
async def importer_list_jobs(
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List all import jobs, newest first."""
    jobs = (
        db.query(DatasetImportJob)
        .order_by(DatasetImportJob.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_job_out(j) for j in jobs]


@router.post("/admin/importer/jobs", status_code=201)
async def importer_create_job(
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
    name: str = Form(..., max_length=300),
    zip_file: UploadFile = File(...),
    metadata_file: UploadFile | None = File(default=None),
):
    """
    Upload a ZIP archive of images (+ optional CSV/JSON metadata).
    Creates a job, extracts & validates images, maps metadata, and returns a preview-ready job.
    """
    actor_id = uuid.UUID(token["sub"])

    # 1. Create job record
    job = DatasetImportJob(
        name=name,
        status="scanning",
        source_filename=zip_file.filename,
        metadata_filename=metadata_file.filename if metadata_file else None,
        created_by_id=actor_id,
    )
    db.add(job)
    db.flush()  # get job.id

    job_dir = _job_dir(job.id)
    errors: list[str] = []

    # 2. Parse metadata file (if provided)
    meta_index: dict[str, dict[str, str]] = {}
    if metadata_file and metadata_file.filename:
        try:
            meta_bytes = await metadata_file.read()
            rows = _parse_metadata_file(meta_bytes, metadata_file.filename)
            meta_index = _build_meta_index(rows)
        except Exception as exc:
            errors.append(f"Metadata parse error: {exc}")

    # 3. Extract ZIP
    zip_bytes = await zip_file.read()
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            # Collect image entries
            image_entries = [
                e for e in zf.infolist()
                if not e.is_dir()
                and Path(e.filename).suffix.lower() in ALLOWED_EXTENSIONS
                and not Path(e.filename).name.startswith(".")
            ]

            if len(image_entries) > MAX_IMAGES_PER_JOB:
                image_entries = image_entries[:MAX_IMAGES_PER_JOB]
                errors.append(f"Truncated to {MAX_IMAGES_PER_JOB} images (job limit).")

            # Track hashes seen in this job for duplicate detection
            seen_hashes: dict[str, str] = {}  # hash → first filename

            total = len(image_entries)
            valid_count = dup_count = invalid_count = meta_err_count = 0

            for entry in image_entries:
                fname = Path(entry.filename).name
                # Safe storage key (flatten path)
                safe_name = re.sub(r"[^\w.\-]", "_", fname)
                dest = job_dir / safe_name

                # Extract file
                with zf.open(entry) as src, open(dest, "wb") as dst:
                    shutil.copyfileobj(src, dst)

                # Validate image
                result = _validate_image(dest)
                is_invalid = result["error"] is not None
                if is_invalid:
                    errors.append(f"{fname}: {result['error']}")
                    invalid_count += 1
                    review_status = "invalid"
                else:
                    # Hash
                    file_hash = _sha256(dest)
                    is_dup = file_hash in seen_hashes
                    dup_of = seen_hashes.get(file_hash)
                    if not is_dup:
                        seen_hashes[file_hash] = fname
                        # Also check DB for cross-job duplicates
                        existing = db.query(DatasetImportItem).filter(
                            DatasetImportItem.file_hash == file_hash
                        ).first()
                        if existing:
                            is_dup = True
                            dup_of = existing.original_filename

                    if is_dup:
                        dup_count += 1
                        review_status = "duplicate"
                    else:
                        valid_count += 1
                        review_status = "pending"

                    # Match metadata
                    meta = _match_meta(fname, meta_index)
                    has_meta = bool(meta)
                    if not has_meta and meta_index:
                        meta_err_count += 1
                    is_unverified = not has_meta

                    db.add(DatasetImportItem(
                        job_id=job.id,
                        original_filename=fname,
                        storage_key=safe_name,
                        file_hash=file_hash if not is_invalid else None,
                        file_size_bytes=dest.stat().st_size,
                        image_width=result["width"],
                        image_height=result["height"],
                        product_name=meta.get("product_name") if meta else None,
                        category=meta.get("category") if meta else None,
                        colour=meta.get("colour") if meta else None,
                        fabric=meta.get("fabric") if meta else None,
                        region=meta.get("region") if meta else None,
                        technique=meta.get("technique") if meta else None,
                        admin_note=UNVERIFIED_NOTE if is_unverified else None,
                        review_status=review_status,
                        is_unverified=is_unverified,
                        is_duplicate=is_dup,
                        duplicate_of_hash=dup_of,
                    ))
                    continue

                # invalid path: still persist item for reporting
                safe_name_inv = safe_name
                db.add(DatasetImportItem(
                    job_id=job.id,
                    original_filename=fname,
                    storage_key=safe_name_inv,
                    file_size_bytes=dest.stat().st_size if dest.exists() else None,
                    admin_note=result["error"],
                    review_status="invalid",
                    is_unverified=True,
                ))

    except zipfile.BadZipFile:
        db.rollback()
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid ZIP archive.")
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}")

    # 4. Update job counters
    job.status = "ready"
    job.total_images = total
    job.valid_images = valid_count
    job.duplicate_images = dup_count
    job.invalid_images = invalid_count
    job.metadata_errors = meta_err_count
    job.error_log = json.dumps(errors)

    db.commit()
    db.refresh(job)
    return _job_out(job)


@router.get("/admin/importer/jobs/{job_id}")
async def importer_get_job(
    job_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    job = db.query(DatasetImportJob).filter(DatasetImportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found.")
    return _job_out(job)


@router.get("/admin/importer/jobs/{job_id}/items")
async def importer_list_items(
    job_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=48, ge=1, le=200),
    status: str | None = Query(default=None),
):
    """Paginated preview gallery of import items."""
    q = db.query(DatasetImportItem).filter(DatasetImportItem.job_id == job_id)
    if status:
        q = q.filter(DatasetImportItem.review_status == status)
    total = q.count()
    items = q.order_by(DatasetImportItem.original_filename).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_item_out(i) for i in items],
    }


@router.patch("/admin/importer/jobs/{job_id}/items/{item_id}")
async def importer_update_item(
    job_id: uuid.UUID,
    item_id: uuid.UUID,
    body: dict,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    """Edit metadata or change review_status (approved/rejected/pending) for a single item."""
    item = db.query(DatasetImportItem).filter(
        DatasetImportItem.id == item_id, DatasetImportItem.job_id == job_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Import item not found.")

    allowed_fields = {"product_name", "category", "colour", "fabric", "region", "technique", "admin_note", "review_status"}
    for field, value in body.items():
        if field in allowed_fields:
            setattr(item, field, value)
            if field != "review_status" and field != "admin_note":
                # If admin is filling in metadata, mark as no longer needing review
                item.is_unverified = False
                if item.admin_note == UNVERIFIED_NOTE:
                    item.admin_note = None

    db.commit()
    db.refresh(item)
    return _item_out(item)


@router.post("/admin/importer/jobs/{job_id}/items/bulk-approve")
async def importer_bulk_approve(
    job_id: uuid.UUID,
    body: dict,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    """Bulk-approve or bulk-reject items. body: {action: 'approve'|'reject', filter: 'all'|'pending'|'unverified'}"""
    action = body.get("action", "approve")
    filter_by = body.get("filter", "pending")

    q = db.query(DatasetImportItem).filter(DatasetImportItem.job_id == job_id)
    if filter_by == "pending":
        q = q.filter(DatasetImportItem.review_status == "pending")
    elif filter_by == "unverified":
        q = q.filter(DatasetImportItem.is_unverified == True)  # noqa: E712
    elif filter_by == "valid":
        q = q.filter(DatasetImportItem.review_status.in_(["pending", "approved"]))
    # "all" → no extra filter

    new_status = "approved" if action == "approve" else "rejected"
    updated = q.update({"review_status": new_status}, synchronize_session=False)
    db.commit()
    return {"updated": updated, "new_status": new_status}


@router.post("/admin/importer/jobs/{job_id}/commit")
async def importer_commit_job(
    job_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Commit approved items: for each approved item, create a DRAFT product
    (or attach the image to an existing draft if product_name matches).
    Products are NEVER auto-published; they stay as drafts.
    """
    job = db.query(DatasetImportJob).filter(DatasetImportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found.")
    if job.status not in ("ready", "done"):
        raise HTTPException(status_code=409, detail=f"Job is not in a commitable state (status={job.status}).")

    actor_id = uuid.UUID(token["sub"])
    job.status = "committing"
    db.flush()

    approved_items = (
        db.query(DatasetImportItem)
        .filter(DatasetImportItem.job_id == job_id, DatasetImportItem.review_status == "approved")
        .all()
    )

    imported = 0
    skipped = 0
    errors: list[str] = json.loads(job.error_log or "[]")

    # Group items by product_name so multiple images → one product
    product_name_map: dict[str, Product] = {}

    for item in approved_items:
        try:
            pname = (item.product_name or "Unnamed Saree").strip() or "Unnamed Saree"
            pname_key = pname.lower()

            # Find or create draft product for this name
            if pname_key in product_name_map:
                product = product_name_map[pname_key]
            else:
                # Check DB for an existing draft with same name
                existing_product = db.query(Product).filter(
                    Product.name == pname,
                    Product.publication == "draft",
                    Product.deleted_at.is_(None),
                ).first()
                if existing_product:
                    product = existing_product
                else:
                    product = Product(
                        name=pname,
                        slug=_unique_slug(db, pname),
                        sku=_unique_sku(db, pname),
                        description=None,
                        price_paise=100,  # placeholder ₹1.00 — must be updated by admin
                        publication="draft",
                        origin_verified=False,
                        admin_note=(
                            f"[Dataset Import — {job.name}] "
                            + (item.admin_note or UNVERIFIED_NOTE)
                        ),
                        primary_colour=item.colour or None,
                        fabric_name=item.fabric or None,
                        created_by_id=actor_id,
                        updated_by_id=actor_id,
                    )
                    db.add(product)
                    db.flush()
                    # Create inventory placeholder
                    db.add(Inventory(product_id=product.id, quantity_available=0))
                    db.flush()
                product_name_map[pname_key] = product

            # Copy image to the products media directory
            src_path = _job_dir(job.id) / item.storage_key
            if src_path.exists():
                products_media = Path(settings.local_upload_dir) / "products" / str(product.id)
                products_media.mkdir(parents=True, exist_ok=True)
                dest_filename = item.storage_key
                dest_path = products_media / dest_filename
                shutil.copy2(src_path, dest_path)
                img_url = f"/uploads/products/{product.id}/{dest_filename}"
            else:
                img_url = None
                errors.append(f"Source file missing for item {item.id}: {item.storage_key}")

            # Check if this product already has a primary image
            existing_primary = db.query(ProductImage).filter(
                ProductImage.product_id == product.id, ProductImage.is_primary == True  # noqa: E712
            ).first()
            is_primary = existing_primary is None

            sort_order = db.query(ProductImage).filter(ProductImage.product_id == product.id).count()

            db.add(ProductImage(
                product_id=product.id,
                url=img_url or "",
                alt_text=pname,
                sort_order=sort_order,
                is_primary=is_primary,
                storage_key=f"products/{product.id}/{item.storage_key}",
            ))

            item.product_id = product.id
            item.review_status = "imported"
            imported += 1

        except Exception as exc:
            errors.append(f"Item {item.id} ({item.original_filename}): {exc}")
            skipped += 1

    job.status = "done"
    job.imported_count = imported
    job.skipped_count = skipped
    job.error_log = json.dumps(errors)
    db.commit()

    return {
        "job_id": str(job_id),
        "status": "done",
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:50],  # cap response size
    }


@router.get("/admin/importer/images/{job_id}/{filename}")
async def importer_serve_image(
    job_id: uuid.UUID,
    filename: str,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
):
    """Serve a preview image from the import staging area."""
    # Sanitise filename to prevent directory traversal
    safe = re.sub(r"[^\w.\-]", "_", filename)
    path = _job_dir(job_id) / safe
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found.")
    return FileResponse(str(path))


@router.delete("/admin/importer/jobs/{job_id}", status_code=204)
async def importer_delete_job(
    job_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    """Delete the job record and all its staged files."""
    job = db.query(DatasetImportJob).filter(DatasetImportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found.")
    job_dir = _job_dir(job_id)
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)
    db.delete(job)
    db.commit()
    return None
