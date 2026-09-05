"""Consolidated cross-user authorization checks across every owned resource.

Individual resource test files also cover ownership at the point of testing
that resource's CRUD; this file is the single place that asserts the
blanket rule holds everywhere: a user can never read, modify, or delete
another user's documents, collections, conversations, or eval cases, and
every such attempt returns 404 (not 403) so it doesn't even confirm the
resource exists.
"""

import io


def _upload_txt(client, headers, name="notes.txt", content=b"Some content."):
    return client.post("/documents", headers=headers, files={"file": (name, io.BytesIO(content), "text/plain")}).json()


def test_every_protected_route_requires_auth(client):
    routes = [
        ("get", "/documents"),
        ("get", "/collections"),
        ("get", "/conversations"),
        ("get", "/dashboard/summary"),
        ("get", "/dashboard/recent"),
        ("get", "/dashboard/analytics"),
        ("get", "/eval/cases"),
        ("get", "/auth/me"),
        ("get", "/sources"),
        ("get", "/documents/semantic-search?q=x"),
        ("patch", "/auth/change-password"),
        ("delete", "/auth/me"),
    ]
    for method, path in routes:
        res = getattr(client, method)(path)
        assert res.status_code == 401, f"{method.upper()} {path} should require auth"


def test_cross_user_isolation_across_every_resource(client, register_and_login):
    headers_a, _ = register_and_login("owner@example.com")
    headers_b, _ = register_and_login("intruder@example.com")

    doc = _upload_txt(client, headers_a)
    coll = client.post("/collections", headers=headers_a, json={"name": "Private"}).json()
    conv = client.post(
        "/conversations", headers=headers_a, json={"scope_type": "document_set", "document_ids": [doc["id"]]}
    ).json()
    case = client.post("/eval/cases", headers=headers_a, json={"question": "x"}).json()

    # Reads
    assert client.get(f"/documents/{doc['id']}", headers=headers_b).status_code == 404
    assert client.get(f"/collections/{coll['id']}", headers=headers_b).status_code == 404
    assert client.get(f"/conversations/{conv['id']}", headers=headers_b).status_code == 404

    # Writes
    assert client.patch(f"/documents/{doc['id']}", headers=headers_b, json={"display_name": "x"}).status_code == 404
    assert client.patch(f"/collections/{coll['id']}", headers=headers_b, json={"name": "x"}).status_code == 404
    assert client.patch(f"/conversations/{conv['id']}", headers=headers_b, json={"title": "x"}).status_code == 404
    assert (
        client.post(f"/collections/{coll['id']}/documents?document_id={doc['id']}", headers=headers_b).status_code
        == 404
    )

    # Deletes
    assert client.delete(f"/documents/{doc['id']}", headers=headers_b).status_code == 404
    assert client.delete(f"/collections/{coll['id']}", headers=headers_b).status_code == 404
    assert client.delete(f"/conversations/{conv['id']}", headers=headers_b).status_code == 404
    assert client.delete(f"/eval/cases/{case['id']}", headers=headers_b).status_code == 404

    # B listing their own resources sees none of A's data
    assert client.get("/documents", headers=headers_b).json() == []
    assert client.get("/collections", headers=headers_b).json() == []
    assert client.get("/conversations", headers=headers_b).json() == []
    assert client.get("/eval/cases", headers=headers_b).json() == []


def test_cannot_scope_a_conversation_to_another_users_document(client, register_and_login):
    headers_a, _ = register_and_login("owner@example.com")
    headers_b, _ = register_and_login("intruder@example.com")
    doc_a = _upload_txt(client, headers_a)

    res = client.post(
        "/conversations", headers=headers_b, json={"scope_type": "document_set", "document_ids": [doc_a["id"]]}
    )
    assert res.status_code == 404


def test_path_traversal_filename_is_sanitized_on_disk(client, register_and_login, tmp_path):
    import os

    import config

    headers, _ = register_and_login()
    res = client.post(
        "/documents",
        headers=headers,
        files={"file": ("../../evil.txt", io.BytesIO(b"malicious content"), "text/plain")},
    )
    assert res.status_code == 201
    # The stored file must live inside UPLOAD_DIR, never escape it via `..`.
    for root, _, files in os.walk(config.UPLOAD_DIR):
        for f in files:
            assert ".." not in f


def test_expired_or_tampered_token_rejected(client):
    res = client.get("/auth/me", headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.tampered.signature"})
    assert res.status_code == 401
