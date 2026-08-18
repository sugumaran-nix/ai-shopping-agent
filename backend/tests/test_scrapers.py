"""Unit tests for scraper parsing logic (no network calls)."""
import pytest
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

    def test_offscreen_price(self):
        assert clean_price("₹1,499.00") == 1499.0


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
    def _html_card(self, title="Test Mouse", price="₹499.00", asin="B000TEST"):
        """Generate realistic Amazon card HTML matching current layout."""
        return f"""
        <div data-component-type="s-search-result" data-asin="{asin}">
            <h2><a href="/dp/{asin}"><span>{title}</span></a></h2>
            <span class="a-price">
                <span class="a-offscreen">{price}</span>
            </span>
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

    def test_skips_card_without_asin(self):
        scraper = AmazonScraper()
        html = """
        <html><body>
        <div data-component-type="s-search-result" data-asin="">
            <h2><a href="/dp/B000"><span>No ASIN Product</span></a></h2>
            <span class="a-price"><span class="a-offscreen">₹299</span></span>
        </div>
        </body></html>
        """
        assert scraper.parse(html) == []

    def test_skips_card_missing_price(self):
        scraper = AmazonScraper()
        html = """
        <html><body>
        <div data-component-type="s-search-result" data-asin="B000TEST">
            <h2><a href="/dp/B000"><span>No Price Product</span></a></h2>
        </div>
        </body></html>
        """
        assert scraper.parse(html) == []

    def test_skips_card_missing_title(self):
        scraper = AmazonScraper()
        html = """
        <html><body>
        <div data-component-type="s-search-result" data-asin="B000TEST">
            <span class="a-price"><span class="a-offscreen">₹299</span></span>
        </div>
        </body></html>
        """
        assert scraper.parse(html) == []

    def test_returns_empty_on_empty_html(self):
        scraper = AmazonScraper()
        assert scraper.parse("<html><body></body></html>") == []

    def test_parses_multiple_cards(self):
        scraper = AmazonScraper()
        cards = "".join([
            self._html_card(f"Product {i}", f"₹{(i+1)*100}.00", f"B000{i:04d}")
            for i in range(3)
        ])
        html = f"<html><body>{cards}</body></html>"
        results = scraper.parse(html)
        assert len(results) == 3


class TestMyntraParser:
    def test_parses_nested_api_payload(self):
        from scrapers.myntra import MyntraScraper

        products = MyntraScraper()._parse_api_response({"data": {"results": {"products": [
            {
                "brand": "Acme",
                "product": "Cotton Kurta",
                "discountedPrice": 799,
                "landingPageUrl": "acme/cotton-kurta/123",
            }
        ]}}})

        assert len(products) == 1
        assert products[0].title == "Acme Cotton Kurta"
        assert products[0].price == 799

    def test_parses_embedded_state(self):
        import json
        from scrapers.myntra import MyntraScraper

        state = {"searchData": {"results": {"products": [
            {"brand": "Brand", "name": "Dress", "price": "₹1,299", "slugV2": "brand/dress/1"}
        ]}}}
        html = f"<html><script>window.__myx = {json.dumps(state)};</script></html>"

        products = MyntraScraper()._parse_html(html)

        assert len(products) == 1
        assert products[0].price == 1299

    def test_parses_rendered_product_card(self):
        from scrapers.myntra import MyntraScraper

        html = """
        <li class="product-base">
          <h3 class="product-brand">Brand</h3>
          <h4 class="product-product">Shoes</h4>
          <span class="product-discountedPrice">₹2,499</span>
          <a href="/brand/shoes/2"><img data-src="https://img.test/2.jpg"></a>
        </li>
        """

        products = MyntraScraper()._parse_html(html)

        assert len(products) == 1
        assert products[0].price == 2499
        assert products[0].title == "Brand Shoes"


@pytest.mark.asyncio
async def test_fresh_cache_hit_skips_upstream_request(monkeypatch):
    from cache import CacheEntry
    from models import Product, ScrapeStatus, Source
    from scrapers.base import BaseScraper

    class DummyScraper(BaseScraper):
        source = Source.AMAZON

        def build_search_url(self, query: str) -> str:
            return "https://example.test/search"

        def parse(self, html: str) -> list[dict]:
            raise AssertionError("parser should not run on a fresh cache hit")

    cached_product = Product(
        source=Source.AMAZON,
        title="Cached product",
        price=499,
        currency="INR",
        url="https://example.test/cached",
    )
    monkeypatch.setattr(
        "scrapers.base.cache_module.get",
        lambda *args, **kwargs: CacheEntry(
            data=[cached_product.model_dump(mode="json")],
            stored_at=0,
            is_fresh=True,
        ),
    )

    async def fail_fetch(*args, **kwargs):
        raise AssertionError("upstream fetch should not run on a fresh cache hit")

    monkeypatch.setattr("scrapers.base.fetch_html", fail_fetch)
    result = await DummyScraper().search("cached product", scraperapi_key="unused")

    assert result.status == ScrapeStatus.FRESH
    assert len(result.products) == 1
    assert result.products[0].title == "Cached product"


class TestMyntraRelevance:
    def test_ranks_matching_products_and_drops_unrelated_titles(self):
        from models import Product, Source
        from scrapers.myntra import MyntraScraper

        products = [
            Product(source=Source.MYNTRA, title="Casual Cotton Shirt", price=599, url="https://myntra.test/shirt"),
            Product(source=Source.MYNTRA, title="Poco C51 Silicone Phone Case", price=199, url="https://myntra.test/case"),
            Product(source=Source.MYNTRA, title="Poco C51 Phone Cover Case", price=249, url="https://myntra.test/case-2"),
        ]

        filtered = MyntraScraper._filter_relevant_products(products, "poco c51 phone case")

        assert [product.title for product in filtered] == [
            "Poco C51 Silicone Phone Case",
            "Poco C51 Phone Cover Case",
        ]

    def test_keeps_all_products_when_query_has_no_terms(self):
        from models import Product, Source
        from scrapers.myntra import MyntraScraper

        product = Product(source=Source.MYNTRA, title="Cotton Shirt", price=599, url="https://myntra.test/shirt")
        assert MyntraScraper._filter_relevant_products([product], "a") == [product]
