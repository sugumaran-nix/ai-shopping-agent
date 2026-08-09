"""
Local recommendation engine — no API key, no rate limits, runs forever free.

Logic:
1. Find cheapest valid product across all sources
2. Find best discount
3. Find highest rated (if available)
4. Compare prices across stores for the same/similar item
5. Generate a plain-English recommendation from the data
"""
from __future__ import annotations
from models import SourceResult, Product, Status


def _all_products(results: list[SourceResult]) -> list[Product]:
    return [
        p
        for r in results
        if r.status != Status.UNAVAILABLE
        for p in r.products
    ]


def _source_label(source: str) -> str:
    return {
        "amazon":   "Amazon",
        "flipkart": "Flipkart",
        "ajio":     "AJIO",
        "snapdeal": "Snapdeal",
        "croma":    "Croma",
    }.get(source, source.title())


def generate_recommendation(
    query: str,
    results: list[SourceResult],
) -> tuple[str | None, str | None]:
    """
    Returns (recommendation_text, error).
    Exactly one will be non-None.
    """
    products = _all_products(results)

    if not products:
        return None, "No products found across any store to analyze."

    # ── Best price ────────────────────────────────────────────────
    cheapest = min(products, key=lambda p: p.price)

    # ── Best discount ─────────────────────────────────────────────
    with_discount = [p for p in products if p.discount_pct and p.discount_pct > 0]
    best_discount = max(with_discount, key=lambda p: p.discount_pct or 0) if with_discount else None

    # ── Best rated ────────────────────────────────────────────────
    with_rating = [p for p in products if p.rating and p.rating > 0]
    best_rated  = max(with_rating, key=lambda p: p.rating or 0) if with_rating else None

    # ── Price range across stores ─────────────────────────────────
    prices_by_source: dict[str, float] = {}
    for p in products:
        src = p.source.value
        if src not in prices_by_source or p.price < prices_by_source[src]:
            prices_by_source[src] = p.price

    price_range_parts = [
        f"{_source_label(src)}: ₹{price:,.0f}"
        for src, price in sorted(prices_by_source.items(), key=lambda x: x[1])
    ]

    # ── Stale sources ─────────────────────────────────────────────
    stale = [_source_label(r.source.value) for r in results if r.status == Status.STALE]
    unavailable = [_source_label(r.source.value) for r in results if r.status == Status.UNAVAILABLE]

    # ── Build recommendation text ─────────────────────────────────
    lines: list[str] = []

    # Opening
    total = len(products)
    stores = len(prices_by_source)
    lines.append(
        f"Found {total} products for \"{query}\" across {stores} store{'s' if stores != 1 else ''}."
    )

    # Price range
    if len(price_range_parts) > 1:
        lines.append(f"Lowest prices by store — {', '.join(price_range_parts)}.")

    # Best pick
    cheapest_title = (cheapest.title[:60] + "…") if len(cheapest.title) > 60 else cheapest.title
    lines.append(
        f"Best price: {cheapest_title} on {_source_label(cheapest.source.value)} "
        f"at ₹{cheapest.price:,.0f}."
    )

    # Best discount
    if best_discount and best_discount.discount_pct and best_discount.discount_pct >= 10:
        disc_title = (best_discount.title[:50] + "…") if len(best_discount.title) > 50 else best_discount.title
        lines.append(
            f"Biggest discount: {disc_title} on {_source_label(best_discount.source.value)} "
            f"at {best_discount.discount_pct}% off (₹{best_discount.price:,.0f})."
        )

    # Best rated
    if best_rated and best_rated.rating and best_rated.rating >= 4.0:
        rated_title = (best_rated.title[:50] + "…") if len(best_rated.title) > 50 else best_rated.title
        review_str  = f" from {best_rated.review_count:,} reviews" if best_rated.review_count else ""
        lines.append(
            f"Top rated: {rated_title} on {_source_label(best_rated.source.value)} "
            f"with {best_rated.rating:.1f}★{review_str}."
        )

    # Stale / unavailable caveat
    if stale:
        lines.append(
            f"Note: {', '.join(stale)} returned cached data — "
            f"those prices may not be current."
        )
    if unavailable:
        lines.append(
            f"{', '.join(unavailable)} could not be reached this time."
        )

    return " ".join(lines), None
