import numpy as np
import rerun as rr
import sqlite3
import json
import os
from scipy.spatial.transform import Slerp
from scipy.spatial.transform import Rotation as R

# ---- 1. INIT ----

rr.init("HERA_Calibration_Final", spawn=True)

# -- Set Y axis to be the up axis --
rr.log("world", rr.ViewCoordinates.RIGHT_HAND_Y_UP, static=True)

# -- Raw path to db and asset (temporary - will be changed once the interface is complete) --
rawDbPath = r"E:\Perso\BUT\Annee3\SAE\HERA\backend\api\src\database\database.sqlite"
rawBaseAssetPath = r"E:\Perso\BUT\Annee3\SAE\HERA\backend\api"

# -- Raw Scene and User id (temporary - will be changed once the interface is complete) --
rawSceneID = "6b726a72-07da-4713-8338-f8718ca05fb4" 
rawUserID = "f29836b0-2592-46b1-9e93-ac47cae88a49" 

# ---- 2. ASSETS LOADING ----
dbConnexion = sqlite3.connect(rawDbPath)
cursor = dbConnexion.cursor()
cursor.execute("SELECT name, url, position, rotation, scale FROM ArAssets WHERE sceneId = ?;", (rawSceneID,))
sceneAssets = cursor.fetchall()

assetCpt = 0
for asset in sceneAssets:
    assetCpt += 1
    rawName, rawUrl, rawPosition, rawRotation, rawScale = asset
    
    position = json.loads(rawPosition)
    rotation = json.loads(rawRotation)
    scale = json.loads(rawScale)

    pos_list = [position['x'], position['y'], position['z']]
    scale_list = [scale['x'], scale['y'], scale['z']]
    # Convert Euler angle to Scipy rotation
    rotation_list = R.from_euler('xyz', [rotation['x'], rotation['y'], rotation['z']], degrees=False)
    
    entity_root = f"world/scene/asset_{assetCpt}/{rawName}"
    rr.log(entity_root, rr.Transform3D(translation=pos_list, scale=scale_list, rotation=rr.Quaternion(xyzw=rotation_list.as_quat())), static=True)
    
    # Let only relatif asset path
    cleanAssetUrlPath = rawUrl.lstrip("/").lstrip("\\")

    # Join Os and relatif path
    fullPath = os.path.join(rawBaseAssetPath, cleanAssetUrlPath)
    rr.log(f"{entity_root}/mesh", rr.Asset3D(path = fullPath), static=True)

dbConnexion.close()

# ---- 3. FRAME RECOVERY AND PROCESSING ----

# -- Raw path to db (temporary - will be changed once the interface is complete) --
rawRecordDbPath = r"E:\Perso\BUT\Annee3\SAE\HERA\backend\api\src\database\databaseRecords.sqlite"
dbRecordConnexion = sqlite3.connect(rawRecordDbPath)
cursor = dbRecordConnexion.cursor()

cursor.execute("SELECT matrix FROM ArRecords WHERE sceneId = ? AND userId = ? ORDER BY time ASC;", (rawSceneID, rawUserID))
trackingPoints = cursor.fetchall()

print("Data reading...")
keyframes = [] 
for point in trackingPoints:
    try:
        cleanMatrix = point[0].replace('"', '').replace("'", "").replace('[', '').replace(']', '').strip()
        
        # Create a 4x4 matrix
        # Three.js uses Column-Major order, while NumPy uses Row-Major.
        # We transpose (.T) the matrix to align the data correctly
        matrixNp = np.fromstring(cleanMatrix, sep=',').reshape(4, 4).T

        # Take the position at the 3 first line of the last column of the matrix
        position = matrixNp[0:3, 3]

        # Rotation is in the upper left block of 3x3 squares.
        rotationMatrix = matrixNp[0:3, 0:3]

        # Convert rotation to quaternion
        quaternionMatrix = R.from_matrix(rotationMatrix).as_quat()

        # Add position and rotation to create a replay later
        keyframes.append((position, quaternionMatrix))
    except:
        continue

if len(keyframes) < 2:
    print("❌ not enough points")
    exit()
else: 
    print(f"✅ {len(keyframes)} frames found - Generation...")

# ---- 4. REPLAY ANIMATION ----

# -- Replay parameter --
TARGET_FPS = 60          
SECONDS_PER_KEYFRAME = 2.0 

# Coordinate System Fix: WebXR cameras face -Z, while Rerun expects +Z.
# A 180° rotation around X is required to align the forward direction.
fix_webxr_x = R.from_euler('x', 180, degrees=True)

global_time = 0.0
for i in range(len(keyframes) - 1):
    posStart, rotStart = keyframes[i]
    posEnd, rotationEnd = keyframes[i+1]
    
    key_rots = R.from_quat([rotStart, rotationEnd])

    # Initialize the Spherical Linear Interpolation (SLERP) engine to calculate the smooth curved path between the two rotations
    slerp_engine = Slerp([0, 1], key_rots)

    numSteps = int(SECONDS_PER_KEYFRAME * TARGET_FPS)
    
    for step in range(numSteps):
        # Calculate progression between 2 points
        stepProgression = step / float(numSteps)
        
        # Linear Interpolation (LERP) of the position between start and end
        currentPos = posStart + (posEnd - posStart) * stepProgression

        # Spherical Linear Interpolation (SLERP) of the rotation quaternion
        currentQuatRotation = slerp_engine([stepProgression]).as_quat()[0]

        # Store the final position (no height offset is applied here)
        final_pos = currentPos

        # Convert the raw quaternion into a SciPy Rotation object for math operations
        currentSciPyRotation = R.from_quat(currentQuatRotation)
        finalRotation = currentSciPyRotation * fix_webxr_x 
        
        rr.set_time("stable_time", duration=global_time)     
        rr.log(
            "world/user_camera",
            rr.Transform3D(translation=final_pos, rotation=rr.Quaternion(xyzw=finalRotation.as_quat())),
            rr.Pinhole(resolution=[1920, 1080], focal_length=1080)
        )
        global_time += (1.0 / TARGET_FPS)

dbRecordConnexion.close()
print(f"Finished, please find the replay ({global_time:.2f} s) on rerun." + "\n" + "WARNING : Don't forget to set 'stable_time' and follow the 'player_camera' element")