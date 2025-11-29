/**
 * Generate a base64 PNG mask from region bounds
 * @param {Array} regionBounds - Array of region objects with x_px, y_px, w_px, h_px, or rotated regions
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {Promise<string>} - Base64 encoded PNG
 */
export async function generateMaskPNG(regionBounds, width = 512, height = 512) {
  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fill with black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Draw white regions for each bound
  ctx.fillStyle = '#FFFFFF';

  regionBounds.forEach(region => {
    if (region.angle !== undefined) {
      // Rotated region (for limbs)
      ctx.save();
      ctx.translate(region.centerX, region.centerY);
      ctx.rotate(region.angle * Math.PI / 180);
      ctx.fillRect(
        -(region.length / 2),
        -(region.thickness / 2),
        region.length,
        region.thickness
      );
      ctx.restore();
    } else {
      // Regular rectangular region
      ctx.fillRect(region.x_px, region.y_px, region.w_px, region.h_px);
    }
  });

  // Convert to base64 PNG
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove the "data:image/png;base64," prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}

/**
 * Merge multiple regions into a single mask
 * @param {Array} regions - Array of region objects
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {Promise<string>} - Base64 encoded PNG
 */
export async function mergeMasks(regions, width = 512, height = 512) {
  return generateMaskPNG(regions, width, height);
}
