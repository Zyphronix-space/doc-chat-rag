import io
import json

from tests.pdf_helpers import make_pdf


def _upload_txt(client, headers, name="notes.txt", content=b"Some content about databases and networks."):
    return client.post("/documents", headers=headers, files={"file": (name, io.BytesIO(content), "text/plain")}).json()


def _upload_pdf(client, headers, name="animals.pdf", pages=("Page one is about cats.", "Page two is about dogs.")):
    pdf_bytes = make_pdf(list(pages))
    return client.post(
        "/documents", headers=headers, files={"file": (name, io.BytesIO(pdf_bytes), "application/pdf")}
    ).json()


def _parse_stream(res):
    first_newline = res.text.index("\n")
    citations = json.loads(res.text[:first_newline])["citations"]
    answer = res.text[first_newline + 1 :]
    return citations, answer


def test_create_conversation_document_scope(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_txt(client, headers)
    res = client.post(
        "/conversations", headers=headers, json={"scope_type": "document_set", "document_ids": [doc["id"]]}
    )
    assert res.status_code == 201
    assert res.json()["scope_document_ids"] == [doc["id"]]


def test_create_conversation_requires_valid_scope(client, register_and_login):
    headers, _ = register_and_login()
    res = client.post("/conversations", headers=headers, json={"scope_type": "document_set", "document_ids": []})
    assert res.status_code == 400


def test_post_message_streams_and_persists(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_txt(client, headers, content=b"The database uses PostgreSQL for storage.")
    conv = client.post(
        "/conversations", headers=headers, json={"scope_type": "document_set", "document_ids": [doc["id"]]}
    ).json()

    res = client.post(f"/conversations/{conv['id']}/messages", headers=headers, json={"question": "what database?"})
    assert res.status_code == 200
    citations, answer = _parse_stream(res)
    assert "This is a fake grounded answer." in answer
    assert len(citations) >= 1
    assert citations[0]["source"] == doc["display_name"]

    detail = client.get(f"/conversations/{conv['id']}", headers=headers).json()
    assert len(detail["messages"]) == 2
    assert detail["messages"][0]["role"] == "user"
    assert detail["messages"][1]["role"] == "assistant"
    assert detail["messages"][1]["sources"][0]["document_name"] == doc["display_name"]


def test_citations_carry_real_page_numbers_for_pdf(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_pdf(client, headers)
    conv = client.post(
        "/conversations", headers=headers, json={"scope_type": "document_set", "document_ids": [doc["id"]]}
    ).json()

    res = client.post(f"/conversations/{conv['id']}/messages", headers=headers, json={"question": "tell me about cats"})
    citations, _ = _parse_stream(res)
    assert len(citations) >= 1
    assert citations[0]["page_number"] in (1, 2)


def test_citations_omit_page_number_for_txt(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_txt(client, headers)
    conv = client.post(
        "/conversations", headers=headers, json={"scope_type": "document_set", "document_ids": [doc["id"]]}
    ).json()
    res = client.post(f"/conversations/{conv['id']}/messages", headers=headers, json={"question": "what is this about?"})
    citations, _ = _parse_stream(res)
    assert citations[0]["page_number"] is None


def test_collection_scoped_conversation_follows_current_membership(client, register_and_login):
    headers, _ = register_and_login()
    coll = client.post("/collections", headers=headers, json={"name": "University"}).json()
    doc = _upload_txt(client, headers, content=b"Networking chapter about TCP and UDP protocols.")
    client.post(f"/collections/{coll['id']}/documents?document_id={doc['id']}", headers=headers)

    conv = client.post(
        "/conversations", headers=headers, json={"scope_type": "collection", "collection_id": coll["id"]}
    ).json()
    res = client.post(f"/conversations/{conv['id']}/messages", headers=headers, json={"question": "what protocols?"})
    citations, _ = _parse_stream(res)
    assert citations[0]["document_id"] == doc["id"]

    # Removing the document from the collection should stop it being searched.
    client.delete(f"/collections/{coll['id']}/documents/{doc['id']}", headers=headers)
    res2 = client.post(f"/conversations/{conv['id']}/messages", headers=headers, json={"question": "what protocols?"})
    citations2, _ = _parse_stream(res2)
    assert citations2 == []


def test_multi_document_scope_searches_only_selected_documents(client, register_and_login):
    headers, _ = register_and_login()
    doc_a = _upload_txt(client, headers, name="a.txt", content=b"Alpha document about elephants.")
    doc_b = _upload_txt(client, headers, name="b.txt", content=b"Beta document about giraffes.")
    doc_c = _upload_txt(client, headers, name="c.txt", content=b"Gamma document about elephants too.")

    conv = client.post(
        "/conversations",
        headers=headers,
        json={"scope_type": "document_set", "document_ids": [doc_a["id"], doc_b["id"]]},
    ).json()
    assert sorted(conv["scope_document_ids"]) == sorted([doc_a["id"], doc_b["id"]])

    res = client.post(f"/conversations/{conv['id']}/messages", headers=headers, json={"question": "elephants"})
    citations, _ = _parse_stream(res)
    cited_ids = {c["document_id"] for c in citations}
    assert cited_ids.issubset({doc_a["id"], doc_b["id"]})
    assert doc_c["id"] not in cited_ids


def test_delete_conversation(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_txt(client, headers)
    conv = client.post(
        "/conversations", headers=headers, json={"scope_type": "document_set", "document_ids": [doc["id"]]}
    ).json()
    res = client.delete(f"/conversations/{conv['id']}", headers=headers)
    assert res.status_code == 204
    assert client.get(f"/conversations/{conv['id']}", headers=headers).status_code == 404


def test_cannot_access_another_users_conversation(client, register_and_login):
    headers_a, _ = register_and_login("a@example.com")
    headers_b, _ = register_and_login("b@example.com")
    doc = _upload_txt(client, headers_a)
    conv = client.post(
        "/conversations", headers=headers_a, json={"scope_type": "document_set", "document_ids": [doc["id"]]}
    ).json()

    assert client.get(f"/conversations/{conv['id']}", headers=headers_b).status_code == 404
    assert (
        client.post(f"/conversations/{conv['id']}/messages", headers=headers_b, json={"question": "hi"}).status_code
        == 404
    )


def test_two_users_never_cross_contaminate_retrieval(client, register_and_login):
    """Even with near-identical document content, user B's conversation must
    never retrieve chunks from user A's documents."""
    headers_a, _ = register_and_login("a@example.com")
    headers_b, _ = register_and_login("b@example.com")
    doc_a = _upload_txt(client, headers_a, content=b"Confidential: the launch codes are 12345.")
    doc_b = _upload_txt(client, headers_b, content=b"Confidential: the launch codes are 12345.")

    conv_b = client.post(
        "/conversations", headers=headers_b, json={"scope_type": "document_set", "document_ids": [doc_b["id"]]}
    ).json()
    res = client.post(f"/conversations/{conv_b['id']}/messages", headers=headers_b, json={"question": "launch codes"})
    citations, _ = _parse_stream(res)
    for c in citations:
        assert c["document_id"] == doc_b["id"]
        assert c["document_id"] != doc_a["id"]
