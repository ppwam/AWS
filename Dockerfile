# ---- Build Stage ----
FROM python:3.14-slim AS base

# Set working directory
WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project source
COPY run.py .
COPY src/ ./src/
COPY data/ ./data/

# ---- Runtime Config ----
# Expose the Flask port
EXPOSE 19191

# Use a non-root user for security
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

# Start the Flask app
CMD ["python", "run.py"]
