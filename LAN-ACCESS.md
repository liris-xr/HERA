# Accessing HERA from Other Devices (LAN)

This guide explains how to access a running HERA Docker container from another device (phone, tablet, second laptop) on the same network — useful for testing AR features, which require a phone/tablet camera.

## Prerequisites

- The HERA container is running (`docker compose up`) on a host machine
- Both the host machine and the other device are connected to the **same network** (e.g. the same WiFi/hotspot)

## 1. Find the host machine's local IP address

On Windows, open PowerShell and run:

```powershell
ipconfig
```

Look for the **IPv4 Address** of the active network adapter (WiFi or Ethernet) you're using — e.g. `172.20.10.2`.

> Note: if both machines are on a shared/managed network (e.g. university
> or office WiFi), client isolation may prevent devices from reaching each
> other. A personal phone hotspot is a reliable fallback for testing.

## 2. Allow the port through Windows Firewall

By default, Windows Firewall blocks inbound connections from other devices.
Run this **once**, in an Administrator PowerShell:

```powershell
New-NetFirewallRule -DisplayName "HERA Docker 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

## 3. Access from the other device

On the other device's browser, go to:

- Viewer: `https://<HOST-IP>:8080/viewer`
- Editor: `https://<HOST-IP>:8080/editor`

Replace `<HOST-IP>` with the IP found in step 1, e.g.
`https://172.20.10.2:8080/viewer`.

## 4. Accept the self-signed certificate

The app uses a self-signed HTTPS certificate. The browser will show a security warning — click through to accept/continue (e.g. "Advanced" → "Proceed"). You may need to do this **twice**: once for the page itself, and once when it tries to reach the API (a redirect/cert page will appear — accept it and you'll be redirected back).

## Notes

- The frontend automatically detects the hostname/IP used to access it and
  directs API calls to the same host — no rebuild needed when your IP
  changes (e.g. switching networks).
- WebXR/AR sessions require either `localhost` or a secure (`https`)
  connection — accessing via the LAN IP over `https` satisfies this
  requirement.