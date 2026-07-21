import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .amazon import scrape_amazon
from .flipkart import scrape_flipkart
from .meesho import scrape_meesho
from .myntra import scrape_myntra
