import pytest
from pydantic import ValidationError

from config import Settings


def test_production_rejects_localhost_or_wildcard_cors():
    with pytest.raises(ValidationError):
        Settings(environment="production", allowed_origins="http://localhost:3000", ops_token="ops")

    with pytest.raises(ValidationError):
        Settings(environment="production", allowed_origins="*", ops_token="ops")


def test_production_accepts_exact_https_origin_and_ops_token():
    settings = Settings(
        environment="production",
        allowed_origins="https://ai-shopping-agent-theta.vercel.app",
        ops_token="a-long-operations-token",
        rate_limit_window_seconds=60,
        rate_limit_max_requests=60,
    )
    assert settings.allowed_origins_list == ["https://ai-shopping-agent-theta.vercel.app"]
    assert settings.rate_limit_max_requests == 60
