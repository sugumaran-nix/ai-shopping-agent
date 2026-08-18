"""Deterministic, data-backed shopping recommendations.

Recommendations are calculated locally from the products returned by the
marketplace scrapers. No external AI provider, API key, or network request is
needed after the product search completes.
"""
from __future__ import annotations

from dataclasses import dataclass

from models import Product, ScrapeStatus, SourceResult


@dataclass(frozen=True)
class ScoredProduct:
    product: Product
    price_score: float
    rating_score: float
    review_score: float
    total_score: float


def _normalize(value: float, minimum: float, maximum: float, *, lower_is_better: bool = False) -> float:
    """Normalize a value to 0-100, optionally rewarding lower values."""
    if maximum <= minimum:
        return 100.0
    normalized = (value - minimum) / (maximum - minimum) * 100
    return max(0.0, min(100.0, 100.0 - normalized if lower_is_better else normalized))


def _score_products(results: list[SourceResult]) -> list[ScoredProduct]:
    products = [
        product
        for result in results
        if result.status != ScrapeStatus.UNAVAILABLE
        for product in result.products
        if product.price > 0
    ]
    if not products:
        return []

    prices = [product.price for product in products]
    review_counts = [float(product.review_count or 0) for product in products]
    minimum_price, maximum_price = min(prices), max(prices)
    minimum_reviews, maximum_reviews = min(review_counts), max(review_counts)

    scored: list[ScoredProduct] = []
    for product in products:
        price_score = _normalize(product.price, minimum_price, maximum_price, lower_is_better=True)
        rating_score = (product.rating or 0.0) / 5.0 * 100
        review_score = _normalize(float(product.review_count or 0), minimum_reviews, maximum_reviews)
        total_score = price_score * 0.40 + rating_score * 0.40 + review_score * 0.20
        scored.append(ScoredProduct(product, price_score, rating_score, review_score, total_score))

    return sorted(
        scored,
        key=lambda item: (
            -item.total_score,
            -item.rating_score,
            -item.review_score,
            item.product.price,
            item.product.source.value,
            item.product.title.casefold(),
            item.product.url,
        ),
    )


def _fallback_recommendation(query: str, results: list[SourceResult]) -> str | None:
    """Return the transparent weighted top-three ranking for a search."""
    ranked = _score_products(results)
    if not ranked:
        return None

    lines = [
        f'Top 3 picks for "{query}"',
        "Weighted score: price 40% + rating 40% + review count 20%.",
        "Price rewards the lower listing price; missing ratings or reviews receive no points.",
    ]
    for index, item in enumerate(ranked[:3], start=1):
        product = item.product
        lines.append(
            f"{index}. {product.title} — {product.currency} {product.price:.0f} on "
            f"{product.source.value.title()} — score {item.total_score:.1f}/100 "
            f"(price {item.price_score:.0f}, rating {item.rating_score:.0f}, reviews {item.review_score:.0f})."
        )
    lines.append("Verify the retailer page for current price, availability, and delivery before buying.")
    return "\n".join(lines)


def generate_recommendation(query: str, results: list[SourceResult]) -> tuple[str | None, str | None]:
    """Generate a local recommendation without provider calls or failure-prone dependencies."""
    recommendation = _fallback_recommendation(query, results)
    if recommendation is None:
        return None, "No product data available to rank"
    return recommendation, None
