import io


def _upload_txt(client, headers, name="notes.txt", content=b"Some content."):
    return client.post("/documents", headers=headers, files={"file": (name, io.BytesIO(content), "text/plain")}).json()


def test_summary_counts_are_user_scoped(client, register_and_login):
    headers_a, _ = register_and_login("a@example.com")
    headers_b, _ = register_and_login("b@example.com")

    doc = _upload_txt(client, headers_a)
    client.post("/collections", headers=headers_a, json={"name": "Coll"})
    client.post("/conversations", headers=headers_a, json={"scope_type": "document_set", "document_ids": [doc["id"]]})

    summary_a = client.get("/dashboard/summary", headers=headers_a).json()
    summary_b = client.get("/dashboard/summary", headers=headers_b).json()

    assert summary_a["total_documents"] == 1
    assert summary_a["total_collections"] == 1
    assert summary_a["total_conversations"] == 1
    assert summary_a["documents_ready"] == 1
    assert summary_a["documents_failed"] == 0

    assert summary_b["total_documents"] == 0
    assert summary_b["total_collections"] == 0
    assert summary_b["total_conversations"] == 0


def test_recent_lists_populated(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_txt(client, headers)
    client.post("/conversations", headers=headers, json={"scope_type": "document_set", "document_ids": [doc["id"]]})

    recent = client.get("/dashboard/recent", headers=headers).json()
    assert len(recent["recent_documents"]) == 1
    assert len(recent["recent_conversations"]) == 1
    assert recent["recent_documents"][0]["id"] == doc["id"]


def test_dashboard_requires_auth(client):
    assert client.get("/dashboard/summary").status_code == 401


def test_analytics_requires_auth(client):
    assert client.get("/dashboard/analytics").status_code == 401


def test_analytics_reflects_real_activity(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_txt(client, headers)
    conv = client.post(
        "/conversations", headers=headers, json={"scope_type": "document_set", "document_ids": [doc["id"]]}
    ).json()
    client.post(f"/conversations/{conv['id']}/messages", headers=headers, json={"question": "hello?"})

    analytics = client.get("/dashboard/analytics", headers=headers).json()
    assert analytics["documents_by_status"]["ready"] == 1
    assert analytics["documents_by_status"]["failed"] == 0
    assert analytics["total_questions_asked"] == 1
    assert len(analytics["messages_over_time"]) == 30
    assert sum(day["count"] for day in analytics["messages_over_time"]) == 1
    assert analytics["messages_over_time"][-1]["count"] == 1  # today, the last entry


def test_analytics_scoped_to_owner(client, register_and_login):
    headers_a, _ = register_and_login("a@example.com")
    headers_b, _ = register_and_login("b@example.com")
    doc = _upload_txt(client, headers_a)
    conv = client.post(
        "/conversations", headers=headers_a, json={"scope_type": "document_set", "document_ids": [doc["id"]]}
    ).json()
    client.post(f"/conversations/{conv['id']}/messages", headers=headers_a, json={"question": "hello?"})

    analytics_b = client.get("/dashboard/analytics", headers=headers_b).json()
    assert analytics_b["total_questions_asked"] == 0
    assert analytics_b["documents_by_status"]["ready"] == 0
