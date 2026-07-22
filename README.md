# AI Shopping Agent

An intelligent shopping comparison tool that scrapes products from Amazon, Flipkart, Meesho, and Myntra, then uses Google Gemini AI to provide buying recommendations.

## 🚀 Features

- **Multi-platform scraping**: Compare prices across 4 major e-commerce sites
- **AI-powered analysis**: Get intelligent buying recommendations
- **Real-time sorting**: Sort by price, rating, or relevance
- **Premium UI/UX**: Modern glassmorphism design with smooth animations
- **Rate limiting & caching**: Optimized for performance and cost

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python)
- httpx + BeautifulSoup (Web scraping)
- Google Gemini 2.0 Flash (AI analysis)
- ScraperAPI (Anti-bot bypass)

**Frontend:**
- Next.js 14 (React)
- TypeScript
- Tailwind CSS
- Framer Motion (Animations)

## 📦 Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- ScraperAPI key ([Get one here](https://www.scraperapi.com/))
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sugumaran-nix/ai-shopping-agent.git
   cd ai-shopping-agent
