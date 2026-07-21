from pydantic import BaseModel
from typing import Optional

class Product(BaseModel):
    title: str
    price: float
    original_price: Optional[float] = None
    discount: Optional[int] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None
    image_url: Optional[str] = None
    product_url: str
    site: str
    available: bool = True
