import { GeneratedImage } from '../types';

declare const JSZip: any;

interface ShopifyExportData {
    images: GeneratedImage[];
    productName: string;
    description: string;
    vendor: string;
    price: string;
    tags: string[];
    productType: string;
    seoTitle: string;
    seoDescription: string;
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const createAndDownloadSocialMediaZip = async (
    images: GeneratedImage[],
    caption: string,
    productName: string
) => {
    if (typeof JSZip === 'undefined') {
        console.error("JSZip is not loaded.");
        return;
    }
    const zip = new JSZip();

    zip.file("caption.txt", caption);

    images.forEach((image) => {
        const fileName = `${image.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
        zip.file(fileName, image.base64, { base64: true });
    });
    
    const safeProductName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const zipFileName = `${safeProductName}-social-kit`;

    zip.generateAsync({ type: 'blob' }).then(function (content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${zipFileName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
};


const toCSVString = (rows: (string[])[]): string => {
    return rows.map(row => 
        row.map(str => {
            // If the string contains a comma, double quote, or newline, enclose it in double quotes.
            if (/[",\n]/.test(str)) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')
    ).join('\n');
};


export const createAndDownloadShopifyZip = async (data: ShopifyExportData) => {
    if (typeof JSZip === 'undefined') {
        console.error("JSZip is not loaded.");
        alert("Could not create ZIP file. JSZip library is missing.");
        return;
    }

    const { images, productName, description, vendor, price, tags, productType, seoTitle, seoDescription } = data;
    const zip = new JSZip();

    const handle = productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const headers = [
        "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type", "Tags", "Published",
        "Option1 Name", "Option1 Value", "Variant SKU", "Variant Price", "Image Src", "Image Position", "Image Alt Text",
        "SEO Title", "SEO Description", "Gift Card"
    ];

    const rows: string[][] = [headers];

    // Important: Filter again to ensure no social images are included
    const shopifyImages = images.filter(img => img.category !== 'social');

    if (shopifyImages.length === 0) {
        alert("No suitable images found for Shopify export. Please ensure you have studio or lifestyle shots.");
        return;
    }

    shopifyImages.forEach((image, index) => {
        const safeTitle = image.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const imageName = `${handle}_${index + 1}_${safeTitle}.png`;
        zip.file(imageName, image.base64, { base64: true });

        if (index === 0) {
            // First row contains all product details
            rows.push([
                handle,
                productName,
                description,
                vendor,
                "Home & Garden > Furniture", // Generic category
                productType,
                tags.join(', '),
                "TRUE",
                "Title",
                "Default Title",
                "", // SKU
                price,
                imageName,
                "1",
                image.title,
                seoTitle,
                seoDescription,
                "FALSE"
            ]);
        } else {
            // Subsequent rows only contain handle and image info
            rows.push([
                handle,
                "", "", "", "", "", "", "", "", "", "", "",
                imageName,
                (index + 1).toString(),
                image.title,
                "", "", ""
            ]);
        }
    });

    const csvContent = toCSVString(rows);
    zip.file('shopify_import.csv', csvContent);
    
    const zipFileName = `${handle}-shopify-import`;

    zip.generateAsync({ type: 'blob' }).then(function (content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${zipFileName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
};