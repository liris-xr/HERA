import { BrowserQRCodeReader} from '@zxing/browser';
// Finally, load the open.js as before. The function `onRuntimeInitialized` contains our program.


export class QrCodeManager  {
    resultPoints = null

    cv = null
    cornersMatrix = null;
    transformationMatrix = null;
    transformationMatrixInverse = null;

    // Camera Parameters instrinsic
    cameraMatrix;
    distCoeffs;

    centerQrCode

    constructor() {
        this.#loadOpenCV()

    }

    #loadOpenCV() {
        const script = document.createElement('script');
        script.src = 'https://docs.opencv.org/4.9.0/opencv.js';
        script.onload = () => {
            this.cv = window.cv;
            if (this.cv) {
                this.#onOpenCvReady();
            } else {
                console.error("OpenCV failed to load!");
            }
        };
        document.body.appendChild(script);
    }

    #onOpenCvReady() {
        console.log('OpenCV is ready!');
    }

    async scanImageData(imageData) {
        const mat = this.cv.matFromImageData(imageData);

        const qcd = new this.cv.QRCodeDetector();
        const decodedInfo = new this.cv.StringVector();
        const points = new this.cv.Mat();
        const straightQrCode = new this.cv.MatVector();
        const success = qcd.detectAndDecodeMulti(mat, decodedInfo, points, straightQrCode);

        qcd.delete();
        straightQrCode.delete();

        if (success) {
            console.log(decodedInfo.get(0));

            let corners = points.row(0).data32F;
            this.cornersMatrix = this.cv.matFromArray(4, 1, this.cv.CV_32SC2, corners);
            this.cornersMatrix = this.cornersMatrix.data32S

            this.#getmatrixTransformation(imageData);

            return decodedInfo.get(0);
        } else {
            console.log('No QR code detected');
                mat.delete();
            return null;
        }
    }


    #imageDataToCanvas(imageData) {
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);

        return canvas;
    }

    #getmatrixTransformation(imageData) {
        this.cameraMatrix = this.cv.matFromArray(3, 3, this.cv.CV_64F, [
            910.1155107777962, 0.0, 360.3277519024787,  // fx, 0, cx
            0.0, 910.2233367566544, 372.6634999577232,  // 0, fy, cy
            0.0, 0.0, 1.0     // 0, 0, 1
        ]);
        this.distCoeffs = this.cv.matFromArray(5, 1, this.cv.CV_64F, [
            0.0212284835698144,    // k1
            0.8546829039917951,    // k2
            0.0034281408326615323, // p1
            0.0005749116561059772, // p2
            -3.217248182814475     // k3
        ]);


        const qrEdges = [
            [-0.5, -0.5, 0],
            [-0.5, 0.5, 0],
            [0.5, 0.5, 0],
            [0.5, -0.5, 0]
        ];

        const qrEdgesMat = this.cv.matFromArray(qrEdges.length, 3, this.cv.CV_32F, qrEdges.flat());

        const cornersPoint = [];
        for (let i = 0; i < this.cornersMatrix.length; i+=2){
            cornersPoint.push([this.cornersMatrix[i], this.cornersMatrix[i+1]]);
        }

        const cornersPointMat = this.cv.matFromArray(cornersPoint.length, 2, this.cv.CV_32F, cornersPoint.flat());

        const centerX = Math.floor((cornersPoint[2][0] + cornersPoint[0][0])/2);
        const centerY = Math.floor((cornersPoint[2][1] + cornersPoint[0][1])/2);
        const centerQrCode = [centerX, centerY,0, 1];

        const rvec = new this.cv.Mat();
        const tvec = new this.cv.Mat();

        this.cv.solvePnP(
            qrEdgesMat,
            cornersPointMat,
            this.cameraMatrix,
            this.distCoeffs,
            rvec,
            tvec,
            false,
            this.cv.SOLVEPNP_ITERATIVE
        );

        let rotationMatrix = new this.cv.Mat();
        this.cv.Rodrigues(rvec, rotationMatrix);

        const r = rotationMatrix.data64F;
        const t = tvec.data64F;

        const matrix = [
            r[0], r[1], r[2], t[0],
            r[3], r[4], r[5], t[1],
            r[6], r[7], r[8], t[2],
            0,    0,    0,      1
        ];

        this.transformationMatrix = this.cv.matFromArray(4, 4, this.cv.CV_32F, matrix);

        this.transformationMatrixInverse = new cv.Mat();
        const result = cv.invert(this.transformationMatrix, this.transformationMatrixInverse, cv.DECOMP_LU);

        console.log("RESULTATAT: " + result);

        this.#calculateCoordinateCenterQrCode(centerQrCode, matrix)

    }

    #calculateCoordinateCenterQrCode(center2d, matrix1){
        const x = matrix1[0] * center2d[0] + matrix1[1] * center2d[1]
            + matrix1[3];

        const y = matrix1[4] * center2d[0] + matrix1[5] * center2d[1]
            + matrix1[7];

        const z = matrix1[8] * center2d[0] + matrix1[9] * center2d[1]
            + matrix1[11];

        console.log("coordonnée 3d")
        console.log(Math.floor(x) + '\n' + Math.floor(y) + '\n' + Math.floor(z))

        this.centerQrCode = [x, z, y];
    }
}