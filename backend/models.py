   from pydantic import BaseModel, Field
   from typing import Optional, List
   from enum import Enum

   class Site(str, Enum):
       AMAZON = "amazon"
       FLIPKART = "flipkart"
       MEESHO = "meesho"
       MYNTRA = "myntra"

   class SearchRequest(BaseModel):
       query: str = Field(..., min_length=2, max_length=100, description="Search query")
       sites: List[Site] = Field(default=[s for s in Site], description="Sites to search")
       limit: int = Field(default=8, ge=1, le=20, description="Results per site")

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
       available: Optional[bool] = None  # <-- ADDED THIS TO PREVENT VALIDATION CRASH

   class SearchResponse(BaseModel):
       query: str
       products: List[Product]
       analysis: str
       total: int
