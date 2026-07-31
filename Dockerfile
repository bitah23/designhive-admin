FROM python:3.11-slim

# Stamped into the frontend's asset URLs so each release is a distinct cache
# key. Without it a browser can keep serving a cached app.css/layout.js and the
# release is invisible. Passed from CI as the commit SHA; "dev" locally.
ARG ASSET_VERSION=dev

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY frontend/ ./frontend/

RUN find ./frontend -name '*.html' -exec \
      sed -i "s/__ASSET_VERSION__/${ASSET_VERSION}/g" {} +


WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
