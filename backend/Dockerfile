FROM python:3.12-slim

# Don't run as root
RUN useradd -m -u 1001 app

WORKDIR /app

# Install deps first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY --chown=app:app . .

USER app

# Persistent cache volume
VOLUME ["/app/.cache"]

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api/ping').raise_for_status()"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
