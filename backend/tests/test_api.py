"""Integration tests for the API endpoints."""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from main import app
from models import ScrapeStatus, SearchResponse, Source, SourceResult

client = TestClient(app)


def _mock_result(source: Source, n_products: int = 2) -> SourceResult:
    from models import Product
    from datetime import datetime
    products = [
        Product(
            source=source,
            title=f"{source.value.title()} Product {i}",
            price=100.0 * (i + 1),
            url=f"https://example.com/{source.value}/{i}",
        )
        for i in range(n_products)
    ]
    return SourceResult(source=source, status=ScrapeStatus.FRESH, products=products)


class TestPing:
    def test_ping_returns_ok(self):
        r = client.get("/api/ping")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestSearch:
    def test_query_too_short_rejected(self):
        r = client.get("/api/v1/search?q=a")
        assert r.status_code == 422

    def test_empty_query_rejected(self):
        r = client.get("/api/v1/search?q=")
        assert r.status_code == 422

    @patch("services.aggregator.run_search", new_callable=AsyncMock)
    def test_valid_search_returns_response(self, mock_run):
        mock_run.return_value = SearchResponse(
            query="wireless mouse",
            results=[_mock_result(Source.AMAZON)],
            ai_recommendation="Great choice: Amazon Product 0 at INR 100.00.",
        )
        r = client.get("/api/v1/search?q=wireless+mouse")
        assert r.status_code == 200
        data = r.json()
        assert data["query"] == "wireless mouse"
        assert len(data["results"]) == 1

    def test_response_has_request_id_header(self):
        with patch("services.aggregator.run_search", new_callable=AsyncMock) as m:
            m.return_value = SearchResponse(query="q", results=[])
            r = client.get("/api/v1/search?q=mouse")
        assert "X-Request-ID" in r.headers

    def test_compat_route_works(self):
        with patch("services.aggregator.run_search", new_callable=AsyncMock) as m:
            m.return_value = SearchResponse(query="q", results=[])
            r = client.get("/api/search?q=mouse")
        assert r.status_code == 200


class TestCacheStats:
    def test_cache_stats_returns_dict(self):
        r = client.get("/api/v1/cache/stats")
        assert r.status_code == 200
        data = r.json()
        assert "hit_rate_pct" in data
