# Alternative to Vercel (Render, Cloud Run, Fly.io...). Includes scikit-learn + statsmodels models.
FROM python:3.12-slim
WORKDIR /srv
COPY requirements.txt requirements-full.txt ./
RUN pip install --no-cache-dir -r requirements-full.txt
COPY app ./app
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
