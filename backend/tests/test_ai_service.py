import pytest

import asyncio

from models import Product, ScrapeStatus, Source, SourceResult
from services import ai_service


class FakeResponse:
    status_code = 200
    text = ""

    def __init__(self, data):
        self._data = data

    def json(self):
        return self._data

    def raise_for_status(self):
        return None


class FakeClient:
    def __init__(self, response):
        self.response = response

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def post(self, *args, **kwargs):
        return self.response


@pytest.fixture
def product_result():
    return SourceResult(
        source=Source.AMAZON,
        status=ScrapeStatus.FRESH,
        products=[Product(
            source=Source.AMAZON,
            title="Test Mouse",
            price=499,
            currency="INR",
            url="https://example.test/mouse",
        )],
    )


@pytest.mark.asyncio
async def test_extracts_text_from_multiple_gemini_parts(monkeypatch, product_result):
    monkeypatch.setattr(ai_service, "cache_get", lambda *args, **kwargs: None)
    response = FakeResponse({
        "candidates": [{"content": {"parts": [
            {"thought": True, "text": "internal reasoning"},
            {"text": "Choose the ₹499 option."},
            {"text": " It is the better value."},
        ]}}]
    })
    monkeypatch.setattr(ai_service.httpx, "AsyncClient", lambda *args, **kwargs: FakeClient(response))

    recommendation, error = await ai_service.generate_recommendation(
        "wireless mouse", [product_result], user_gemini_key="test-key"
    )

    assert recommendation == "Choose the ₹499 option.\nIt is the better value."
    assert error is None


@pytest.mark.asyncio
async def test_handles_gemini_blocked_response(monkeypatch, product_result):
    monkeypatch.setattr(ai_service, "cache_get", lambda *args, **kwargs: None)
    response = FakeResponse({"promptFeedback": {"blockReason": "SAFETY"}})
    monkeypatch.setattr(ai_service.httpx, "AsyncClient", lambda *args, **kwargs: FakeClient(response))

    recommendation, error = await ai_service.generate_recommendation(
        "wireless mouse", [product_result], user_gemini_key="test-key"
    )

    assert "lowest listed price is INR 499" in recommendation
    assert error == "Gemini could not answer this search — showing a data-based summary"


class SequenceClient:
    def __init__(self, responses):
        self.responses = iter(responses)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def post(self, *args, **kwargs):
        return next(self.responses)


@pytest.mark.asyncio
async def test_returns_data_summary_without_gemini_key(monkeypatch, product_result):
    monkeypatch.setattr(ai_service.settings, "gemini_api_key", "")

    recommendation, error = await ai_service.generate_recommendation(
        "wireless mouse", [product_result]
    )

    assert "lowest listed price is INR 499" in recommendation
    assert error == "AI provider not configured — showing a data-based summary"


@pytest.mark.asyncio
async def test_retries_and_falls_back_when_gemini_is_busy(monkeypatch, product_result):
    monkeypatch.setattr(ai_service, "cache_get", lambda *args, **kwargs: None)
    busy = FakeResponse({})
    busy.status_code = 503
    monkeypatch.setattr(ai_service.httpx, "AsyncClient", lambda *args, **kwargs: SequenceClient([busy, busy]))
    monkeypatch.setattr(ai_service.asyncio, "sleep", lambda *args, **kwargs: _immediate_sleep())

    recommendation, error = await ai_service.generate_recommendation(
        "wireless mouse", [product_result], user_gemini_key="test-key"
    )

    assert "lowest listed price is INR 499" in recommendation
    assert error == "Gemini is temporarily busy — showing a data-based summary"


async def _immediate_sleep():
    return None


@pytest.mark.asyncio
async def test_uses_cached_recommendation(monkeypatch, product_result):
    class CachedEntry:
        data = "Cached recommendation"

    monkeypatch.setattr(ai_service, "cache_get", lambda *args, **kwargs: CachedEntry())

    class FailingClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, *args, **kwargs):
            raise AssertionError("provider should not be called on a cache hit")

    monkeypatch.setattr(ai_service.httpx, "AsyncClient", lambda *args, **kwargs: FailingClient())

    recommendation, error = await ai_service.generate_recommendation(
        "wireless mouse", [product_result], user_gemini_key="test-key"
    )

    assert recommendation == "Cached recommendation"
    assert error is None


def test_extracts_openrouter_chat_content():
    text, error = ai_service._extract_openrouter_text({
        "choices": [{"message": {"content": "Use the lower-priced option."}}]
    })

    assert text == "Use the lower-priced option."
    assert error is None


@pytest.mark.asyncio
async def test_uses_openrouter_after_gemini_busy(monkeypatch, product_result):
    monkeypatch.setattr(ai_service, "cache_get", lambda *args, **kwargs: None)
    monkeypatch.setattr(ai_service.asyncio, "sleep", lambda *args, **kwargs: _immediate_sleep())

    busy = FakeResponse({})
    busy.status_code = 503
    openrouter_response = FakeResponse({
        "choices": [{"message": {"content": "Use the lower-priced option."}}]
    })
    clients = iter([
        SequenceClient([busy, busy]),
        FakeClient(openrouter_response),
    ])
    monkeypatch.setattr(ai_service.httpx, "AsyncClient", lambda *args, **kwargs: next(clients))

    recommendation, error = await ai_service.generate_recommendation(
        "wireless mouse",
        [product_result],
        user_gemini_key="test-gemini-key",
        user_openrouter_key="test-openrouter-key",
    )

    assert recommendation == "Use the lower-priced option."
    assert error is None


@pytest.mark.asyncio
async def test_singleflight_deduplicates_concurrent_provider_calls(monkeypatch, product_result):
    class CountingClient(FakeClient):
        calls = 0

        async def post(self, *args, **kwargs):
            self.calls += 1
            await asyncio.sleep(0.01)
            return FakeResponse({
                "candidates": [{"content": {"parts": [{"text": "Shared recommendation."}]}}]
            })

    client = CountingClient(None)
    monkeypatch.setattr(ai_service, "cache_get", lambda *args, **kwargs: None)
    monkeypatch.setattr(ai_service, "cache_store", lambda *args, **kwargs: None)
    monkeypatch.setattr(ai_service.httpx, "AsyncClient", lambda *args, **kwargs: client)

    responses = await asyncio.gather(*[
        ai_service.generate_recommendation("wireless mouse", [product_result], user_gemini_key="test-key")
        for _ in range(25)
    ])

    assert client.calls == 1
    assert {recommendation for recommendation, _ in responses} == {"Shared recommendation."}
