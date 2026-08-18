"""Integration tests for the API layer."""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from main import app
from models import ScrapeStatus, SearchResponse, Source, SourceResult

client = TestClient(app)


def _make_result(source: Source, n: int = 2) -> SourceResult:
    from models import Product
    return SourceResult(
        source=source,
        status=ScrapeStatus.FRESH,
        products=[
            Product(
                source=source,
                title=f"{source.value.title()} Product {i}",
                price=100.0 * (i + 1),
                url=f"https://example.com/{source.value}/{i}",
            )
            for i in range(n)
        ],
    )


class TestPing:
    def test_returns_ok(self):
        r = client.get("/api/ping")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_returns_version(self):
        r = client.get("/api/ping")
        assert "version" in r.json()


class TestSearch:
    def test_single_char_rejected(self):
        r = client.get("/api/v1/search?q=a")
        assert r.status_code == 422

    def test_empty_query_rejected(self):
        r = client.get("/api/v1/search?q=")
        assert r.status_code == 422

    def test_missing_query_rejected(self):
        r = client.get("/api/v1/search")
        assert r.status_code == 422

    @patch("main.run_search", new_callable=AsyncMock)
    def test_valid_search_shape(self, mock_run):
        mock_run.return_value = SearchResponse(
            query="wireless mouse",
            results=[_make_result(Source.AMAZON)],
            ai_recommendation="The Amazon product at ₹100 is good value.",
        )
        r = client.get("/api/v1/search?q=wireless+mouse")
        assert r.status_code == 200
        data = r.json()
        assert data["query"] == "wireless mouse"
        assert len(data["results"]) == 1
        assert data["results"][0]["source"] == "amazon"
        assert data["results"][0]["status"] == "fresh"
        assert data["ai_recommendation"] is not None

    @patch("main.run_search", new_callable=AsyncMock)
    def test_response_fields_present(self, mock_run):
        mock_run.return_value = SearchResponse(query="shoes", results=[])
        r = client.get("/api/v1/search?q=shoes")
        data = r.json()
        for field in ("query", "results", "ai_recommendation", "ai_error", "request_id"):
            assert field in data

    @patch("main.run_search", new_callable=AsyncMock)
    def test_request_id_header_returned(self, mock_run):
        mock_run.return_value = SearchResponse(query="q", results=[])
        r = client.get("/api/v1/search?q=mouse")
        assert "X-Request-ID" in r.headers

    @patch("main.run_search", new_callable=AsyncMock)
    def test_compat_route_works(self, mock_run):
        mock_run.return_value = SearchResponse(query="q", results=[])
        r = client.get("/api/search?q=mouse")
        assert r.status_code == 200

    @patch("main.run_search", new_callable=AsyncMock)
    def test_security_headers_present(self, mock_run):
        mock_run.return_value = SearchResponse(query="q", results=[])
        r = client.get("/api/v1/search?q=mouse")
        assert r.headers.get("X-Content-Type-Options") == "nosniff"
        assert r.headers.get("X-Frame-Options") == "DENY"
        assert r.headers.get("X-XSS-Protection") == "1; mode=block"


class TestCacheStats:
    def test_returns_expected_fields(self):
        r = client.get("/api/v1/cache/stats")
        assert r.status_code == 200
        data = r.json()
        for field in ("hit_rate_pct", "disk_size_bytes", "entry_count", "total_requests"):
            assert field in data


class TestCacheClear:
    def test_returns_cleared_count(self):
        r = client.delete("/api/v1/cache")
        assert r.status_code == 200
        assert "cleared" in r.json()


class TestHealth:
    @patch("main.run_health_check", new_callable=AsyncMock)
    def test_returns_list(self, mock_health):
        from models import HealthCheckResult
        mock_health.return_value = [
            HealthCheckResult(source=Source.AMAZON, healthy=True, products_found=5)
        ]
        r = client.get("/api/v1/health")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert data[0]["source"] == "amazon"
        assert data[0]["healthy"] is True

    @patch("main.run_health_check", new_callable=AsyncMock)
    def test_compat_route(self, mock_health):
        mock_health.return_value = []
        r = client.get("/api/health")
        assert r.status_code == 200


class TestProviderKeyForwarding:
    @patch("main.run_search", new_callable=AsyncMock)
    def test_provider_headers_forwarded(self, mock_run):
        mock_run.return_value = SearchResponse(query="mouse", results=[])

        response = client.get(
            "/api/v1/search?q=mouse",
            headers={
                "X-ScraperAPI-Key": "test-scraperapi-key",
                "X-ScrapingAnt-Key": "test-scrapingant-key",
                "X-BrightData-Key": "test-brightdata-key",
                "X-BrightData-Zone": "web_unlocker1",
            },
        )

        assert response.status_code == 200
        credentials = mock_run.await_args.kwargs["provider_credentials"]
        assert credentials.scraperapi_key == "test-scraperapi-key"
        assert credentials.scrapingant_key == "test-scrapingant-key"
        assert credentials.brightdata_key == "test-brightdata-key"
        assert credentials.brightdata_zone == "web_unlocker1"

    def test_provider_http_logs_are_quiet(self):
        import logging

        assert logging.getLogger("httpx").level >= logging.WARNING
        assert logging.getLogger("httpcore").level >= logging.WARNING
