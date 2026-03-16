import { SceneElementInterface } from "@/js/threeExt/interfaces/sceneElementInterface.js";
import * as THREE from "three";
import { reactive, ref } from "vue";
import { ObjectManager } from "@/js/threeExt/modelManagement/objectManager.js";
import { fetchAssetManifest, pickVariantFromManifest } from "@/js/threeExt/assetManifest.js";

export class Asset extends SceneElementInterface {
    object;
    id;

    sourceUrl;
    simplifiedUrl;

    position;
    rotation;
    scale;
    name;

    animations;
    animationMixer;
    activeAnimation;
    playingAction;
    #error;

    highlight;
    hidden;

    constructor(assetData) {
        super();
        this.id = assetData.id;

        // DB fields
        this.sourceUrl = assetData.url; // original
        this.simplifiedUrl = assetData.simplifiedUrl ?? null; // simplified (optional)

        this.name = assetData.name != null ? assetData.name : assetData.url;
        this.activeAnimation = assetData.activeAnimation || null;

        this.highlight = ref(false);
        this.hidden = ref(false);
        this.animations = reactive([]);

        this.position = assetData.position ?? { x: 0, y: 0, z: 0 };
        this.rotation = assetData.rotation ?? { x: 0, y: 0, z: 0 };
        this.scale = assetData.scale ?? { x: 1, y: 1, z: 1 };

        this.#error = false;
    }

    hasError() {
        return this.#error;
    }

    playAnimation(name) {
        if (!this.animationMixer) return;

        if (this.playingAction) {
            this.playingAction.stop();
            this.playingAction = null;
            this.activeAnimation = null;
        }

        if (name) {
            const anim = THREE.AnimationClip.findByName(this.object.animations, name);
            if (!anim) return;

            const action = this.animationMixer.clipAction(anim);
            action.play();
            this.activeAnimation = name;
            this.playingAction = action;
        }
    }

    /**
     * options.useSimplified: boolean (default false)
     */

    async load(options = {}) {
        try {
            const manager = ObjectManager.getInstance();

            const manifest = await fetchAssetManifest(this.id);
            const chosen = pickVariantFromManifest(manifest, options);
            console.log("[Viewer Asset.load] asset:", this.id);
            console.log("[Viewer Asset.load] preferredVariant from manifest:", manifest?.preferredVariant);
            console.log("[Viewer Asset.load] chosen variant:", chosen?.variant);
            console.log("[Viewer Asset.load] chosen path:", chosen?.path);
            //let url = chosen.url;
           // if (url && !/^https?:\/\//i.test(url) && !url.startsWith("/")) url = "/" + url;
            const urlToLoad = chosen?.path; // <-- IMPORTANT: on charge le PATH
            if (!urlToLoad || typeof urlToLoad !== "string") {
                throw new Error(`[Asset.load] invalid urlToLoad: ${urlToLoad}`);
            }

            const loaded = await manager.load(urlToLoad);
            //const urlOverride = options?.urlOverride ?? null;
            //const forceUpload = !!options?.forceUpload;

            // If you support uploadData loading:
            // - ObjectManager.loadFromFile(uploadData) or similar
            // Here I assume ObjectManager.load(url) exists only.
            // If you have a dedicated upload path, keep it.

            //let urlToLoad = urlOverride ?? this.sourceUrl;

            //console.log("[Asset.load]", {assetId: this.id, name: this.name, urlOverride, urlToLoad, forceUpload,});


            // If you have uploadData support, do it here:
            // if (forceUpload && this.uploadData) { object = await manager.loadFromFile(this.uploadData); }
            // else { object = await manager.load(urlToLoad); }

            //const loaded = await manager.load(urlToLoad);

            this.#error = typeof loaded.hasError === "function" ? loaded.hasError() : false;
            this.object = loaded.object ?? loaded;
            this.mesh = this.object;

            this.object.userData.assetId = this.id;

            // Apply transforms
            this.object.position.set(this.position.x, this.position.y, this.position.z);
            this.object.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
            this.object.scale.set(this.scale.x, this.scale.y, this.scale.z);

            this.object.castShadow = true;
            this.object.receiveShadow = true;
            this.object.isAsset = true;

            if (this.object?.animations?.length > 0) {
                this.animationMixer = new THREE.AnimationMixer(this.object);
                this.animations.length = 0;
                for (const animation of this.object.animations) this.animations.push(animation.name);

                if (this.activeAnimation) {
                    const anim = THREE.AnimationClip.findByName(this.object.animations, this.activeAnimation);
                    if (anim) {
                        const action = this.animationMixer.clipAction(anim);
                        action.play();
                        this.playingAction = action;
                    }
                }
            }
            return this.object;
        } catch(e) {
            console.error("Asset.loaded failed", e);
            this.#error = true;
            return null;
        }
    }

    pushToScene(scene) {
        if (!this.object) return false;
        scene.add(this.object);
        return true;
    }
}