import io

from tests.pdf_helpers import make_pdf


def _upload_txt(client, headers, name="notes.txt", content=b"Hello world, this is a test document."):
    return client.post(
        "/documents",
        headers=headers,
        files={"file": (name, io.BytesIO(content), "text/plain")},
    )


def test_upload_txt_document(client, register_and_login):
    headers, _ = register_and_login()
    res = _upload_txt(client, headers)
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "ready"
    assert body["chunk_count"] >= 1
    assert body["page_count"] is None  # txt has no concept of pages
    assert body["duplicate"] is False


def test_upload_pdf_tracks_real_page_count(client, register_and_login):
    headers, _ = register_and_login()
    pdf_bytes = make_pdf(["Page one content about cats.", "Page two content about dogs."])
    res = client.post(
        "/documents",
        headers=headers,
        files={"file": ("animals.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "ready"
    assert body["page_count"] == 2
    assert body["chunk_count"] >= 2


def test_duplicate_upload_short_circuits(client, register_and_login):
    headers, _ = register_and_login()
    first = _upload_txt(client, headers)
    second = _upload_txt(client, headers, name="notes-renamed.txt")
    assert second.status_code == 201
    assert second.json()["duplicate"] is True
    assert second.json()["id"] == first.json()["id"]


def test_upload_rejects_unsupported_extension(client, register_and_login):
    headers, _ = register_and_login()
    res = client.post(
        "/documents",
        headers=headers,
        files={"file": ("virus.exe", io.BytesIO(b"not really a virus"), "application/octet-stream")},
    )
    assert res.status_code == 400


def test_upload_rejects_empty_file(client, register_and_login):
    headers, _ = register_and_login()
    res = client.post(
        "/documents",
        headers=headers,
        files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")},
    )
    assert res.status_code == 400


def test_upload_oversized_file_rejected(client, register_and_login, monkeypatch):
    import config

    monkeypatch.setattr(config, "MAX_FILE_SIZE_BYTES", 10)
    headers, _ = register_and_login()
    res = _upload_txt(client, headers, content=b"this text is definitely more than 10 bytes long")
    assert res.status_code == 413


def test_upload_corrupted_pdf_marked_failed(client, register_and_login):
    headers, _ = register_and_login()
    res = client.post(
        "/documents",
        headers=headers,
        files={"file": ("broken.pdf", io.BytesIO(b"%PDF-1.4 not a real pdf body"), "application/pdf")},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "failed"
    assert body["status_error"]


def test_list_documents_only_shows_own(client, register_and_login):
    headers_a, _ = register_and_login("a@example.com")
    headers_b, _ = register_and_login("b@example.com")
    _upload_txt(client, headers_a)

    res_a = client.get("/documents", headers=headers_a)
    res_b = client.get("/documents", headers=headers_b)
    assert len(res_a.json()) == 1
    assert len(res_b.json()) == 0


def test_rename_document(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_txt(client, headers).json()
    res = client.patch(f"/documents/{doc['id']}", headers=headers, json={"display_name": "Renamed.txt"})
    assert res.status_code == 200
    assert res.json()["display_name"] == "Renamed.txt"


def test_delete_document_removes_it(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_txt(client, headers).json()
    res = client.delete(f"/documents/{doc['id']}", headers=headers)
    assert res.status_code == 204
    assert client.get(f"/documents/{doc['id']}", headers=headers).status_code == 404


def test_open_document_file_returns_original_bytes(client, register_and_login):
    headers, _ = register_and_login()
    content = b"Hello world, this is a test document."
    doc = _upload_txt(client, headers, content=content).json()
    res = client.get(f"/documents/{doc['id']}/file", headers=headers)
    assert res.status_code == 200
    assert res.content == content


def test_cannot_open_another_users_document_file(client, register_and_login):
    headers_a, _ = register_and_login("a@example.com")
    headers_b, _ = register_and_login("b@example.com")
    doc = _upload_txt(client, headers_a).json()
    assert client.get(f"/documents/{doc['id']}/file", headers=headers_b).status_code == 404


def test_cannot_access_another_users_document(client, register_and_login):
    headers_a, _ = register_and_login("a@example.com")
    headers_b, _ = register_and_login("b@example.com")
    doc = _upload_txt(client, headers_a).json()

    assert client.get(f"/documents/{doc['id']}", headers=headers_b).status_code == 404
    assert client.patch(f"/documents/{doc['id']}", headers=headers_b, json={"display_name": "x"}).status_code == 404
    assert client.delete(f"/documents/{doc['id']}", headers=headers_b).status_code == 404
