import os
from typing import List

from models.product import Product

def get_client():
    from google import genai
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def build_prompt(query: str, products: List[Product]) -> str:
    product_list = []
    for i, p in enumerate(products, 1):
        line = f"{i}. [{p.site.upper()}] {p.title}\n   Price: ₹{p.price}"
        if p.discount:
            line += f" (MRP: ₹{p.original_price}, {p.discount}% off)"
        if p.rating:
            line += f"\n   Rating: {p.rating}/5 ({p.reviews} reviews)"
        line += f"\n   URL: {p.product_url}"
        product_list.append(line)
    products_text = "\n\n".join(product_list)
    return f"""You are an expert Indian shopping assistant. A user searched for: "{query}"

Here are the products found across Amazon, Flipkart, Meesho, and Myntra:

{products_text}

Your job:
1. BEST PICK — recommend the single best product and explain why in 2-3 lines
2. BEST VALUE — recommend the best value-for-money option
3. COMPARISON — a short 3-4 line comparison of key differences across sites
4. TIPS — 1-2 smart buying tips specific to this product category

Be specific, mention prices and site names. Keep total response under 250 words.
Write in a friendly, helpful tone like a knowledgeable friend."""

async def analyze_products(query: str, products: List[Product]) -> str:
    if not products:
        return "No products were found. Try a different search query or check back later."
    try:
        client = get_client()
        prompt = build_prompt(query, products)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        return response.text
    except Exception as e:
        print(f"[Gemini] Error: {e}")
        return "AI analysis unavailable right now. Please check the product results above."
