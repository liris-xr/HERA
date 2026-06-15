import os from "node:os";
import { ArProject, ArScene, ArAsset, ArLabel } from "../orm/index.js";

// Initialize global cache if not present
if (global.currentServerIp === undefined) {
  global.currentServerIp = "";
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

export async function checkAndUpdateIpAddresses(targetIp = null) {
  const localIp = targetIp || getLocalIp();
  const newHost = `https://${localIp}:8080`;

  // Update global cache
  global.currentServerIp = localIp;

  console.log(`[IP Detection] Updating database URLs to use ${newHost}...`);

  const hostRegex = /https?:\/\/[^\/]+\/(public[\\/]files[\\/])/gi;

  function updateString(str) {
    if (!str) return str;
    return str.replace(hostRegex, `${newHost}/$1`);
  }

  try {
    // 1. Update ArProject pictureUrl and presets
    const projects = await ArProject.findAll();
    for (const project of projects) {
      let changed = false;

      if (project.pictureUrl) {
        const updatedPictureUrl = updateString(project.pictureUrl);
        if (updatedPictureUrl !== project.pictureUrl) {
          project.pictureUrl = updatedPictureUrl;
          changed = true;
        }
      }

      if (project.presets) {
        let presetsObj = project.presets;
        if (typeof presetsObj === "string") {
          try {
            presetsObj = JSON.parse(presetsObj);
          } catch (e) {
            console.error("Failed to parse presets JSON", e);
          }
        }

        if (Array.isArray(presetsObj)) {
          let presetsChanged = false;
          for (const preset of presetsObj) {
            if (preset.text) {
              const updatedText = updateString(preset.text);
              if (updatedText !== preset.text) {
                preset.text = updatedText;
                presetsChanged = true;
              }
            }
          }
          if (presetsChanged) {
            project.presets = presetsObj;
            changed = true;
          }
        }
      }

      if (changed) {
        await project.save();
        console.log(`[IP Detection] Updated project URLs for project ID: ${project.id}`);
      }
    }

    // 2. Update ArScene envmapUrl
    const scenes = await ArScene.findAll();
    for (const scene of scenes) {
      if (scene.envmapUrl) {
        const updatedEnvmapUrl = updateString(scene.envmapUrl);
        if (updatedEnvmapUrl !== scene.envmapUrl) {
          scene.envmapUrl = updatedEnvmapUrl;
          await scene.save();
          console.log(`[IP Detection] Updated envmap URL for scene ID: ${scene.id}`);
        }
      }
    }

    // 3. Update ArAsset url
    const assets = await ArAsset.findAll();
    for (const asset of assets) {
      if (asset.url) {
        const updatedUrl = updateString(asset.url);
        if (updatedUrl !== asset.url) {
          asset.url = updatedUrl;
          await asset.save();
          console.log(`[IP Detection] Updated asset URL for asset ID: ${asset.id}`);
        }
      }
    }

    // 4. Update ArLabel text
    const labels = await ArLabel.findAll();
    for (const label of labels) {
      if (label.text) {
        const updatedText = updateString(label.text);
        if (updatedText !== label.text) {
          label.text = updatedText;
          await label.save();
          console.log(`[IP Detection] Updated label text for label ID: ${label.id}`);
        }
      }
    }

    console.log("[IP Detection] Database URL verification/update complete.");
  } catch (error) {
    console.error("[IP Detection] Error updating database URLs:", error);
  }
}

export function ipDetectionMiddleware(req, res, next) {
  const requestHost = req.get('host');
  if (requestHost) {
    const requestIp = requestHost.split(':')[0];
    // Ignore updates if the host hasn't changed or if it's empty
    if (requestIp && requestIp !== global.currentServerIp) {
      console.log(`[IP Detection] Request IP changed from "${global.currentServerIp}" to "${requestIp}". Triggering update...`);
      global.currentServerIp = requestIp;
      checkAndUpdateIpAddresses(requestIp).catch(err => {
        console.error("[IP Detection] Async update error:", err);
      });
    }
  }
  next();
}
