# Backend

This is a minimal Node.js aggregation service for GNSS feeds.

## Endpoints

1. `GET /health`
2. `GET /api/feeds?type=news`
3. `GET /api/feeds?type=articles`
4. `GET /api/feeds?type=code`

## Run locally

1. Ensure Node.js 18+ is installed
2. Run `npm start` inside this folder
3. The service listens on port `8787` by default

## Environment

1. `PORT`
2. `CACHE_TTL_MS`
3. `REQUEST_TIMEOUT_MS`
4. `ALLOWED_ORIGIN`
5. `GITHUB_TOKEN`
6. `GDELT_TIMESPAN`
7. `OPENALEX_QUERY`
8. `OPENALEX_FROM_DATE`
9. `OPENALEX_MAILTO`
10. `GITHUB_QUERY`
