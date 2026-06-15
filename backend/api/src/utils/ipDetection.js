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

  console.log(`Updating URLs to use ${newHost}...`);

  const hostRegex = /https?:\/\/[^\/]+\/(public[\\/]files[\\/])/gi;

  function updateString(str) {
    if (!str) return str;
    return str.replace(hostRegex, `${newHost}/$1`);
  }

  try {
    // Update ArProject pictureUrl and presets
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
      }
    }

    // Update ArScene envmapUrl
    const scenes = await ArScene.findAll();
    for (const scene of scenes) {
      if (scene.envmapUrl) {
        const updatedEnvmapUrl = updateString(scene.envmapUrl);
        if (updatedEnvmapUrl !== scene.envmapUrl) {
          scene.envmapUrl = updatedEnvmapUrl;
          await scene.save();
        }
      }
    }

    // Update ArAsset url
    const assets = await ArAsset.findAll();
    for (const asset of assets) {
      if (asset.url) {
        const updatedUrl = updateString(asset.url);
        if (updatedUrl !== asset.url) {
          asset.url = updatedUrl;
          await asset.save();
        }
      }
    }

    // Update ArLabel text
    const labels = await ArLabel.findAll();
    for (const label of labels) {
      if (label.text) {
        const updatedText = updateString(label.text);
        if (updatedText !== label.text) {
          label.text = updatedText;
          await label.save();
        }
      }
    }

    console.log("URL verification/update completed.");
  } catch (error) {
    console.error("Error updating URLs:", error);
  }
}

export function ipDetectionMiddleware(req, res, next) {
  const requestHost = req.get('host');
  if (requestHost) {
    const requestIp = requestHost.split(':')[0];
    // Ignore updates if the host hasn't changed or if it's empty
    if (requestIp && requestIp !== global.currentServerIp) {
      global.currentServerIp = requestIp;
      checkAndUpdateIpAddresses(requestIp).catch(err => {
        console.error("Async update error:", err);
      });
    }
  }
  next();
}
