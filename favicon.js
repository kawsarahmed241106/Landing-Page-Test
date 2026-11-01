(() => {
  const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23119b5d'/%3E%3Cpath d='M32 10 52 21v22L32 54 12 43V21z' fill='none' stroke='white' stroke-width='5'/%3E%3C/svg%3E";

  window.setBrandFavicon = logoUrl => {
    const favicon = document.querySelector('link[rel="icon"]');
    const footerLogo = document.getElementById("footer-logo");
    const useFooterMark = url => {
      if (!footerLogo || !url) return;
      footerLogo.src = url;
      footerLogo.hidden = false;
    };
    if (!logoUrl) {
      favicon.href = fallback;
      favicon.type = "image/svg+xml";
      favicon.removeAttribute("sizes");
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const sample = document.createElement("canvas");
        sample.width = 256;
        sample.height = 256;
        const sampleContext = sample.getContext("2d", { willReadFrequently: true });
        if (!sampleContext) throw new Error("Canvas is unavailable");
        let sourceX = 0, sourceY = 0, sourceWidth = image.naturalWidth, sourceHeight = image.naturalHeight;
        if (image.naturalWidth > image.naturalHeight) {
          sourceWidth = Math.min(image.naturalWidth, image.naturalHeight * 1.4);
        } else if (image.naturalHeight > image.naturalWidth) {
          sourceHeight = Math.min(image.naturalHeight, image.naturalWidth * 1.4);
          sourceY = (image.naturalHeight - sourceHeight) / 2;
        }
        const scale = Math.min(256 / sourceWidth, 256 / sourceHeight);
        const fittedWidth = sourceWidth * scale, fittedHeight = sourceHeight * scale;
        sampleContext.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight,
          (256 - fittedWidth) / 2, (256 - fittedHeight) / 2, fittedWidth, fittedHeight);
        const pixels = sampleContext.getImageData(0, 0, 256, 256).data;
        let left = 256, top = 256, right = -1, bottom = -1;
        for (let y = 0; y < 256; y += 1) {
          for (let x = 0; x < 256; x += 1) {
            const offset = (y * 256 + x) * 4;
            const red = pixels[offset], green = pixels[offset + 1], blue = pixels[offset + 2], alpha = pixels[offset + 3];
            const dark = Math.min(red, green, blue) < 238;
            const colorful = Math.max(red, green, blue) - Math.min(red, green, blue) > 18;
            if (alpha > 28 && (dark || colorful)) {
              left = Math.min(left, x); top = Math.min(top, y);
              right = Math.max(right, x); bottom = Math.max(bottom, y);
            }
          }
        }
        if (right < left || bottom < top) { left = 0; top = 0; right = 255; bottom = 255; }
        const padding = Math.max(2, Math.round(Math.max(right - left + 1, bottom - top + 1) * .025));
        left = Math.max(0, left - padding); top = Math.max(0, top - padding);
        right = Math.min(255, right + padding); bottom = Math.min(255, bottom + padding);
        const cropSide = Math.max(right - left + 1, bottom - top + 1);
        const cropX = Math.max(0, Math.min(255 - cropSide, Math.round((left + right - cropSide + 1) / 2)));
        const cropY = Math.max(0, Math.min(255 - cropSide, Math.round((top + bottom - cropSide + 1) / 2)));
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable");
        context.drawImage(sample, cropX, cropY, cropSide, cropSide, 28, 28, 200, 200);
        const brandMark = canvas.toDataURL("image/png");
        favicon.href = brandMark;
        favicon.type = "image/png";
        favicon.sizes = "256x256";
        useFooterMark(brandMark);
      } catch {
        favicon.href = logoUrl;
        favicon.removeAttribute("type");
        favicon.removeAttribute("sizes");
        useFooterMark(logoUrl);
      }
    };
    image.onerror = () => {
      favicon.href = logoUrl;
      favicon.removeAttribute("type");
      favicon.removeAttribute("sizes");
      useFooterMark(logoUrl);
    };
    image.src = logoUrl;
  };
})();
