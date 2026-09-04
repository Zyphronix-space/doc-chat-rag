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

connect_args = {"check_same_thread": False} if config.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(config.DATABASE_URL, connect_args=connect_args)
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
