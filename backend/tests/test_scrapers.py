"""Unit tests for scraper parsing logic (no network calls)."""
import pytest
from unittest.mock import AsyncMock, patch

from scrapers.amazon import AmazonScraper
from scrapers.flipkart import FlipkartScraper
from utils.headers import clean_price, clean_rating, clean_reviews, make_absolute_url


class TestCleanPrice:
    def test_rupee_symbol(self):
        assert clean_price("₹1,299") == 1299.0

    def test_dollar_sign(self):
        assert clean_price("$ 19.99") == 19.99

    def test_with_trailing_dot(self):
        assert clean_price("599.") == 599.0

    def test_empty_returns_none(self):
        assert clean_price("") is None
        assert clean_price(None) is None

    def test_zero_returns_none(self):
        assert clean_price("0") is None


class TestCleanRating:
    def test_float_string(self):
        assert clean_rating("4.3 out of 5") == 4.3

    def test_out_of_range_returns_none(self):
        assert clean_rating("6.0 stars") is None

    def test_empty_returns_none(self):
        assert clean_rating("") is None


class TestCleanReviews:
    def test_parenthetical_count(self):
        assert clean_reviews("(1,234 ratings)") == 1234

    def test_plain_number(self):
        assert clean_reviews("567") == 567

    def test_empty_returns_none(self):
        assert clean_reviews("") is None


class TestMakeAbsoluteUrl:
    def test_already_absolute(self):
        assert make_absolute_url("https://example.com/path", "https://example.com") == "https://example.com/path"

    def test_relative_path(self):
        assert make_absolute_url("/dp/B000", "https://www.amazon.in") == "https://www.amazon.in/dp/B000"

    def test_protocol_relative(self):
        assert make_absolute_url("//cdn.example.com/img.jpg", "https://example.com") == "https://cdn.example.com/img.jpg"

    def test_empty_returns_empty(self):
        assert make_absolute_url("", "https://example.com") == ""


class TestAmazonParser:
    def _html_card(self, title="Test Mouse", price="499", asin="B000TEST"):
        return f"""
        <div data-component-type="s-search-result">
            <h2><a href="/dp/{asin}"><span>{title}</span></a></h2>
            <span class="a-price-whole">{price}</span>
            <span class="a-price-symbol">₹</span>
        </div>
        """

    def test_parses_valid_card(self):
        scraper = AmazonScraper()
        html = f"<html><body>{self._html_card()}</body></html>"
        results = scraper.parse(html)
        assert len(results) == 1
        assert results[0]["title"] == "Test Mouse"
        assert results[0]["price"] == 499.0

    def test_skips_card_missing_price(self):
        scraper = AmazonScraper()
        html = """
        <html><body>
        <div data-component-type="s-search-result">
            <h2><a href="/dp/B000"><span>No Price Product</span></a></h2>
        </div>
        </body></html>
        """
        assert scraper.parse(html) == []

    def test_skips_card_missing_title(self):
        scraper = AmazonScraper()
        html = """
        <html><body>
        <div data-component-type="s-search-result">
            <span class="a-price-whole">299</span>
        </div>
        </body></html>
        """
        assert scraper.parse(html) == []

    def test_returns_empty_on_empty_html(self):
        scraper = AmazonScraper()
        assert scraper.parse("<html><body></body></html>") == []
