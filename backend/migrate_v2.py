"""
Database Migration Script for LabFlow v2.0
Adds new columns and tables for knowledge integrity features
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lab_research.db")
engine = create_engine(DATABASE_URL)


def migrate_v2():
    """
    Execute migration for v2.0 features:
    1. Add field_changed column to audit_logs
    2. Add Scite metrics columns to papers table
    3. Create annotations table
    """
    with engine.connect() as conn:
        print("Starting LabFlow v2.0 migration...")

        # Migration 1: Add field_changed to audit_logs
        try:
            conn.execute(text("""
                ALTER TABLE audit_logs
                ADD COLUMN field_changed TEXT
            """))
            conn.commit()
            print("✓ Added field_changed column to audit_logs")
        except Exception as e:
            print(f"⚠ audit_logs.field_changed: {str(e)[:100]} (may already exist)")

        # Migration 2: Add Scite metrics to papers
        scite_columns = [
            ("scite_support_score", "FLOAT"),
            ("scite_contradiction_score", "FLOAT"),
            ("contradiction_alert", "BOOLEAN DEFAULT 0"),
            ("full_text_pdf_path", "VARCHAR(500)")
        ]

        for col_name, col_type in scite_columns:
            try:
                conn.execute(text(f"""
                    ALTER TABLE papers
                    ADD COLUMN {col_name} {col_type}
                """))
                conn.commit()
                print(f"✓ Added {col_name} column to papers")
            except Exception as e:
                print(f"⚠ papers.{col_name}: {str(e)[:100]} (may already exist)")

        # Migration 3: Make DOI unique in papers table (skip if already exists)
        try:
            # SQLite specific - create index if not exists
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_doi ON papers(doi)
            """))
            conn.commit()
            print("✓ Added unique index on papers.doi")
        except Exception as e:
            print(f"⚠ papers.doi index: {str(e)[:100]}")

        # Migration 4: Create annotations table
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS annotations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    user_name VARCHAR(255),
                    paper_id INTEGER NOT NULL,
                    snippet_text TEXT NOT NULL,
                    linked_entity_type VARCHAR(100),
                    linked_entity_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
                )
            """))
            conn.commit()
            print("✓ Created annotations table")
        except Exception as e:
            print(f"⚠ annotations table: {str(e)[:100]} (may already exist)")

        # Create indices for annotations
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_annotations_paper_id
                ON annotations(paper_id)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_annotations_entity
                ON annotations(linked_entity_type, linked_entity_id)
            """))
            conn.commit()
            print("✓ Created annotations indices")
        except Exception as e:
            print(f"⚠ annotations indices: {str(e)[:100]}")

        print("\n✓ Migration complete!")
        print("\nNew Features Available:")
        print("  - Mandatory change reasons (21 CFR Part 11 compliance)")
        print("  - Scite-like literature validation metrics")
        print("  - PDF annotation and highlighting (Liner-like)")
        print("  - Knowledge graph widgets")
        print("  - AI-powered manuscript generation")


def rollback_v2():
    """
    Rollback migration (if needed)
    WARNING: This will delete data in annotations table
    """
    response = input("Are you sure you want to rollback? This will delete annotations data. (yes/no): ")

    if response.lower() != "yes":
        print("Rollback cancelled.")
        return

    with engine.connect() as conn:
        print("Rolling back v2.0 migration...")

        # Drop annotations table
        try:
            conn.execute(text("DROP TABLE IF EXISTS annotations"))
            conn.commit()
            print("✓ Dropped annotations table")
        except Exception as e:
            print(f"⚠ Error dropping annotations: {e}")

        # Remove columns from papers (SQLite limitation: can't drop columns easily)
        print("⚠ Note: SQLite doesn't support dropping columns.")
        print("  Papers table columns will remain but won't be used.")

        print("\n✓ Rollback complete!")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback_v2()
    else:
        migrate_v2()
