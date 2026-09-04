def test_register_creates_user(client):
    res = client.post("/auth/register", json={"email": "a@example.com", "password": "password123"})
    assert res.status_code == 201
    assert res.json()["email"] == "a@example.com"
    assert "hashed_password" not in res.json()


def test_register_duplicate_email_conflicts(client):
    client.post("/auth/register", json={"email": "a@example.com", "password": "password123"})
    res = client.post("/auth/register", json={"email": "a@example.com", "password": "other12345"})
    assert res.status_code == 409


def test_login_success_returns_token(client):
    client.post("/auth/register", json={"email": "a@example.com", "password": "password123"})
    res = client.post("/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "a@example.com"


def test_login_wrong_password_rejected(client):
    client.post("/auth/register", json={"email": "a@example.com", "password": "password123"})
    res = client.post("/auth/login", json={"email": "a@example.com", "password": "wrongpass"})
    assert res.status_code == 401


def test_me_requires_token(client):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_me_with_valid_token(client, register_and_login):
    headers, user = register_and_login()
    res = client.get("/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == user["email"]


def test_me_with_garbage_token_rejected(client):
    res = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401
