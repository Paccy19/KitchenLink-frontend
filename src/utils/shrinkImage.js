/**
 * Shrinks a photo in the browser before upload: the long side is scaled down
 * to `maxSide` and it is saved as JPEG, lowering the quality until it fits
 * `maxChars` as a data URI. A typical 3–5 MB phone photo becomes a few hundred
 * KB, which fits the API's 1 MB request limit and uploads fast on mobile data.
 *
 * @param {File} file an image file (JPEG, PNG, WebP or GIF)
 * @returns {Promise<string>} data:image/jpeg;base64,... URI
 */
export async function shrinkImage(file, { maxSide = 1600, maxChars = 650 * 1024 } = {}) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read this image. Try another one.'));
      img.src = url;
    });

    let side = maxSide;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const scale = Math.min(1, side / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      // JPEG has no transparency: transparent parts become white, not black.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.75, 0.65]) {
        const dataUri = canvas.toDataURL('image/jpeg', quality);
        if (dataUri.length <= maxChars) return dataUri;
      }
      side = Math.round(side * 0.75);
    }
    throw new Error('This image is too large. Try another one.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Profile pictures are shown small: 512 px is plenty. */
export const shrinkAvatar = (file) => shrinkImage(file, { maxSide: 512, maxChars: 200 * 1024 });
