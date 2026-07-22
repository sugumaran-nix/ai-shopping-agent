FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from the backend directory (assuming root build context)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application code into a 'backend' folder
COPY backend/ ./backend/

# Expose port
EXPOSE 8000

# Run with production settings 
# NOTE: --workers 1 is recommended for Render's Starter/Free tier to prevent CPU/memory thrashing
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
