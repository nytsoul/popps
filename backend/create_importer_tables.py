"""
One-shot migration script to create the dataset_import_jobs and dataset_import_items tables.
Run from the backend directory:
    python3.12 create_importer_tables.py
"""
import sys
import os

# Ensure the backend package is importable and site-packages are found
SP312 = r"C:\Users\lenovo\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\LocalCache\local-packages\Python312\site-packages"
if SP312 not in sys.path:
    sys.path.insert(0, SP312)

sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import Base
from app.db.session import engine

# Import all models so they are registered on metadata
import app.models  # noqa: F401

# Create only missing tables (safe to run multiple times)
Base.metadata.create_all(bind=engine)
print("✓ Tables created / verified.")

# Show tables
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"  Current tables ({len(tables)}): {', '.join(sorted(tables))}")
