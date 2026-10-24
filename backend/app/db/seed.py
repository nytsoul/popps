"""
Development seed data for ShopScale.

IMPORTANT: All data here is SAMPLE/DEMO data.
- Artisan names, provenance claims, and certifications are fictitious sample content.
- Do NOT present as verified real-world information.
- Remove or replace before going to production.

Run with: python -m app.db.seed
"""
from __future__ import annotations

import json
import re
import sys
import os

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.db.base import Base
from app.db.session import engine
from app.core.security import hash_password
from app.models.user import User
from app.models.product import (
    Artisan, Banner, Collection, Fabric, HeritageArticle,
    Inventory, Product, ProductImage, Region, Variety, WeavingTechnique,
)
import app.models.crawler  # noqa: F401
import app.models.order  # noqa: F401
import app.models.shortlink  # noqa: F401
import app.models.support  # noqa: F401


def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-")


REGIONS = [
    ("Tamil Nadu", "South India", "India", "Rich tradition of silk and cotton handlooms", "Tamil Nadu is the heartland of South Indian textile traditions, home to Kanchipuram silks and Chettinad cottons."),
    ("Andhra Pradesh", "South India", "India", "Uppada jamdani and Dharmavaram silks", "Andhra Pradesh produces some of India's finest featherweight silks and sturdy cottons."),
    ("Karnataka", "South India", "India", "Mysore silk and Ilkal weaves", "Karnataka's textile traditions range from the royal Mysore silk to the functional Ilkal saris."),
    ("Kerala", "South India", "India", "Kasavu cotton with gold borders", "Kerala's distinctive ivory-and-gold kasavu sarees are worn for festivals and ceremonies."),
    ("Telangana", "South India", "India", "Pochampally ikat and Narayanpet", "Telangana is renowned for Pochampally's double-ikat silk and Narayanpet's checked cotton."),
    ("Gujarat", "West India", "India", "Bandhani, Patola, and Gharchola", "Gujarat produces vibrant tie-dye bandhani, the coveted double-ikat Patan Patola, and bridal gharchola."),
    ("Maharashtra", "West India", "India", "Paithani silk tapestry", "Maharashtra's Paithani saree is distinguished by its woven peacock and lotus motifs on silk."),
    ("Rajasthan", "West India", "India", "Leheriya, Kota Doria, and block prints", "Rajasthan's textile heritage includes wave-dyed leheriya, sheer Kota doria, and hand-block prints."),
    ("West Bengal", "East India", "India", "Baluchari, Tant, and Jamdani", "West Bengal weaves the narrative Baluchari, the everyday tant, and the delicate Jamdani."),
    ("Odisha", "East India", "India", "Sambalpuri ikat and Bomkai", "Odisha's Sambalpuri ikat and Bomkai are among India's most celebrated tribal textile traditions."),
    ("Uttar Pradesh", "North India", "India", "Banarasi brocade", "Varanasi (Banaras) has produced silk brocade sarees with gold and silver zari for centuries."),
    ("Bihar", "East India", "India", "Bhagalpuri and Tussar silk", "Bihar's Bhagalpur produces the natural gold-coloured Tussar silk known for its texture and sheen."),
    ("Assam", "Northeast India", "India", "Muga, Eri, and Pat silk", "Assam produces three unique silks — the golden Muga, the sustainable Eri, and the lustrous Pat."),
    ("Madhya Pradesh", "Central India", "India", "Chanderi and Maheshwari", "Madhya Pradesh produces the gossamer Chanderi and the structured Maheshwari cotton-silk blends."),
]

FABRICS = [
    ("Silk", "Pure silk fabric from mulberry silkworms"),
    ("Cotton", "Natural cotton handloom"),
    ("Silk-Cotton", "Blend of silk and cotton threads"),
    ("Linen", "Natural linen fibre"),
    ("Tussar", "Wild silk with a natural golden sheen"),
    ("Muga", "Rare silk from Assam with natural gold colour"),
    ("Eri", "Peace silk that does not kill the silkworm"),
    ("Khadi", "Hand-spun, hand-woven fabric associated with Indian independence"),
    ("Tissue", "Translucent fabric with metallic threads woven in"),
    ("Organza", "Thin, plain weave, sheer fabric"),
    ("Chiffon", "Lightweight plain-weave fabric"),
    ("Georgette", "Crepe fabric with a crinkled texture"),
    ("Blended", "Mix of two or more fibre types"),
]

TECHNIQUES = [
    ("Handloom", "Weave", "Woven by hand on a traditional loom"),
    ("Ikat", "Weave", "Resist-dyeing yarns before weaving to create blurred patterns"),
    ("Double Ikat", "Weave", "Both warp and weft yarns are resist-dyed before weaving"),
    ("Jamdani", "Weave", "Extra-weft technique creating intricate motifs on a sheer ground"),
    ("Brocade", "Weave", "Supplementary weft threads create raised patterns, often with zari"),
    ("Zari Work", "Weave", "Gold or silver metallic threads woven into the fabric"),
    ("Temple Border", "Weave", "Distinctive border pattern inspired by temple architecture"),
    ("Tie-Dye", "Print & Dye", "Fabric is tied or bound before dyeing to create resist patterns"),
    ("Bandhani", "Print & Dye", "Rajasthani/Gujarati tie-dye in tiny circular patterns"),
    ("Leheriya", "Print & Dye", "Wave-pattern tie-dye from Rajasthan"),
    ("Block Print", "Print & Dye", "Patterns stamped using carved wooden blocks"),
    ("Kalamkari", "Print & Dye", "Hand-painted or block-printed using natural dyes"),
    ("Batik", "Print & Dye", "Wax-resist dyeing technique"),
    ("Embroidery", "Embroidery & Surface", "Decorative needlework applied to the fabric surface"),
    ("Kantha", "Embroidery & Surface", "Running stitch embroidery from Bengal"),
    ("Gota Patti", "Embroidery & Surface", "Applied gold/silver ribbon work from Rajasthan"),
    ("Mirror Work", "Embroidery & Surface", "Small mirrors sewn onto fabric, common in Gujarat"),
]


PRODUCTS_SEED: list[dict] = []


COLLECTIONS_SEED = [
    ("Wedding", "wedding", "Sarees for weddings and bridal occasions", 0),
    ("Premium", "premium", "Premium and luxury sarees", 1),
    ("Everyday", "everyday", "Comfortable sarees for daily wear", 2),
    ("Festive", "festive", "Sarees for festivals and celebrations", 3),
    ("New Arrivals", "new-arrivals", "Recently added sarees", 4),
    ("Heirloom", "heirloom", "Investment-grade heirloom pieces", 5),
    ("Sustainable", "sustainable", "Eco-conscious and natural-dye sarees", 6),
    ("Office", "office", "Professional, easy-care sarees", 7),
]

HERITAGE_ARTICLES = [
    {
        "title": "The Art of Kanchipuram Silk",
        "subtitle": "Understanding India's most celebrated silk tradition",
        "slug": "art-of-kanchipuram-silk",
        "category": "heritage",
        "body": "Kanchipuram (Kanjivaram) silk has been woven in the temple town of Kanchipuram, Tamil Nadu for over a thousand years. Characterized by its heavyweight mulberry silk and korvai joint technique, it stands as the pinnacle of South Indian weaving.",
        "is_published": True,
    },
    {
        "title": "The Ikat Tradition of Pochampally",
        "subtitle": "Geometric patterns born from resist-dyed yarns",
        "slug": "pochampally-ikat-tradition",
        "category": "heritage",
        "body": "Pochampally ikat uses a pre-weaving resist-dye process to create characteristic geometric patterns. Known as Pagdu Bandhu in Telangana, each warp and weft thread is precision-aligned before touching the loom.",
        "is_published": True,
    },
    {
        "title": "A Weaver's Journey",
        "subtitle": "Following the thread from loom to wardrobe",
        "slug": "weavers-journey",
        "category": "story",
        "body": "Follow the journey of handloom sarees from silkworm farms and natural dye vats to the master weaver's pit loom, celebrating the generations of artisan families whose dedication keeps India's heritage alive.",
        "is_published": True,
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Seeding regions...")
        region_map: dict[str, Region] = {}
        for name, zone, country, tradition, story in REGIONS:
            existing = db.query(Region).filter(Region.slug == slugify(name)).first()
            if not existing:
                r = Region(
                    name=name, slug=slugify(name), zone=zone,
                    country=country, tradition=tradition, story=story,
                )
                db.add(r)
                db.flush()
                region_map[name] = r
            else:
                region_map[name] = existing

        print("Seeding fabrics...")
        fabric_map: dict[str, Fabric] = {}
        for name, desc in FABRICS:
            existing = db.query(Fabric).filter(Fabric.slug == slugify(name)).first()
            if not existing:
                f = Fabric(name=name, slug=slugify(name), description=desc)
                db.add(f)
                db.flush()
                fabric_map[name] = f
            else:
                fabric_map[name] = existing

        print("Seeding techniques...")
        for name, group, desc in TECHNIQUES:
            existing = db.query(WeavingTechnique).filter(WeavingTechnique.slug == slugify(name)).first()
            if not existing:
                db.add(WeavingTechnique(name=name, slug=slugify(name), group=group, description=desc))

        print("Seeding varieties (from product seeds)...")
        variety_map: dict[str, Variety] = {}
        seen_varieties = set()
        for p_seed in PRODUCTS_SEED:
            v_name = p_seed.get("variety", "")
            region_name = p_seed.get("region", "")
            if v_name and v_name not in seen_varieties:
                seen_varieties.add(v_name)
                existing = db.query(Variety).filter(Variety.slug == slugify(v_name)).first()
                if not existing:
                    region_obj = region_map.get(region_name)
                    v = Variety(
                        name=v_name, slug=slugify(v_name),
                        region_id=region_obj.id if region_obj else None,
                    )
                    db.add(v)
                    db.flush()
                    variety_map[v_name] = v
                else:
                    variety_map[v_name] = existing

        print("Seeding collections...")
        for name, slug, desc, order in COLLECTIONS_SEED:
            existing = db.query(Collection).filter(Collection.slug == slug).first()
            if not existing:
                db.add(Collection(name=name, slug=slug, description=desc, sort_order=order))

        print("Seeding heritage articles...")
        for art in HERITAGE_ARTICLES:
            existing = db.query(HeritageArticle).filter(HeritageArticle.slug == art["slug"]).first()
            if not existing:
                db.add(HeritageArticle(**art))
            else:
                existing.title = art["title"]
                existing.subtitle = art["subtitle"]
                existing.body = art["body"]

        print("Seeding products...")
        for p_seed in PRODUCTS_SEED:
            slug = slugify(p_seed["name"])
            existing = db.query(Product).filter(Product.slug == slug).first()
            if existing:
                existing.description = p_seed.get("description")
                existing.story = p_seed.get("story")
            else:
                sku = "SS-" + slug[:12].upper().replace("-", "")[:10]
                variety_obj = variety_map.get(p_seed.get("variety", ""))
                region_obj = region_map.get(p_seed.get("region", ""))

                product = Product(
                    slug=slug, name=p_seed["name"], sku=sku,
                    description=p_seed.get("description"),
                    story=p_seed.get("story"),
                    variety_id=variety_obj.id if variety_obj else None,
                    region_id=region_obj.id if region_obj else None,
                    fabric_name=p_seed.get("fabric"),
                    fabric_detail=p_seed.get("fabric_detail"),
                    composition=p_seed.get("composition", "Pure"),
                    loom=p_seed.get("loom", "Handloom"),
                    motif=p_seed.get("motif"),
                    border=p_seed.get("border"),
                    weight_class=p_seed.get("weight_class"),
                    primary_colour=p_seed.get("colours", [""])[0],
                    colours_json=json.dumps(p_seed.get("colours", [])),
                    color_variants_json=json.dumps(p_seed.get("color_variants", [])),
                    occasions_json=json.dumps(p_seed.get("occasions", [])),
                    techniques_json=json.dumps(p_seed.get("techniques", [])),
                    tags_json=json.dumps([]),
                    collections_json=json.dumps(p_seed.get("collections", [])),
                    price_paise=int(p_seed["price"] * 100),
                    compare_price_paise=int(p_seed["original_price"] * 100) if p_seed.get("original_price") else None,
                    badge=p_seed.get("badge"),
                    is_bestseller=p_seed.get("is_bestseller", False),
                    is_new=p_seed.get("is_new", False),
                    is_featured=p_seed.get("is_featured", False),
                    gift_eligible=True,
                    origin_verified=p_seed.get("origin_verified", False),
                    publication="published",
                )
                db.add(product)
                db.flush()

                # Image
                db.add(ProductImage(
                    product_id=product.id,
                    url=p_seed.get("image_url", ""),
                    sort_order=0, is_primary=True,
                    alt_text=p_seed["name"],
                ))

                # Inventory
                db.add(Inventory(
                    product_id=product.id,
                    quantity_available=p_seed.get("stock", 10),
                    low_stock_threshold=3,
                ))

        db.commit()
        print("[OK] Seed data applied successfully.")
        print("  NOTE: All product data, artisan stories, and provenance information")
        print("  is SAMPLE/DEMO content and must not be presented as verified facts.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
