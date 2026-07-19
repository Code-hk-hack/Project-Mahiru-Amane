FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Hugging Face Spaces require the app to run on port 7860
ENV PORT=7860
EXPOSE 7860

# Start the FastAPI application using uvicorn
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}
