import ArUser from "../models/arUser.js";
import ArProject from "../models/arProject.js";
import ArScene from "../models/arScene.js";
import ArAsset from "../models/arAsset.js";
import ArGroup from "../models/arGroup.js";
import ArMesh from "../models/arMesh.js";
import ArLabel from "../models/arLabel.js";

export async function resetDatabase() {
    console.log();
    await ArUser.destroy({where:{}})
    await ArProject.destroy({where:{}})
    await ArScene.destroy({where:{}})
    await ArAsset.destroy({where:{}})
    await ArLabel.destroy({where:{}})
    await ArMesh.destroy({where:{}})
    await ArGroup.destroy({where:{}})
    console.log("Database reset successfully.");
}
