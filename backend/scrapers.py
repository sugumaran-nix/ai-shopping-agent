import httpx
from bs4 import BeautifulSoup
from typing import List, Optional

# FIXED: Removed the dots
from models import Product
from config import settings

SCRAPER_API_URL = "https://api.scraperapi.com"

async def scrape_with_api(url: str) -> Optional[str]:
    """Scrape URL using ScraperAPI with error handling."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                SCRAPER_API_URL,
                params={"api_key": settings.scraper_api_key, "url": url},
            )
            response.raise_for_status()
            return response.text
    except Exception as e:
        print(f"ScraperAPI error for {url}: {e}")
        return None

async def scrape_amazon(query: str, limit: int = 8) -> List[Product]:
    """Scrape Amazon products."""
    try:
        url = f"https://www.amazon.in/s?k={query.replace(' ', '+')}"
        html = await scrape_with_api(url)
        if not html:
            return []
        
        soup = BeautifulSoup(html, "html.parser")
        products = []
        
        for item in soup.select("[data-component-type='s-search-result']")[:limit]:
            try:
                title_elem = item.select_one("h2 a span")
                price_elem = item.select_one(".a-price .a-offscreen")
                rating_elem = item.select_one(".a-icon-alt")
                img_elem = item.select_one("img.s-image")
                link_elem = item.select_one("h2 a")
                
                if not (title_elem and price_elem and link_elem):
                    continue
                
                price_text = price_elem.text.replace("₹", "").replace(",", "").strip()
                price = float(price_text)
                
                rating = None
                if rating_elem:
                    rating_text = rating_elem.text.split()[0]
                    rating = float(rating_text)
                
                products.append(Product(
                    title=title_elem.text.strip(),
                    price=price,
                    rating=rating,
                    image_url=img_elem["src"] if img_elem else None,
                    product_url=f"https://www.amazon.in{link_elem['href']}",
                    site="amazon"
                ))
            except Exception as e:
                print(f"Error parsing Amazon product: {e}")
                continue
        
        return products
    except Exception as e:
        print(f"Amazon scraper failed: {e}")
        return []

async def scrape_flipkart(query: str, limit: int = 8) -> List[Product]:
    """Scrape Flipkart products."""
    try:
        url = f"https://www.flipkart.com/search?q={query.replace(' ', '+')}"
        html = await scrape_with_api(url)
        if not html:
            return []
        
        soup = BeautifulSoup(html, "html.parser")
        products = []
        
        for item in soup.select("div._1AtVbE")[:limit]:
            try:
                title_elem = item.select_one("div._4rR01T")
                price_elem = item.select_one("div._30jeq3")
                rating_elem = item.select_one("div._3LWZlK")
                img_elem = item.select_one("img._396cs4")
                link_elem = item.select_one("a._1fQZEK")
                
                if not (title_elem and price_elem and link_elem):
                    continue
                
                price_text = price_elem.text.replace("₹", "").replace(",", "").strip()
                price = float(price_text)
                
                rating = None
                if rating_elem:
                    rating = float(rating_elem.text.strip())
                
                products.append(Product(
                    title=title_elem.text.strip(),
                    price=price,
                    rating=rating,
                    image_url=img_elem["src"] if img_elem else None,
                    product_url=f"https://www.flipkart.com{link_elem['href']}",
                    site="flipkart"
                ))
            except Exception as e:
                print(f"Error parsing Flipkart product: {e}")
                continue
        
        return products
    except Exception as e:
        print(f"Flipkart scraper failed: {e}")
        return []
