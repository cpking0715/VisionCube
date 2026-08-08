import pytest

from app.core.security import create_access_token, decode_token, hash_password, verify_password


def test_password_roundtrip():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_token_roundtrip():
    token = create_access_token(subject="admin")
    payload = decode_token(token)
    assert payload["sub"] == "admin"


def test_decode_invalid_token():
    with pytest.raises(ValueError):
        decode_token("garbage.token.value")


def test_decode_none_token():
    with pytest.raises(ValueError):
        decode_token(None)
