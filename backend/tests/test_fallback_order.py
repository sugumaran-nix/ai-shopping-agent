import pytest

from models import Product, Source


def product(source: Source, title: str = "Poco C51 Phone Case") -> Product:
    return Product(source=source, title=title, price=199, currency="INR", url=f"https://{source.value}.test/item")


@pytest.mark.asyncio
async def test_meesho_prefers_direct_api(monkeypatch):
    from scrapers.meesho import MeeshoScraper

    expected = {"title": "Poco C51 Phone Case", "price": 199, "currency": "INR", "url": "https://meesho.test/item"}
    monkeypatch.setattr("scrapers.meesho.cache_module.get", lambda *_: None)
    monkeypatch.setattr("scrapers.meesho.cache_module.store", lambda *_: None)
    monkeypatch.setattr(MeeshoScraper, "_try_internal_api", lambda self, query: _async_value([expected]))
    monkeypatch.setattr("scrapers.meesho.render_page_html", _unexpected_call)
    monkeypatch.setattr("scrapers.meesho.fetch_html", _unexpected_call)

    result = await MeeshoScraper()._fetch("poco c51 phone case", "key")

    assert [item.title for item in result] == ["Poco C51 Phone Case"]


@pytest.mark.asyncio
async def test_meesho_falls_back_browser_then_provider(monkeypatch):
    from scrapers.meesho import MeeshoScraper

    expected = {"title": "Poco C51 Phone Case", "price": 199, "currency": "INR", "url": "https://meesho.test/item"}
    monkeypatch.setattr(MeeshoScraper, "_try_internal_api", lambda self, query: _async_value([]))
    monkeypatch.setattr("scrapers.meesho.render_page_html", lambda *args, **kwargs: _async_value("browser"))
    monkeypatch.setattr(MeeshoScraper, "parse", lambda self, html: [expected] if html == "browser" else [])
    monkeypatch.setattr("scrapers.meesho.fetch_html", _unexpected_call)

    result = await MeeshoScraper()._fetch("poco c51 phone case", "key")

    assert len(result) == 1


@pytest.mark.asyncio
async def test_myntra_prefers_direct_api(monkeypatch):
    from scrapers.myntra import MyntraScraper

    expected = product(Source.MYNTRA)
    monkeypatch.setattr(MyntraScraper, "_try_internal_api", lambda self, query: _async_value([expected]))
    monkeypatch.setattr("scrapers.myntra.render_page_html", _unexpected_call)
    monkeypatch.setattr(MyntraScraper, "_try_provider_fallback", _unexpected_call)

    result = await MyntraScraper()._fetch("poco c51 phone case", "key")

    assert result == [expected]


@pytest.mark.asyncio
async def test_myntra_uses_browser_before_provider(monkeypatch):
    from scrapers.myntra import MyntraScraper

    expected = product(Source.MYNTRA)
    monkeypatch.setattr(MyntraScraper, "_try_internal_api", lambda self, query: _async_value([]))
    monkeypatch.setattr("scrapers.myntra.render_page_html", lambda *args, **kwargs: _async_value("browser"))
    monkeypatch.setattr(MyntraScraper, "_parse_html", lambda self, html, query=None: [expected])
    monkeypatch.setattr(MyntraScraper, "_try_provider_fallback", _unexpected_call)

    result = await MyntraScraper()._fetch("poco c51 phone case", "key")

    assert result == [expected]


@pytest.mark.asyncio
async def test_jiomart_uses_browser_before_provider(monkeypatch):
    from scrapers import jiomart
    from scrapers.jiomart import JiomartScraper

    class Response:
        text = "<html>empty</html>"

        def raise_for_status(self):
            return None

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, *args, **kwargs):
            return Response()

    expected = {"title": "Poco C51 Phone Case", "price": 199, "currency": "INR", "url": "https://jiomart.test/item"}
    monkeypatch.setattr(jiomart.httpx, "AsyncClient", lambda *args, **kwargs: Client())
    monkeypatch.setattr("scrapers.jiomart.render_page_html", lambda *args, **kwargs: _async_value("browser"))
    monkeypatch.setattr(JiomartScraper, "_parse_html", lambda self, html: [expected] if html == "browser" else [])
    monkeypatch.setattr("scrapers.jiomart.fetch_html", _unexpected_call)

    result = await JiomartScraper()._fetch("poco c51 phone case", "key")

    assert len(result) == 1
    assert result[0].title == "Poco C51 Phone Case"


async def _async_value(value):
    return value


async def _unexpected_call(*args, **kwargs):
    raise AssertionError("fallback should not run at this stage")
