import sqlite3
import os
import glob

def get_connection(db_path="data.db"):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def run_migrations(conn, migrations_dir="migrations"):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    """)
    conn.commit()

    if not os.path.isdir(migrations_dir):
        return

    sql_files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))
    for filepath in sql_files:
        version = os.path.splitext(os.path.basename(filepath))[0]
        cur = conn.cursor()
        cur.execute("SELECT version FROM schema_migrations WHERE version = ?", (version,))
        if not cur.fetchone():
            with open(filepath, "r", encoding="utf-8") as f:
                sql = f.read()
            cur.executescript(sql)
            cur.execute("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)", (version,))
            conn.commit()
