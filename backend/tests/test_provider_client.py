import pytest
import httpx

from utils.http_client import (
    ProviderCredentials,
    _fetch_brightdata,
    _fetch_scraperapi,
    _fetch_scrapingant,
)


class FakeResponse:
    def __init__(self, *, text='', headers=None, payload=None, status_code=200):
        self.text = text
        self.headers = headers or {'content-type': 'text/html'}
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            request = httpx.Request('GET', 'https://provider.test')
            response = httpx.Response(self.status_code, request=request)
            raise httpx.HTTPStatusError('provider error', request=request, response=response)

    def json(self):
        return self._payload


class FakeClient:
    def __init__(self, response):
        self.response = response
        self.calls = []

    async def get(self, *args, **kwargs):
        self.calls.append(('GET', args, kwargs))
        return self.response

    async def post(self, *args, **kwargs):
        self.calls.append(('POST', args, kwargs))
        return self.response


@pytest.mark.asyncio
async def test_scraperapi_request_uses_key_and_target_query_params():
    client = FakeClient(FakeResponse(text='<html>scraperapi</html>'))
    credentials = ProviderCredentials(scraperapi_key='scraper-key')

    html = await _fetch_scraperapi(client, 'https://shop.test/search?q=mouse', credentials, True, 'in')

    assert html == '<html>scraperapi</html>'
    method, args, kwargs = client.calls[0]
    assert method == 'GET'
    assert args[0] == 'https://api.scraperapi.com/'
    assert kwargs['params']['api_key'] == 'scraper-key'
    assert kwargs['params']['url'] == 'https://shop.test/search?q=mouse'
    assert kwargs['params']['country_code'] == 'in'
    assert kwargs['params']['render'] is True


@pytest.mark.asyncio
async def test_scrapingant_request_uses_query_auth_and_browser_flags():
    client = FakeClient(FakeResponse(text='<html>ok</html>'))
    credentials = ProviderCredentials(scrapingant_key='ant-key')

    html = await _fetch_scrapingant(client, 'https://shop.test/search?q=mouse', credentials, True, 'in')

    assert html == '<html>ok</html>'
    method, args, kwargs = client.calls[0]
    assert method == 'GET'
    assert args[0] == 'https://api.scrapingant.com/v2/general'
    assert kwargs['params']['x-api-key'] == 'ant-key'
    assert kwargs['params']['browser'] is True
    assert kwargs['params']['wait_for_selector'] == 'body'


@pytest.mark.asyncio
async def test_brightdata_unwraps_raw_body_envelope():
    client = FakeClient(FakeResponse(
        headers={'content-type': 'application/json'},
        payload={'body': '<html>bright</html>'},
    ))
    credentials = ProviderCredentials(brightdata_key='bd-key', brightdata_zone='web_unlocker1')

    html = await _fetch_brightdata(client, 'https://shop.test/search?q=mouse', credentials, False, 'in')

    assert html == '<html>bright</html>'
    method, args, kwargs = client.calls[0]
    assert method == 'POST'
    assert args[0] == 'https://api.brightdata.com/request'
    assert kwargs['headers']['Authorization'] == 'Bearer bd-key'
    assert kwargs['json']['zone'] == 'web_unlocker1'
    assert kwargs['json']['format'] == 'raw'


@pytest.mark.asyncio
async def test_provider_credentials_use_default_brightdata_zone():
    credentials = ProviderCredentials(brightdata_key='bd-key', brightdata_zone='')
    assert credentials.has_brightdata is True
    assert credentials.resolved_brightdata_zone == 'web_unlocker1'
