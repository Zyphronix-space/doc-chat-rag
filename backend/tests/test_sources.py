"""GET /sources — the cross-conversation citation ledger backing the
Sources page. Sources are only ever created by actually asking a question
in a conversation (see routers/conversations.py:post_message), so these
tests drive that same real path rather than inserting Source rows
directly."""

import io


def _upload_and_ask(client, headers, question="Why is the sky blue?"):
    doc = client.post(
        "/documents",
        headers=headers,
        files={"file": ("notes.txt", io.BytesIO(b"The sky is blue because of Rayleigh scattering."), "text/plain")},
    ).json()
    conv = client.post(
        "/conversations", headers=headers, json={"scope_type": "document_set", "document_ids": [doc["id"]]}
    ).json()
    # TestClient runs the whole ASGI app synchronously, so the stream (and
    # the persist-sources step after it) is already fully drained by the
    # time .post() returns — same as tests/test_conversations.py.
    client.post(f"/conversations/{conv['id']}/messages", headers=headers, json={"question": question})
    return doc, conv


def test_sources_requires_auth(client):
    res = client.get("/sources")
    assert res.status_code == 401


def test_sources_lists_citations_after_asking(client, register_and_login):
    headers, _ = register_and_login()
    doc, conv = _upload_and_ask(client, headers, "Why is the sky blue?")

    res = client.get("/sources", headers=headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert items[0]["document_id"] == doc["id"]
    assert items[0]["document_name"] == "notes.txt"
    assert items[0]["conversation_id"] == conv["id"]


def test_sources_filter_by_document(client, register_and_login):
    headers, _ = register_and_login()
    doc, _conv = _upload_and_ask(client, headers)

    matching = client.get("/sources", headers=headers, params={"document_id": doc["id"]}).json()
    assert len(matching) >= 1

    other = client.get("/sources", headers=headers, params={"document_id": doc["id"] + 999}).json()
    assert other == []


def test_sources_scoped_to_owner(client, register_and_login):
    headers_a, _ = register_and_login("owner@example.com")
    headers_b, _ = register_and_login("intruder@example.com")
    _upload_and_ask(client, headers_a)

    res = client.get("/sources", headers=headers_b)
    assert res.status_code == 200
    assert res.json() == []
