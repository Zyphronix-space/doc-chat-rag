import io


def _upload_txt(client, headers, name="notes.txt", content=b"The capital of France is Paris."):
    return client.post("/documents", headers=headers, files={"file": (name, io.BytesIO(content), "text/plain")}).json()


def test_create_and_list_case(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_txt(client, headers)
    res = client.post(
        "/eval/cases",
        headers=headers,
        json={"question": "What is the capital of France?", "expected_source_document_id": doc["id"]},
    )
    assert res.status_code == 201
    listed = client.get("/eval/cases", headers=headers).json()
    assert len(listed) == 1


def test_run_reports_retrieval_hit(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_txt(client, headers)
    case = client.post(
        "/eval/cases",
        headers=headers,
        json={"question": "capital of France", "expected_source_document_id": doc["id"]},
    ).json()

    res = client.post("/eval/run", headers=headers, json={"case_ids": [case["id"]]})
    assert res.status_code == 200
    body = res.json()
    assert body["results"][0]["retrieval_hit"] is True
    assert body["retrieval_hit_rate"] == 1.0
    assert body["results"][0]["answer"]


def test_run_reports_retrieval_miss_for_wrong_expected_document(client, register_and_login):
    headers, _ = register_and_login()
    doc = _upload_txt(client, headers)
    other_doc = _upload_txt(client, headers, name="other.txt", content=b"Unrelated content about weather.")
    case = client.post(
        "/eval/cases",
        headers=headers,
        json={"question": "capital of France", "expected_source_document_id": other_doc["id"]},
    ).json()

    res = client.post("/eval/run", headers=headers, json={"case_ids": [case["id"]]})
    body = res.json()
    assert body["results"][0]["retrieval_hit"] is False
    assert body["retrieval_hit_rate"] == 0.0


def test_faithfulness_method_labeled_as_heuristic(client, register_and_login):
    headers, _ = register_and_login()
    _upload_txt(client, headers)
    case = client.post(
        "/eval/cases",
        headers=headers,
        json={"question": "capital of France", "expected_answer": "Paris"},
    ).json()

    res = client.post("/eval/run", headers=headers, json={"case_ids": [case["id"]]})
    body = res.json()
    assert body["results"][0]["faithfulness_method"] == "gemini-self-judge, not a rigorous eval"


def test_run_requires_at_least_one_case(client, register_and_login):
    headers, _ = register_and_login()
    res = client.post("/eval/run", headers=headers, json={})
    assert res.status_code == 400


def test_cannot_access_another_users_case(client, register_and_login):
    headers_a, _ = register_and_login("a@example.com")
    headers_b, _ = register_and_login("b@example.com")
    case = client.post("/eval/cases", headers=headers_a, json={"question": "x"}).json()
    assert client.delete(f"/eval/cases/{case['id']}", headers=headers_b).status_code == 404
