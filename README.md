# HERA

HERA is a web-based no-code AR authoring platform for cultural heritage.
It allows users to create, edit, and visualize augmented reality scenes directly in the browser. The project is split into a backend API and two frontend applications: an admin/editor interface and a user/viewer interface.

For more information, check [the paper](https://hal.science/hal-04725966v1) and the [demo video](https://www.youtube.com/watch?v=ZqwUtapg_Bk). 

The project is composed of:

| Folder           | Role                                                  | Default URL                      |
| ---------------- | ----------------------------------------------------- | -------------------------------- |
| `backend/api`    | Express API, database, authentication, uploaded files | `https://localhost:8080`         |
| `frontend/admin` | Editor interface for creating and managing projects   | `https://localhost:8082/editor/` |
| `frontend/user`  | Viewer interface for opening and visualizing projects | `https://localhost:8081/viewer/` |

The editor and viewer both require the backend API to be running.

---

## Requirements

Before starting, install:

* Node.js and npm
* Google Chrome or another WebXR-compatible browser
* An ARCore-compatible Android device if you want to test AR
* ADB, optional, for Android debugging

---

## Quick Start

Clone the repository:

```bash
git clone https://github.com/liris-xr/HERA.git
cd HERA
```

Switch to the development branch:

```bash
git checkout node-editor
```

Generate the local HTTPS certificates:

```bash
node scripts/setup-dev-https.mjs
```

Install backend dependencies:

```bash
cd backend/api
npm install --legacy-peer-deps
npm start
```

In another terminal, start the viewer:

```bash
cd frontend/user
npm install --legacy-peer-deps
npm run dev
```

In another terminal, start the editor:

```bash
cd frontend/admin
npm install --legacy-peer-deps
npm run dev
```

Open:

* API test: `https://localhost:8080/api/dev/hello`
* Viewer: `https://localhost:8081/viewer/`
* Editor: `https://localhost:8082/editor/`

---

## HTTPS Setup

HERA uses HTTPS in development because WebXR and AR features require a secure context.

Run this from the repository root:

```bash
node scripts/setup-dev-https.mjs
```

The script generates:

```txt
certs/dev.pem
certs/dev-key.pem
```

It also detects your LAN IP and updates the local environment files used by the backend, viewer, and editor.

If your IP changes, rerun:

```bash
node scripts/setup-dev-https.mjs --force
```

Generated certificates are local development files. Do not commit them.

---

## Testing on a Phone or Tablet

A phone cannot use your computer’s `localhost`.

To test from another device, connect the phone/tablet and computer to the same network, then use the LAN URLs printed by the HTTPS setup script.

Example:

```txt
https://192.168.1.42:8081/viewer/
https://192.168.1.42:8082/editor/
https://192.168.1.42:8080
```

Open the API URL once on the device and accept the local certificate if the browser asks.

---

## Environment Variables

Local `.env` files are generated or updated by:

```bash
node scripts/setup-dev-https.mjs
```

Backend environment file:

```txt
backend/api/.env
```

Example:

```env
NODE_ENV=development
PORT=8080
JWT_SECRET=dev-only-insecure-secret-change-me
HERA_ADMIN_EMAIL=admin@example.com
HERA_ADMIN_USERNAME=admin
HERA_ADMIN_PASSWORD=replace-with-a-strong-password
CORS_ORIGIN=*
HTTPS_KEY_PATH=certs/dev-key.pem
HTTPS_CERT_PATH=certs/dev.pem
```

On a fresh database, the first admin account is created from:

```env
HERA_ADMIN_EMAIL
HERA_ADMIN_USERNAME
HERA_ADMIN_PASSWORD
```

If users already exist, these values are ignored.

Never commit real `.env` files.

---

## Common Issues

### `npm install` fails with `ERESOLVE`

Use:

```bash
npm install --legacy-peer-deps
```

This is needed because some dependencies still declare older peer dependency versions.

### Backend says `Cannot find package 'express'`

The backend dependencies were not installed correctly. Run:

```bash
cd backend/api
npm install --legacy-peer-deps
npm start
```

### Port already in use

If port `8080`, `8081`, or `8082` is already used, stop the old server or find the process:

```bash
netstat -ano | findstr :8080
taskkill /PID <PID_NUMBER> /F
```

### Browser blocks the site because of certificates

Open these URLs once and accept the local certificate warning:

```txt
https://localhost:8080
https://localhost:8081
https://localhost:8082
```

When testing from a phone, use the LAN IP instead of `localhost`.

### Old projects do not appear in a fresh clone

This is normal. Projects are stored in the local database and uploaded assets folder.

A fresh clone starts with a fresh local database.

---

## Production Notes

For production deployment:

* use a strong private `JWT_SECRET`
* never commit real `.env` files
* do not use local development certificates
* do not use `CORS_ORIGIN=*`
* use real HTTPS certificates
* protect admin routes on the backend
* never keep database reset options enabled


