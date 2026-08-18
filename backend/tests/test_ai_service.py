from models import Product, ScrapeStatus, Source, SourceResult
from services import ai_service


def make_product(source: Source, title: str, price: float, rating: float | None, reviews: int | None, index: int) -> Product:
    return Product(
        source=source,
        title=title,
        price=price,
        currency="INR",
        rating=rating,
        review_count=reviews,
        url=f"https://example.test/{source.value}/{index}",
    )


def test_weighted_score_uses_price_rating_and_reviews():
    result = SourceResult(
        source=Source.AMAZON,
        status=ScrapeStatus.FRESH,
        products=[
            make_product(Source.AMAZON, "Budget Mouse", 100, 4.0, 10, 1),
            make_product(Source.AMAZON, "Premium Mouse", 200, 5.0, 100, 2),
            make_product(Source.AMAZON, "Balanced Mouse", 150, 4.5, 50, 3),
        ],
    )

    ranked = ai_service._score_products([result])

    assert [item.product.title for item in ranked] == ["Budget Mouse", "Balanced Mouse", "Premium Mouse"]
    assert ranked[0].price_score == 100
    assert ranked[0].rating_score == 80
    assert ranked[0].review_score == 0
    assert ranked[0].total_score == 72
    assert ranked[1].total_score > ranked[2].total_score


def test_recommendation_returns_top_three_with_explainable_scores():
    result = SourceResult(
        source=Source.FLIPKART,
        status=ScrapeStatus.FRESH,
        products=[make_product(Source.FLIPKART, f"Mouse {index}", 100 + index * 10, 4.0 + index * 0.1, index * 10, index) for index in range(5)],
    )

    recommendation, error = ai_service.generate_recommendation("wireless mouse", [result])

    assert error is None
    assert recommendation is not None
    assert recommendation.startswith('Top 3 picks for "wireless mouse"')
    assert "Weighted score: price 40% + rating 40% + review count 20%." in recommendation
    assert recommendation.count("score ") == 3
    assert "Mouse 0" in recommendation
    assert "Mouse 3" not in recommendation or "Mouse 4" not in recommendation
    assert "Verify the retailer page" in recommendation


def test_unavailable_sources_are_excluded():
    unavailable = SourceResult(
        source=Source.AMAZON,
        status=ScrapeStatus.UNAVAILABLE,
        products=[make_product(Source.AMAZON, "Unavailable Mouse", 1, 5.0, 999, 1)],
    )
    available = SourceResult(
        source=Source.MEESHO,
        status=ScrapeStatus.STALE,
        products=[make_product(Source.MEESHO, "Saved Mouse", 499, 4.2, 12, 2)],
    )

    recommendation, error = ai_service.generate_recommendation("mouse", [unavailable, available])

    assert error is None
    assert recommendation is not None
    assert "Saved Mouse" in recommendation
    assert "Unavailable Mouse" not in recommendation


def test_no_products_returns_a_clear_data_error():
    result = SourceResult(source=Source.MYNTRA, status=ScrapeStatus.UNAVAILABLE, products=[])

    recommendation, error = ai_service.generate_recommendation("laptop stand", [result])

    assert recommendation is None
    assert error == "No product data available to rank"


def test_equal_values_normalize_to_full_scores():
    result = SourceResult(
        source=Source.MYNTRA,
        status=ScrapeStatus.FRESH,
        products=[
            make_product(Source.MYNTRA, "Same One", 100, 4.0, 10, 1),
            make_product(Source.MYNTRA, "Same Two", 100, 4.0, 10, 2),
        ],
    )

    ranked = ai_service._score_products([result])

    assert all(item.price_score == 100 for item in ranked)
    assert all(item.review_score == 100 for item in ranked)
    assert all(item.total_score == 92 for item in ranked)
    assert [item.product.title for item in ranked] == ["Same One", "Same Two"]
