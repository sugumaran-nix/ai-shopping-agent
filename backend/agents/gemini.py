import google.generativeai as genai
from typing import List

# FIXED: Removed '.product'
from models import Product
from config import settings

genai.configure(api_key=settings.gemini_api_key)

async def analyze_products(query: str, products: List[Product]) -> str:
    """Analyze products using Gemini."""
    # Limit to top 12 products to reduce token costs
    top_products = sorted(
        [p for p in products if p.price and p.price > 0],
        key=lambda p: (p.rating or 0, -p.price)
    )[:12]
    
    if not top_products:
        return "No products with valid pricing found for analysis."
    
    product_list = "\n".join([
        f"- {p.title} | ₹{p.price} | Rating: {p.rating or 'N/A'} | {p.site.capitalize()}"
        for p in top_products
    ])
    
    prompt = f"""Analyze these {len(top_products)} products for "{query}" and provide:
1. BEST OVERALL
2. BEST VALUE
3. PROS (3-4 points)
4. CONS (2-3 points)
5. VERDICT (2-3 sentences)

Products:
{product_list}
"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"AI analysis temporarily unavailable. Error: {str(e)}"
