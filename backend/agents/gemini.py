import google.generativeai as genai
from typing import List
import os

from models.product import Product

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

def build_prompt(query: str, products: List[Product]) -> str:
    product_list = []
    for i, p in enumerate(products, 1):
        product_list.append(
            f"{i}. [{p.site.upper()}] {p.title}\n"
            f"   Price: ₹{p.price}"
            + (f" (MRP: ₹{p.original_price}, {p.discount}% off)" if p.discount else "")
            + (f"\n   Rating: {p.rating}/5 ({p.reviews} reviews)" if p.rating else "")
            + f"\n   URL: {p.product_url}"
        )
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
        return "No products were found across the sites. Try a different search query or check back later."
    try:
        prompt = build_prompt(query, products)
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"[Gemini] Error: {e}")
        return "AI analysis unavailable right now. Please check the product results above."
