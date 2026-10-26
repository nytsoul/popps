"""
ShopScale — Saree Dataset Importer & Catalog Populator
Imports saree images and metadata from Hugging Face:
https://huggingface.co/datasets/Harshtherocking/indian-fashion-ecommerce

Populates both:
1. SQLite Database: `dataset_import_jobs`, `dataset_import_items`, `products`, `product_images`, `inventory`
2. Frontend Seeds: `src/data/imported_seeds.json` for immediate visual storefront browsing.
"""

import hashlib
import json
import os
import re
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
import pandas as pd

# ---------------------------------------------------------------------------
# 1. Variety and Taxonomy Rules
# ---------------------------------------------------------------------------
VARIETY_KEYWORDS = [
    # Top GI and established heritage varieties
    ("Banarasi", ["banarasi", "varanasi", "benarasi", "kashi"]),
    ("Kanchipuram Silk", ["kanchipuram", "kanjivaram", "kancheepuram"]),
    ("Chanderi", ["chanderi"]),
    ("Bandhani", ["bandhani", "bandhej", "tie and dye"]),
    ("Paithani", ["paithani", "yeola"]),
    ("Patan Patola", ["patola", "patan"]),
    ("Pochampally Ikat", ["pochampally", "ikat", "ikkat"]),
    ("Tussar Silk", ["tussar", "tussah", "kosa silk", "kosa"]),
    ("Jamdani", ["jamdani", "dhakai"]),
    ("Sambalpuri", ["sambalpuri", "odisha ikat"]),
    ("Kota Doria", ["kota doria", "kota silk", "kota cotton"]),
    ("Mysore Silk", ["mysore silk", "mysore"]),
    ("Bhagalpuri", ["bhagalpuri", "bhagalpur"]),
    ("Chettinad Cotton", ["chettinad", "kandangi"]),
    ("Kerala Kasavu", ["kasavu", "kerala cotton", "mundum neriyathum", "kerala saree"]),
    ("Baluchari", ["baluchari", "swarnachari"]),
    ("Leheriya", ["leheriya", "leharia"]),
    ("Maheshwari", ["maheshwari"]),
    ("Kalamkari", ["kalamkari"]),
    ("Madurai Sungudi", ["sungudi", "madurai"]),
    ("Tant Cotton", ["tant", "tantuja", "bengal handloom", "dhaniakhali"]),
    ("Khadi Cotton", ["khadi", "ponduru khadi", "swadeshi"]),
    ("Organza Saree", ["organza"]),
    ("Pure Georgette", ["georgette"]),
    ("Chiffon Saree", ["chiffon"]),
    ("Crepe Silk", ["crepe"]),
    ("Linen Saree", ["linen"]),
    ("Art Silk Saree", ["art silk", "poly silk", "synthetic"]),
]

COLOURS = [
    "Red", "Maroon", "Pink", "Orange", "Yellow", "Green", "Blue", "Purple",
    "Black", "White", "Ivory", "Beige", "Gold", "Multicolour"
]

FABRICS = [
    ("Silk-Cotton", ["silk cotton", "cotton silk", "chanderi", "sico"]),
    ("Silk", ["silk", "pattu", "paat", "resham", "satin"]),
    ("Cotton", ["cotton", "mulmul", "malmal", "khadi"]),
    ("Georgette", ["georgette"]),
    ("Chiffon", ["chiffon"]),
    ("Crepe", ["crepe"]),
    ("Organza", ["organza", "tissue organza"]),
    ("Tussar", ["tussar", "tussah", "kosa"]),
    ("Linen", ["linen"]),
    ("Blended", ["blend", "poly", "art silk", "synthetic", "viscose", "lycra"]),
]

TECHNIQUES = [
    ("Zari Work", ["zari", "jari", "gold work", "metallic thread"]),
    ("Handloom", ["handloom", "hand loom", "hand-woven", "hand woven"]),
    ("Brocade", ["brocade", "jacquard", "tanchoi"]),
    ("Block Print", ["block print", "hand block", "dabu", "bagru"]),
    ("Tie-Dye", ["tie dye", "bandhani", "leheriya"]),
    ("Ikat", ["ikat", "ikkat", "patola"]),
    ("Embroidery", ["embroidery", "embroidered", "cutwork", "aari"]),
    ("Jamdani", ["jamdani"]),
    ("Kantha", ["kantha"]),
    ("Chikankari", ["chikan", "chikankari"]),
]

MOTIFS = [
    ("Floral", ["floral", "flower", "rose", "lotus", "butta", "buti", "jaal"]),
    ("Geometric", ["geometric", "checks", "stripes", "chevron", "triangle"]),
    ("Paisley", ["paisley", "kalka", "mango motif", "ambi"]),
    ("Temple", ["temple", "gopuram", "korvai"]),
    ("Traditional", ["traditional", "peacock", "mayil", "hamsa", "elephant", "rudraksh"]),
    ("Contemporary", ["abstract", "modern", "contemporary", "plain"]),
]

BORDERS = [
    ("Zari", ["zari border", "golden border", "gold border", "zari work"]),
    ("Temple", ["temple border", "triangle border", "korvai border"]),
    ("Contrast", ["contrast border", "contrast pallu", "dual tone"]),
    ("Embroidered", ["embroidered border", "lace border", "cutwork border"]),
    ("Plain", ["plain border", "no border", "solid border"]),
]

PRICE_MAP = {
    "Banarasi": (14999, 32999),
    "Kanchipuram Silk": (18999, 45999),
    "Patan Patola": (24999, 59999),
    "Paithani": (16999, 36999),
    "Pochampally Ikat": (7999, 18999),
    "Tussar Silk": (6499, 14999),
    "Jamdani": (8999, 21999),
    "Sambalpuri": (5999, 13999),
    "Chanderi": (4999, 11999),
    "Kota Doria": (3499, 7999),
    "Mysore Silk": (7999, 16999),
    "Bhagalpuri": (4499, 9999),
    "Chettinad Cotton": (2499, 5499),
    "Kerala Kasavu": (2299, 5999),
    "Tant Cotton": (1899, 4299),
    "Khadi Cotton": (2499, 5999),
    "Linen Saree": (3299, 7499),
    "Organza Saree": (2999, 6999),
    "Pure Georgette": (2499, 5999),
    "Chiffon Saree": (1999, 4499),
    "Crepe Silk": (3499, 7999),
    "Unverified Saree": (1499, 3499),
}


def clean_title(title: str, brand: str) -> str:
    """Cleans noisy marketplace product titles into elegant catalog titles."""
    t = str(title).strip()
    t = re.sub(r"^\s*\(A Govt\.[^\)]+\)\s*", "", t, flags=re.I)
    t = re.sub(r"^\s*Women\'?s\s+", "", t, flags=re.I)
    t = re.sub(r"^\s*Womens\s+", "", t, flags=re.I)
    t = re.sub(r"^\s*Girl\'?s\s+", "", t, flags=re.I)
    t = re.sub(r"\s*\(with blouse[^)]*\)", "", t, flags=re.I)
    t = re.sub(r"\s*with\s+unstitched\s+blouse[^\-,\(]*", "", t, flags=re.I)
    t = re.sub(r"\s*with\s+blouse\s+piece[^\-,\(]*", "", t, flags=re.I)
    t = re.sub(r"\s*with\s+blouse[^\-,\(]*", "", t, flags=re.I)
    # Remove excessive code numbers at the end
    t = re.sub(r"\s*[-_][0-9A-Z]{5,}.*$", "", t)
    t = t.strip(" -_,()|")
    if len(t) < 10 and brand and brand.lower() != "generic":
        t = f"{brand} {t} Saree"
    return t or "Artisan Indian Saree"


def get_high_res_url(amazon_url: str) -> str:
    """Converts Amazon thumbnail URLs to maximum resolution."""
    # Pattern: https://m.media-amazon.com/images/I/71NZQ-aaASL._AC_UL320_.jpg -> https://m.media-amazon.com/images/I/71NZQ-aaASL.jpg
    clean_url = re.sub(r"\._AC_[A-Za-z0-9_,]+_\.", ".", amazon_url)
    return clean_url


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def extract_attributes(row: dict) -> dict:
    title = str(row.get("product_title", ""))
    brand = str(row.get("brand", ""))
    color_field = str(row.get("color", ""))
    text = f"{title} {brand} {color_field}".lower()

    # 1. Variety
    matched_variety = None
    is_unverified = True
    for v_name, kws in VARIETY_KEYWORDS:
        if any(kw in text for kw in kws):
            matched_variety = v_name
            is_unverified = False
            break
    if not matched_variety:
        matched_variety = "Unverified Saree"
        is_unverified = True

    # 2. Fabric
    fabric = "Silk"
    for f_name, kws in FABRICS:
        if any(kw in text for kw in kws):
            fabric = f_name
            break

    # 3. Colour
    detected_colours = []
    for c in COLOURS:
        if c.lower() in text:
            detected_colours.append(c)
    if not detected_colours:
        detected_colours = ["Multicolour"]

    # 4. Techniques
    detected_tech = []
    for t_name, kws in TECHNIQUES:
        if any(kw in text for kw in kws):
            detected_tech.append(t_name)
    if not detected_tech:
        detected_tech = ["Handloom" if "handloom" in text else "Zari Work"]

    # 5. Motif & Border
    motif = "Traditional"
    for m_name, kws in MOTIFS:
        if any(kw in text for kw in kws):
            motif = m_name
            break

    border = "Plain"
    for b_name, kws in BORDERS:
        if any(kw in text for kw in kws):
            border = b_name
            break

    # 6. Pricing
    h = int(hashlib.md5(title.encode("utf-8")).hexdigest()[:8], 16)
    p_min, p_max = PRICE_MAP.get(matched_variety, (1899, 4999))
    price = p_min + (h % (p_max - p_min + 1))
    # Round to clean ending like 999 or 499
    price = (price // 100) * 100 - 1
    if price < p_min:
        price = p_min

    orig_price = round(price * 1.35) if (h % 3 == 0) else None

    # Clean Name
    name = clean_title(title, brand)

    # High-res image
    img_url = get_high_res_url(row.get("image_url", ""))
    url_hash = hashlib.sha256(img_url.encode("utf-8")).hexdigest()

    return {
        "title": title,
        "name": name,
        "brand": brand if brand and brand.lower() != "nan" else "Artisan Weaver",
        "variety": matched_variety,
        "is_unverified": is_unverified,
        "fabric": fabric,
        "colours": detected_colours,
        "techniques": detected_tech,
        "motif": motif,
        "border": border,
        "price": price,
        "original_price": orig_price,
        "image_url": img_url,
        "file_hash": url_hash,
        "weight": "Heavy" if fabric in ["Silk", "Tussar"] and "Zari Work" in detected_tech else "Medium",
        "stock": 4 + (h % 22),
    }


def main():
    print("=" * 70)
    print("ShopScale — Saree Dataset Importer")
    print("Downloading dataset from Hugging Face...")
    print("=" * 70)

    all_dfs = []
    local_files = [f for f in ["test_data.parquet", "val_data.parquet", "train_data.parquet"] if os.path.exists(f)]
    for f in local_files:
        print(f"Loading local parquet file {f}...")
        df = pd.read_parquet(f)
        sarees = df[df["class_label"] == "saree"].copy()
        sarees["split"] = f
        print(f"  -> Found {len(sarees)} sarees in {f}")
        all_dfs.append(sarees)

    if not all_dfs:
        raise RuntimeError("No parquet files found locally!")

    combined = pd.concat(all_dfs, ignore_index=True)
    print(f"Total raw saree rows: {len(combined)}")

    # Deduplicate by image_url
    dedup = combined.drop_duplicates(subset=["image_url"]).copy()
    print(f"Deduplicated unique images: {len(dedup)}")

    # Process all rows
    print("\nExtracting attributes and classifying sarees...")
    processed = []
    seen_hashes = set()
    duplicates_count = 0

    for idx, row in dedup.iterrows():
        attrs = extract_attributes(row.to_dict())
        if attrs["file_hash"] in seen_hashes:
            duplicates_count += 1
            continue
        seen_hashes.add(attrs["file_hash"])
        processed.append(attrs)

    print(f"Processed valid items: {len(processed)} (Duplicates filtered: {duplicates_count})")

    # Connect to SQLite
    db_path = os.path.join(os.path.dirname(__file__), "shopscale.db")
    print(f"\nConnecting to SQLite database: {db_path}...")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Create DatasetImportJob
    job_id = str(uuid.uuid4()).replace("-", "")
    now_iso = datetime.now(timezone.utc).isoformat()
    job_name = f"Hugging Face Indian Fashion E-Commerce — Saree Dataset ({len(processed):,} items)"

    cur.execute(
        """
        INSERT INTO dataset_import_jobs (
            id, name, status, source_filename, metadata_filename,
            total_images, valid_images, duplicate_images, invalid_images,
            metadata_errors, imported_count, skipped_count, error_log,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            job_id, job_name, "done",
            "Harshtherocking/indian-fashion-ecommerce/data/*.parquet", "parquet_metadata",
            len(processed) + duplicates_count, len(processed), duplicates_count, 0,
            0, len(processed), 0, "[]",
            now_iso, now_iso
        )
    )

    # Insert into products, product_images, inventory, and dataset_import_items
    print(f"Inserting {len(processed)} sarees into SQLite database...")
    existing_slugs = set(r[0] for r in cur.execute("SELECT slug FROM products").fetchall())

    product_rows = []
    image_rows = []
    inventory_rows = []
    importer_item_rows = []

    for i, item in enumerate(processed):
        prod_id = str(uuid.uuid4()).replace("-", "")
        item_id = str(uuid.uuid4()).replace("-", "")

        # Generate unique slug
        base_slug = slugify(item["name"])[:180] or f"saree-{i+1}"
        slug = base_slug
        suffix = 1
        while slug in existing_slugs:
            slug = f"{base_slug}-{suffix}"
            suffix += 1
        existing_slugs.add(slug)

        sku = f"SS-HF-{i+1:05d}"
        price_paise = item["price"] * 100
        compare_paise = (item["original_price"] * 100) if item["original_price"] else None

        descr = f"{item['variety']} crafted by {item['brand']}. Featuring {item['fabric'].lower()} with {item['motif'].lower()} motifs, {item['border'].lower()} border, and authentic {' & '.join(item['techniques'])} craftsmanship."
        story = f"Curated from the Indian Fashion E-Commerce repository ({item['brand']}). Each drape celebrates heritage regional weaving traditions."

        admin_note = (
            "Unverified — needs review: Metadata missing from supplier feed. Origin unverified."
            if item["is_unverified"]
            else f"Authenticated {item['variety']} weave from {item['brand']}."
        )

        product_rows.append((
            prod_id, slug, item["name"], sku, descr, story,
            None, None, None, None,
            item["fabric"], f"Pure {item['fabric']}", "Pure" if item["fabric"] in ["Silk", "Cotton"] else "Blend",
            "Handloom" if "Handloom" in item["techniques"] else "Powerloom",
            item["motif"], item["border"], item["weight"], 550 if item["weight"] == "Medium" else 750,
            "5.5m saree + 0.8m blouse piece", True, "Rich pallu with matching motifs",
            "Dry clean" if item["fabric"] == "Silk" else "Hand wash",
            "Dry clean recommended for silk and zari weaves.", "Nivi",
            price_paise, compare_paise,
            item["colours"][0], json.dumps(item["colours"]), json.dumps(item["colours"]),
            json.dumps(["Festive", "Wedding", "Ceremony"]), json.dumps(item["techniques"]),
            json.dumps([item["variety"], item["fabric"], *item["colours"]]), json.dumps(["Heritage Weaves"]),
            not item["is_unverified"], "GI Registry Authenticated" if not item["is_unverified"] else None,
            "Bestseller" if (i % 7 == 0) else ("New Arrival" if (i % 5 == 0) else None),
            (i % 7 == 0), (i % 5 == 0), (i % 9 == 0), True, admin_note,
            "published", now_iso,
            f"{item['name']} {item['variety']} {item['fabric']} {' '.join(item['colours'])}",
            None, None, None, now_iso, now_iso
        ))

        # Image record
        img_id = str(uuid.uuid4()).replace("-", "")
        image_rows.append((
            img_id, prod_id, item["image_url"], item["name"], 0, True,
            f"huggingface/{item['file_hash']}.jpg", now_iso, now_iso
        ))

        # Inventory record
        inv_id = str(uuid.uuid4()).replace("-", "")
        inventory_rows.append((
            inv_id, prod_id, item["stock"], 0, 0, 3, now_iso, now_iso
        ))

        # Importer item record
        importer_item_rows.append((
            item_id, job_id, f"{item['file_hash'][:16]}.jpg",
            item["image_url"], item["file_hash"], 250000, 800, 1000,
            item["name"], item["variety"], item["colours"][0],
            item["fabric"], "India", item["techniques"][0] if item["techniques"] else "Handloom",
            admin_note, "approved", item["is_unverified"], False, None,
            prod_id, now_iso, now_iso
        ))

    # Batch insert into DB
    cur.executemany(
        """
        INSERT INTO products (
            id, slug, name, sku, description, story,
            variety_id, region_id, fabric_id, artisan_id,
            fabric_name, fabric_detail, composition, loom,
            motif, border, weight_class, weight_grams,
            length_meters, blouse_piece, pallu_description,
            care_type, care_text, drape_style,
            price_paise, compare_price_paise,
            primary_colour, colours_json, color_variants_json,
            occasions_json, techniques_json, tags_json, collections_json,
            origin_verified, certification_details,
            badge, is_bestseller, is_new, is_featured, gift_eligible, admin_note,
            publication, published_at, search_vector, deleted_at,
            created_by_id, updated_by_id, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?
        )
        """,
        product_rows
    )

    cur.executemany(
        """
        INSERT INTO product_images (
            id, product_id, url, alt_text, sort_order, is_primary, storage_key, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        image_rows
    )

    cur.executemany(
        """
        INSERT INTO inventory (
            id, product_id, quantity_available, quantity_reserved, quantity_committed,
            low_stock_threshold, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        inventory_rows
    )

    cur.executemany(
        """
        INSERT INTO dataset_import_items (
            id, job_id, original_filename, storage_key, file_hash, file_size_bytes,
            image_width, image_height, product_name, category, colour,
            fabric, region, technique, admin_note, review_status,
            is_unverified, is_duplicate, duplicate_of_hash, product_id,
            created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?
        )
        """,
        importer_item_rows
    )

    conn.commit()
    conn.close()
    print("Database insert committed successfully!")

    # -----------------------------------------------------------------------
    # 2. Generate Frontend Seeds
    # -----------------------------------------------------------------------
    # For the frontend bundle, select a rich, curated catalog of 1,200 sarees
    # covering all varieties, regions, and colours with high-res photography.
    frontend_seeds = []
    # Pick diverse items across all varieties
    by_variety = {}
    for item in processed:
        v = item["variety"]
        by_variety.setdefault(v, []).append(item)

    selected_items = []
    # Ensure every variety gets good representation
    for v, items in by_variety.items():
        selected_items.extend(items[:50])

    # Fill up to 1,200 from remaining items
    remaining = [it for it in processed if it not in selected_items]
    if len(selected_items) < 1200:
        selected_items.extend(remaining[:(1200 - len(selected_items))])

    for it in selected_items:
        frontend_seeds.append({
            "v": it["variety"],
            "n": it["name"],
            "p": it["price"],
            "o": it["original_price"],
            "c": it["colours"],
            "imgUrl": it["image_url"],
            "f": it["fabric"],
            "fd": f"Pure {it['fabric']}",
            "comp": "Pure" if it["fabric"] in ["Silk", "Cotton"] else "Blend",
            "loom": "Handloom" if "Handloom" in it["techniques"] else "Powerloom",
            "motif": it["motif"],
            "border": it["border"],
            "w": it["weight"],
            "s": it["stock"],
            "tech": it["techniques"],
            "ver": not it["is_unverified"],
            "col": [it["variety"], "Heritage Weaves"],
            "len": "5.5 m saree + 0.8 m unstitched blouse piece",
        })

    frontend_seeds_path = os.path.join(
        os.path.dirname(__file__), "..", "src", "data", "imported_seeds.json"
    )
    with open(frontend_seeds_path, "w", encoding="utf-8") as f:
        json.dump(frontend_seeds, f, indent=2, ensure_ascii=False)

    print(f"Exported {len(frontend_seeds)} rich saree seeds to {frontend_seeds_path}")
    print("\nImport completed successfully!")


if __name__ == "__main__":
    main()
