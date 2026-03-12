import ArUser from "../models/arUser.js";
import ArProject from "../models/arProject.js";
import ArScene from "../models/arScene.js";
import ArAsset from "../models/arAsset.js";
import ArMesh from "../models/arMesh.js";
import ArLabel from "../models/arLabel.js";
import ArRecord from "../models/arRecord.js";
import ArAnalyticsConfig from "../models/arAnalyticsConfig.js";

export async function resetDatabase() {
    console.log();
    await ArAnalyticsConfig.destroy({where:{}})
    await ArUser.destroy({where:{}})
    await ArProject.destroy({where:{}})
    await ArScene.destroy({where:{}})
    await ArAsset.destroy({where:{}})
    await ArLabel.destroy({where:{}})
    await ArMesh.destroy({where:{}})
    await ArMesh.destroy({where:{}})
    await ArRecord.destroy({where:{}})
    console.log("Database reset successfully.");
}
