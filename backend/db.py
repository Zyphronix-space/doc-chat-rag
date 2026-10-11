"""SQLAlchemy engine/session setup."""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

import config

if config.DATABASE_URL.startswith("sqlite:///"):
    # SQLite won't create a missing parent directory itself — on a fresh
    # deployment (e.g. DATABASE_URL pointed at a persistent-but-empty
    # /home/data path on Azure App Service), `sqlite3.OperationalError:
    # unable to open database file` would otherwise crash the app at
    # import time, before any error handling exists to report it.
    db_path = config.DATABASE_URL.removeprefix("sqlite:///")
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

if config.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(config.DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # TiDB Cloud (MySQL protocol) requires TLS. Serverless instances freeze
    # between requests, so idle pooled connections may be dead on thaw —
    # pre_ping + a short recycle keeps that from surfacing as a 500.
    import certifi

    engine = create_engine(
        config.DATABASE_URL,
        connect_args={"ssl": {"ca": certifi.where()}},
        pool_pre_ping=True,
        pool_recycle=240,
        pool_size=2,
        max_overflow=3,
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    import models  # noqa: F401 — registers models on Base before create_all

    Base.metadata.create_all(bind=engine)
    _add_missing_columns()


# create_all() never alters existing tables. There's no migration framework
# here, so columns added after a table first shipped are listed explicitly.
_ADDED_COLUMNS = {
    "users": {
        "terms_version": "VARCHAR(20) NULL",
        "terms_accepted_at": "DATETIME NULL",
    },
}


def _add_missing_columns():
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in _ADDED_COLUMNS.items():
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, ddl in columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
