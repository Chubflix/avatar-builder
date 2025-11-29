/**
 * Calculate rotated bounding boxes for limbs
 * @param {Array} keypoints - Array of [x, y] normalized coordinates (0-1)
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @returns {Object} - Object containing limb regions with rotation
 */
export function calculateRegions(keypoints, width, height) {
    const [
        nose, leftEye, rightEye, leftEar, rightEar,
        lShoulder, rShoulder, lElbow, rElbow,
        lWrist, rWrist, lHip, rHip,
        lKnee, rKnee, lAnkle, rAnkle
    ] = keypoints;

    // Helper to calculate rotated box for a limb
    const calculateLimbBox = (point1, point2, thickness = 40) => {
        const x1 = point1[0] * width;
        const y1 = point1[1] * height;
        const x2 = point2[0] * width;
        const y2 = point2[1] * height;

        const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;

        return {
            centerX,
            centerY,
            length,
            thickness,
            angle,
            // Also include normalized bounds for backward compatibility
            x: Math.min(point1[0], point2[0]) - (thickness / width / 2),
            y: Math.min(point1[1], point2[1]) - (thickness / height / 2),
            w: Math.abs(point2[0] - point1[0]) + (thickness / width),
            h: Math.abs(point2[1] - point1[1]) + (thickness / height)
        };
    };

    return {
        // Arms
        left_upper_arm: calculateLimbBox(lShoulder, lElbow, 50),
        left_forearm: calculateLimbBox(lElbow, lWrist, 40),
        right_upper_arm: calculateLimbBox(rShoulder, rElbow, 50),
        right_forearm: calculateLimbBox(rElbow, rWrist, 40),

        // Legs
        left_upper_leg: calculateLimbBox(lHip, lKnee, 60),
        left_lower_leg: calculateLimbBox(lKnee, lAnkle, 50),
        right_upper_leg: calculateLimbBox(rHip, rKnee, 60),
        right_lower_leg: calculateLimbBox(rKnee, rAnkle, 50)
    };
}
