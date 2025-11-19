
import { VariationResult } from '../types';

declare const JSZip: any;

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const formatDimensions = (dimensionsStr: string | undefined): string => {
  if (!dimensionsStr) {
    return '';
  }

  // Remove "CM", whitespace, and split by '*' or 'x'
  const parts = dimensionsStr.toUpperCase().replace(/CM/g, '').replace(/\s/g, '').split(/[x*]/);

  if (parts.length !== 3) {
    return dimensionsStr;
  }

  const [lengthCm, widthCm, heightCm] = parts.map(Number);

  if (isNaN(lengthCm) || isNaN(widthCm) || isNaN(heightCm) || lengthCm === 0 || widthCm === 0 || heightCm === 0) {
    return dimensionsStr;
  }

  // Helper to convert cm to inch fraction (nearest 1/8)
  const toFractionalInch = (cm: number): string => {
    const inches = cm / 2.54;
    const whole = Math.floor(inches);
    const remainder = inches - whole;
    
    // Round to nearest 1/8
    const eights = Math.round(remainder * 8);

    if (eights === 0) return `${whole}"`;
    if (eights === 8) return `${whole + 1}"`;

    // Simplify fractions
    let numerator = eights;
    let denominator = 8;
    
    if (numerator % 4 === 0) {
        numerator /= 4;
        denominator /= 4;
    } else if (numerator % 2 === 0) {
        numerator /= 2;
        denominator /= 2;
    }

    return `${whole} ${numerator}/${denominator}"`;
  };

  const lengthIn = toFractionalInch(lengthCm);
  const widthIn = toFractionalInch(widthCm);
  const heightIn = toFractionalInch(heightCm);

  return `${lengthCm}cm (${lengthIn}) length x ${widthCm}cm (${widthIn}) width x ${heightCm}cm (${heightIn}) height`;
};

const getVariationPrefix = (variation: Record<string, string>): string => {
    return Object.entries(variation)
        .map(([key, value]) => value)
        .join('_')
        .replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

export const downloadAllImagesAsZip = async (
    variationResults: VariationResult[],
    productName: string
) => {
    if (typeof JSZip === 'undefined') {
        console.error("JSZip is not loaded.");
        alert("Could not create ZIP file. JSZip library is missing.");
        return;
    }
    const zip = new JSZip();

    variationResults.forEach(result => {
        const variationPrefix = getVariationPrefix(result.variation);
        
        result.images.forEach(image => {
            const imageTitle = image.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${variationPrefix}_${imageTitle}.png`;
            zip.file(fileName, image.base64, { base64: true });
        });
    });
    
    const safeProductName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const zipFileName = `${safeProductName}-all-images`;

    zip.generateAsync({ type: 'blob' }).then(function (content: Blob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${zipFileName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
};
