import google.generativeai as genai
from typing import List
from models import Product
from config import settings

genai.configure(api_key=settings.gemini_api_key)

async def analyze_products(query: str, products: List[Product]) -> str:
    top_products = sorted(
        [p for p in products if p.price and p.price > 0],
        key=lambda p: (p.rating or 0, -p.price)
    )[:10]

    if not top_products:
        return "No products found for analysis. Try a different search term."

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
    # Try models in order — fall back if quota exceeded
    for model_name in ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash"]:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            err = str(e)
            print(f"[Gemini] {model_name} failed: {err[:120]}")
            if "429" in err or "quota" in err.lower():
                continue  # try next model
            break  # non-quota error, stop trying

    return "AI analysis is temporarily unavailable. Browse the results below for the best deals!"
