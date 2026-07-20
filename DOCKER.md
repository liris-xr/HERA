# Running HERA with Docker

This project can be run as a single Docker container, bundling the API, the admin "editor" frontend, and the "viewer" frontend together.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

## Quick start

From the repository root:

```bash
docker compose up
```

This will:
- Build the image (multi-stage: builds both Vue/Vite frontends, then bundles them with the Express API)
- Start the container, exposing it on port `8080`
- Persist the SQLite database to a `./data` folder on your machine

On first run, a default admin account is created:

- Email: `admin@gmail.com`
- Password: `admin`

## Accessing the app

- Editor (admin): `https://localhost:8080/editor`
- Viewer: `https://localhost:8080/viewer`
- API: `https://localhost:8080/api`

The app uses a self-signed HTTPS certificate (generated automatically during the Docker build). Your browser will show a security warning on first visit — accept/continue past it to proceed.

## Stopping

```bash
docker compose down
```

Your data persists in the `./data` folder between runs.

## Rebuilding after code changes

```bash
docker compose up --build
```

## Notes

- The database is SQLite, stored at `./data/database.sqlite` on the host.
- Default credentials are only inserted if the database is empty (fresh
  `./data` folder).