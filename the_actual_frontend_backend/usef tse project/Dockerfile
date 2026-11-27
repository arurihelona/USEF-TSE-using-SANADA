# Stage 1: Build the production frontend-user bundle
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend-user

COPY frontend-user/package.json frontend-user/package-lock.json ./
RUN npm ci

COPY frontend-user/ ./
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Python FastAPI backend + static frontend serving
FROM python:3.11-slim AS runtime
WORKDIR /app/backend

# libsndfile1 is required by soundfile for WAV/MP3/FLAC/OGG decoding
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the required model architecture package expected at /app/original-USEF-TSE/
COPY original-USEF-TSE/models/ /app/original-USEF-TSE/models/
COPY backend/ ./
COPY --from=frontend-builder /app/frontend-user/dist /app/frontend-user/dist

ENV HOST=0.0.0.0
ENV PORT=8000
ENV FRONTEND_DIST_DIR=/app/frontend-user/dist

EXPOSE 8000

# Single-worker Uvicorn (--workers 1) is required because active-download tracking is process-local.
CMD ["sh", "-c", "uvicorn app:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000} --workers 1"]
