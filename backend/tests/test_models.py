"""Tests for data validation (models.py)."""
import pytest
from pydantic import ValidationError

from models import Product, Source


def _valid_product(**overrides) -> dict:
    base = {
        "source": Source.AMAZON,
        "title": "Wireless Mouse",
        "price": 499.0,
        "currency": "INR",
        "url": "https://www.amazon.in/dp/B000000",
    }
    return {**base, **overrides}


class TestProductValidation:
    def test_valid_product_passes(self):
        p = Product(**_valid_product())
        assert p.title == "Wireless Mouse"
        assert p.price == 499.0

    def test_price_must_be_positive(self):
        with pytest.raises(ValidationError):
            Product(**_valid_product(price=0))
        with pytest.raises(ValidationError):
            Product(**_valid_product(price=-10))

    def test_price_upper_bound(self):
        with pytest.raises(ValidationError):
            Product(**_valid_product(price=20_000_000))

    def test_title_too_short(self):
        with pytest.raises(ValidationError):
            Product(**_valid_product(title="AB"))

    def test_title_stripped(self):
        p = Product(**_valid_product(title="  Wireless Mouse  "))
        assert p.title == "Wireless Mouse"

    def test_url_must_be_absolute(self):
        with pytest.raises(ValidationError):
            Product(**_valid_product(url="/relative/path"))

    def test_rating_bounds(self):
        with pytest.raises(ValidationError):
            Product(**_valid_product(rating=6.0))
        with pytest.raises(ValidationError):
            Product(**_valid_product(rating=-1.0))

    def test_bad_image_url_silently_dropped(self):
        p = Product(**_valid_product(image_url="not-a-url"))
        assert p.image_url is None

    def test_valid_image_url_kept(self):
        p = Product(**_valid_product(image_url="https://cdn.example.com/img.jpg"))
        assert p.image_url == "https://cdn.example.com/img.jpg"
