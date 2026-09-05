"""Document search: filename filter (GET /documents?q=) and semantic
search (GET /documents/semantic-search?q=), which reuses the same
embed-and-retrieve path chat uses -- scoped per-user, distance-thresholded,
never fabricated."""

import io

from tests.test_authorization import _upload_txt


def test_filename_search_filters_by_display_name(client, register_and_login):
    headers, _ = register_and_login()
    _upload_txt(client, headers, name="research_paper.txt", content=b"Some content about neural networks.")
    _upload_txt(client, headers, name="lecture_notes.txt", content=b"Some content about databases.")

    res = client.get("/documents", headers=headers, params={"q": "research"})
    assert res.status_code == 200
    names = [d["display_name"] for d in res.json()]
    assert names == ["research_paper.txt"]


def test_filename_search_is_case_insensitive(client, register_and_login):
    headers, _ = register_and_login()
    _upload_txt(client, headers, name="Research_Paper.txt")

    res = client.get("/documents", headers=headers, params={"q": "research"})
    assert len(res.json()) == 1


def test_semantic_search_requires_auth(client):
    res = client.get("/documents/semantic-search", params={"q": "anything"})
    assert res.status_code == 401


def test_semantic_search_finds_relevant_document(client, register_and_login):
    headers, _ = register_and_login()
    client.post(
        "/documents",
        headers=headers,
        files={"file": ("cats.txt", io.BytesIO(b"Cats are small domesticated carnivorous mammals."), "text/plain")},
    )

    res = client.get("/documents/semantic-search", headers=headers, params={"q": "domesticated mammals"})
    assert res.status_code == 200
    results = res.json()
    assert len(results) >= 1
    assert results[0]["document_name"] == "cats.txt"
    assert results[0]["page_number"] is None  # a .txt file has no page concept


def test_semantic_search_scoped_to_owner(client, register_and_login):
    headers_a, _ = register_and_login("owner@example.com")
    headers_b, _ = register_and_login("intruder@example.com")
    client.post(
        "/documents",
        headers=headers_a,
        files={"file": ("secret.txt", io.BytesIO(b"A very specific secret sentence about llamas."), "text/plain")},
    )

    res = client.get("/documents/semantic-search", headers=headers_b, params={"q": "llamas"})
    assert res.status_code == 200
    assert res.json() == []


def test_semantic_search_blank_query_returns_empty(client, register_and_login):
    headers, _ = register_and_login()
    res = client.get("/documents/semantic-search", headers=headers, params={"q": "   "})
    assert res.status_code == 200
    assert res.json() == []
