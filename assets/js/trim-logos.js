// Crops the transparent margin around each logo in the release block, so every logo fills its card.
document.querySelectorAll('.qgis-announcement-logos img').forEach((img) => {
    const trim = () => {
        if (!img.naturalWidth || !img.naturalHeight) return;

        // A vector logo is drawn at three times the card height, so it stays sharp once cropped.
        const isVector = /\.svg$/i.test(new URL(img.currentSrc, location.href).pathname);
        const scale = isVector ? Math.max(1, (3 * img.clientHeight) / img.naturalHeight) : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(img, 0, 0, canvas.width, canvas.height);

        let pixels;
        try {
            pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        } catch (error) {
            return; // The browser blocks reading a logo from another origin, so it keeps its margin.
        }

        const { width, height } = canvas;
        let left = width, top = height, right = -1, bottom = -1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (pixels[(y * width + x) * 4 + 3] > 0) {
                    left = Math.min(left, x);
                    right = Math.max(right, x);
                    top = Math.min(top, y);
                    bottom = Math.max(bottom, y);
                }
            }
        }

        const cropWidth = right - left + 1;
        const cropHeight = bottom - top + 1;
        if (right < 0 || (cropWidth === width && cropHeight === height)) return;

        const cropped = document.createElement('canvas');
        cropped.width = cropWidth;
        cropped.height = cropHeight;
        cropped.getContext('2d').drawImage(canvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        img.src = cropped.toDataURL();
    };

    if (img.complete) {
        trim();
    } else {
        img.addEventListener('load', trim, { once: true });
    }
});
