import { GeneratedContent } from '../types';

export const generateShopifyCSV = (content: GeneratedContent): void => {
  const { baseDetails, variationResults, furnitureCategory } = content;
  
  // 1. Determine Option Names (e.g., "Color", "Size") from the first variation
  // Shopify supports up to 3 options.
  let optionNames: string[] = [];
  if (variationResults.length > 0) {
    optionNames = Object.keys(variationResults[0].variation).slice(0, 3);
  }

  const headers = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Standard Product Type",
    "Tags",
    "Published",
    "Option1 Name",
    "Option1 Value",
    "Option2 Name",
    "Option2 Value",
    "Option3 Name",
    "Option3 Value",
    "Variant SKU", 
    "Variant Grams", 
    "Variant Inventory Tracker", 
    "Variant Inventory Qty", 
    "Variant Price",
    "Variant Compare At Price",
    "Requires Shipping",
    "Taxable", 
    "Barcode",
    "Image Src",
    "Image Position", 
    "Image Alt Text",
    "SEO Title",
    "SEO Description"
  ];

  const rows: string[][] = [];
  
  // Sanitize strings for CSV (escape quotes)
  const escape = (str: string) => {
    if (!str) return '';
    const stringValue = String(str);
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handle = baseDetails.names[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const title = baseDetails.names[0];
  // Convert newlines to HTML breaks for Shopify Body
  const bodyHtml = baseDetails.description.replace(/\n/g, '<br>'); 
  const vendor = "AI Furniture Design"; // Generic vendor
  const type = furnitureCategory || "Furniture";
  const tags = baseDetails.tags.join(', ');
  const published = "TRUE";
  // Remove currency symbol and commas for raw number
  const price = baseDetails.suggestedPrice ? baseDetails.suggestedPrice.replace(/[^0-9.]/g, '') : "0.00";
  
  // We generate a row for each variation
  variationResults.forEach((result, index) => {
    const variation = result.variation;
    
    // Get values for the options identified earlier
    const opt1Value = optionNames.length > 0 ? variation[optionNames[0]] : "";
    const opt2Value = optionNames.length > 1 ? variation[optionNames[1]] : "";
    const opt3Value = optionNames.length > 2 ? variation[optionNames[2]] : "";

    const sku = `${handle}-${index + 1}`; // Generate a simple SKU

    // Note: We cannot import local base64 images via CSV. 
    // Users must upload images manually or use a hosting service.
    // We leave Image Src blank but provide the structure.

    const row = [
        handle,
        title,
        bodyHtml,
        vendor,
        type,
        tags,
        published,
        optionNames.length > 0 ? optionNames[0] : "",
        opt1Value,
        optionNames.length > 1 ? optionNames[1] : "",
        opt2Value,
        optionNames.length > 2 ? optionNames[2] : "",
        opt3Value,
        sku,
        "10000", // Default grams
        "shopify", // Inventory tracker
        "10", // Inventory Qty
        price,
        "", // Compare at price
        "TRUE", // Requires shipping
        "TRUE", // Taxable
        "", // Barcode
        "", // Image Src
        "", // Image Position
        "", // Image Alt Text
        baseDetails.seoTitle,
        baseDetails.seoDescription
    ];

    rows.push(row.map(escape));
  });

  // Construct CSV String
  const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
  ].join('\n');

  // Trigger Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${handle}-shopify_import.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};