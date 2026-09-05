"""forgot-password / reset-password / change-password / delete-account.

No email provider is configured in this project (see README), so
/auth/forgot-password returns the reset link directly in demo_reset_link
instead of emailing it -- these tests exercise that real token flow
end-to-end against the isolated test DB, same as every other test here."""

import io


def test_forgot_password_unknown_email_is_generic(client):
    res = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    assert res.status_code == 200
    assert res.json()["demo_reset_link"] is None


def test_forgot_password_known_email_returns_link(client, register_and_login):
    register_and_login("user@example.com")
    res = client.post("/auth/forgot-password", json={"email": "user@example.com"})
    assert res.status_code == 200
    body = res.json()
    assert body["demo_reset_link"] is not None
    assert "token=" in body["demo_reset_link"]
    assert body["expires_in_minutes"] == 30


def _extract_token(reset_link):
    return reset_link.split("token=", 1)[1]


def test_reset_password_with_valid_token_then_login(client, register_and_login):
    register_and_login("user@example.com", "oldpass123")
    link = client.post("/auth/forgot-password", json={"email": "user@example.com"}).json()["demo_reset_link"]
    token = _extract_token(link)

    res = client.post("/auth/reset-password", json={"token": token, "new_password": "newpass456"})
    assert res.status_code == 200

    client.cookies.clear()
    login = client.post("/auth/login", json={"email": "user@example.com", "password": "newpass456"})
    assert login.status_code == 200
    old_login = client.post("/auth/login", json={"email": "user@example.com", "password": "oldpass123"})
    assert old_login.status_code == 401


def test_reset_password_token_is_single_use(client, register_and_login):
    register_and_login("user@example.com", "oldpass123")
    link = client.post("/auth/forgot-password", json={"email": "user@example.com"}).json()["demo_reset_link"]
    token = _extract_token(link)

    first = client.post("/auth/reset-password", json={"token": token, "new_password": "newpass456"})
    assert first.status_code == 200
    second = client.post("/auth/reset-password", json={"token": token, "new_password": "anotherpass789"})
    assert second.status_code == 400


def test_reset_password_rejects_bogus_token(client):
    res = client.post("/auth/reset-password", json={"token": "not-a-real-token", "new_password": "whatever123"})
    assert res.status_code == 400


def test_change_password_requires_correct_current_password(client, register_and_login):
    headers, _ = register_and_login("user@example.com", "testpass123")
    res = client.patch(
        "/auth/change-password",
        headers=headers,
        json={"current_password": "wrong-password", "new_password": "newpass456"},
    )
    assert res.status_code == 401


def test_change_password_success_then_relogin(client, register_and_login):
    headers, _ = register_and_login("user@example.com", "testpass123")
    res = client.patch(
        "/auth/change-password",
        headers=headers,
        json={"current_password": "testpass123", "new_password": "newpass456"},
    )
    assert res.status_code == 200
    client.cookies.clear()
    login = client.post("/auth/login", json={"email": "user@example.com", "password": "newpass456"})
    assert login.status_code == 200


def test_change_password_requires_auth(client):
    res = client.patch("/auth/change-password", json={"current_password": "x", "new_password": "newpass456"})
    assert res.status_code == 401


def test_delete_account_requires_auth(client):
    res = client.delete("/auth/me")
    assert res.status_code == 401


def test_delete_account_removes_user_and_data(client, register_and_login):
    headers, _ = register_and_login("user@example.com")
    client.post("/documents", headers=headers, files={"file": ("notes.txt", io.BytesIO(b"Some content."), "text/plain")})

    res = client.delete("/auth/me", headers=headers)
    assert res.status_code == 200

    me = client.get("/auth/me", headers=headers)
    assert me.status_code == 401


def test_forgot_password_rate_limited(client, monkeypatch):
    monkeypatch.delenv("RATE_LIMIT_DISABLED", raising=False)
    for _ in range(5):
        res = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
        assert res.status_code == 200
    limited = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    assert limited.status_code == 429
