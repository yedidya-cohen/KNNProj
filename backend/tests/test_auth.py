from app.core.security import hash_password, verify_password


def test_password_hash_roundtrip() -> None:
    hashed_password = hash_password("secret")

    assert verify_password("secret", hashed_password)
    assert not verify_password("wrong-password", hashed_password)

