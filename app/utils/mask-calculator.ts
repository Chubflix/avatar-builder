type Point = [x: number, y: number];
type PersonKeypoints = [nose: Point, leftEye: Point, rightEye: Point, leftEar: Point, rightEar: Point, lShoulder: Point, rShoulder: Point, lElbow: Point, rElbow: Point, lWrist: Point, rWrist: Point, lHip: Point, rHip: Point, lKnee: Point, rKnee: Point, lAnkle: Point, rAnkle: Point];


// function createRotatedMask(armRegion) {
//     const canvas = createCanvas(armRegion.w, armRegion.h);
//     const ctx = canvas.getContext('2d');
//
//     ctx.clearRect(0, 0, armRegion.w, armRegion.h);
//     ctx.save();
//
//     // Move origin to center, rotate, draw rectangle
//     ctx.translate(armRegion.centerX - armRegion.x, armRegion.centerY - armRegion.y);
//     ctx.rotate(armRegion.angle * Math.PI / 180);
//
//     ctx.fillStyle = 'white';
//     ctx.fillRect(
//         -(armRegion.length / 2),
//         -(armRegion.thickness / 2),
//         armRegion.length,
//         armRegion.thickness
//     );
//
//     ctx.restore();
//
//     // Pad to full canvas size
//     const fullCanvas = createCanvas(832, 1216);
//     const fullCtx = fullCanvas.getContext('2d');
//     fullCtx.drawImage(canvas, armRegion.x, armRegion.y);
//
//     return fullCanvas.toBuffer('image/png').toString('base64');
// }


function calculateVectorRegion(pointA: Point, pointB: Point, width = 832, height = 1216) {
    // ✅ CONVERT TO PIXELS FIRST
    const ax = pointA[0] * width;
    const ay = pointA[1] * height;
    const bx = pointB[0] * width;
    const by = pointB[1] * height;

    // Now calculate vector in PIXEL space
    const dx = bx - ax;
    const dy = by - ay;
    const angle = Math.atan2(dy, dx);
    const armLength = Math.sqrt(dx * dx + dy * dy);  // PIXEL length

    // ✅ MIDPOINT IN PIXELS
    const centerX = (ax + bx) / 2;
    const centerY = (ay + by) / 2;

    const thickness = 0.08 * width;  // Pixel thickness
    const lengthPadding = 0.04 * width;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const halfLength = (armLength + lengthPadding) / 2;
    const halfThickness = thickness / 2;

    // 4 corners from center (PIXEL coords)
    const corners = [
        [-halfLength * cosA + halfThickness * sinA, -halfLength * sinA - halfThickness * cosA],
        [halfLength * cosA + halfThickness * sinA, halfLength * sinA - halfThickness * cosA],
        [halfLength * cosA - halfThickness * sinA, halfLength * sinA + halfThickness * cosA],
        [-halfLength * cosA - halfThickness * sinA, -halfLength * sinA + halfThickness * cosA]
    ];

    // Offset from center
    const rotatedCorners = corners.map(([rx, ry]) => [
        centerX + rx,
        centerY + ry
    ]);

    // ✅ CLAMP CORNERS FIRST
    const clampedCorners = rotatedCorners.map(([cx, cy]) => [
        Math.max(0, Math.min(width, cx)),
        Math.max(0, Math.min(height, cy))
    ]);

    // ✅ NOW calculate normalized bounds from CLAMPED corners
    const minX = Math.min(...clampedCorners.map(c => c[0] / width));
    const maxX = Math.max(...clampedCorners.map(c => c[0] / width));
    const minY = Math.min(...clampedCorners.map(c => c[1] / height));
    const maxY = Math.max(...clampedCorners.map(c => c[1] / height));

    // ✅ CLAMPED debug points
    const pointA_px = [Math.max(0, Math.min(width, ax)), Math.max(0, Math.min(height, ay))];
    const pointB_px = [Math.max(0, Math.min(width, bx)), Math.max(0, Math.min(height, by))];

    return {
        x: minX,
        y: minY ,
        w: (maxX - minX),
        h: (maxY - minY),
        angle: angle * 180 / Math.PI,
        centerX,  // PIXEL coords!
        centerY,  // PIXEL coords!
        length: armLength + lengthPadding,
        thickness,
        pointA_px,  // Debug
        pointB_px,  // Debug
    };
}


export function calculateRegions(keypoints: PersonKeypoints, width: number, height: number) {
    const [nose, leftEye, rightEye, leftEar, rightEar, lShoulder, rShoulder, lElbow, rElbow, lWrist, rWrist, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle] = keypoints;

    return {
        left_upper_arm: calculateVectorRegion(lShoulder, lElbow, width, height),
        left_forearm: calculateVectorRegion(lElbow, lWrist, width, height),
        right_upper_arm: calculateVectorRegion(rShoulder, rElbow, width, height),
        right_forearm: calculateVectorRegion(rElbow, rWrist, width, height),

        left_upper_leg: calculateVectorRegion(lHip, lKnee, width, height),
        left_lower_leg: calculateVectorRegion(lKnee, lAnkle, width, height),
        right_upper_leg: calculateVectorRegion(rHip, rKnee, width, height),
        right_lower_leg: calculateVectorRegion(rKnee, rAnkle, width, height),
    };
}

