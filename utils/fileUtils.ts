import { GeneratedImage } from '../types';

declare const JSZip: any;

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const createAndDownloadZip = async (
    images: GeneratedImage[],
    productName: string,
    productDescription: string
) => {
  if (typeof JSZip === 'undefined') {
    console.error("JSZip is not loaded. Make sure the script is included in your HTML.");
    alert("Could not create ZIP file. JSZip library is missing.");
    return;
  }
  const zip = new JSZip();

  // Add details.txt
  const detailsText = `Product Name: ${productName}\n\nDescription:\n${productDescription}`;
  zip.file("details.txt", detailsText);


  images.forEach((image, index) => {
    // Sanitize title for filename
    const fileName = `${index + 1}_${image.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    // JSZip expects the raw base64 data, without the data URI prefix
    zip.file(fileName, image.base64, { base64: true });
  });
  
  const safeProductName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const zipFileName = safeProductName || 'ai-furniture-photoshoot';

  zip.generateAsync({ type: 'blob' }).then(function (content) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${zipFileName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
};