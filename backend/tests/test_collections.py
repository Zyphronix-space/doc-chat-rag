import io


def _upload_txt(client, headers, name="notes.txt", content=b"Some content about databases and networks."):
    return client.post(
        "/documents",
        headers=headers,
        files={"file": (name, io.BytesIO(content), "text/plain")},
    )


def test_create_and_list_collection(client, register_and_login):
    headers, _ = register_and_login()
    res = client.post("/collections", headers=headers, json={"name": "University", "description": "coursework"})
    assert res.status_code == 201
    assert res.json()["document_count"] == 0

    listed = client.get("/collections", headers=headers)
    assert len(listed.json()) == 1


def test_add_and_remove_document_from_collection(client, register_and_login):
    headers, _ = register_and_login()
    coll = client.post("/collections", headers=headers, json={"name": "University"}).json()
    doc = _upload_txt(client, headers).json()

    add_res = client.post(f"/collections/{coll['id']}/documents?document_id={doc['id']}", headers=headers)
    assert add_res.status_code == 200
    assert add_res.json()["document_count"] == 1

    doc_after = client.get(f"/documents/{doc['id']}", headers=headers).json()
    assert doc_after["collection_id"] == coll["id"]

    remove_res = client.delete(f"/collections/{coll['id']}/documents/{doc['id']}", headers=headers)
    assert remove_res.status_code == 200
    assert remove_res.json()["document_count"] == 0

    doc_final = client.get(f"/documents/{doc['id']}", headers=headers).json()
    assert doc_final["collection_id"] is None


def test_deleting_collection_unfiles_documents_not_deletes_them(client, register_and_login):
    headers, _ = register_and_login()
    coll = client.post("/collections", headers=headers, json={"name": "University"}).json()
    doc = _upload_txt(client, headers).json()
    client.post(f"/collections/{coll['id']}/documents?document_id={doc['id']}", headers=headers)

    del_res = client.delete(f"/collections/{coll['id']}", headers=headers)
    assert del_res.status_code == 204

    doc_after = client.get(f"/documents/{doc['id']}", headers=headers)
    assert doc_after.status_code == 200
    assert doc_after.json()["collection_id"] is None


def test_rename_collection(client, register_and_login):
    headers, _ = register_and_login()
    coll = client.post("/collections", headers=headers, json={"name": "Old name"}).json()
    res = client.patch(f"/collections/{coll['id']}", headers=headers, json={"name": "New name"})
    assert res.status_code == 200
    assert res.json()["name"] == "New name"


def test_cannot_access_another_users_collection(client, register_and_login):
    headers_a, _ = register_and_login("a@example.com")
    headers_b, _ = register_and_login("b@example.com")
    coll = client.post("/collections", headers=headers_a, json={"name": "Private"}).json()

    assert client.get(f"/collections/{coll['id']}", headers=headers_b).status_code == 404
    assert client.delete(f"/collections/{coll['id']}", headers=headers_b).status_code == 404
