import { GoogleGenAI, Type, Modality, ContentPart } from "@google/genai";
import { GeneratedContent, GeneratedImage, ProductDetails, VariationResult } from '../types';
import { fileToBase64 } from "../utils/fileUtils";

// Lazily initialize the AI client to prevent app crash on load if API key is missing.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const upscaleInstruction = "If the source image lacks detail, you must upscale it and generate a photorealistic, high-resolution version, inferring realistic textures and fine details.";

interface ParsedSpecSheet {
    productName: string;
    modelNo: string;
    variations: {
        attributes: Record<string, string>;
    }[];
}

const parseSpecSheet = async (specSheetFile: File): Promise<ParsedSpecSheet> => {
    const ai = getAiClient();
    const base64Image = await fileToBase64(specSheetFile);
    const imagePart = {
        inlineData: {
            mimeType: specSheetFile.type,
            data: base64Image.split(',')[1],
        },
    };

    const prompt = `
        You are an expert at analyzing furniture specification sheets. Your task is to extract all relevant information from the provided image and structure it as a JSON object.

        1.  **Product Info**: Identify the general product description/name (e.g., 'Fabric sofa') and the model number.
        2.  **Variation Axes**: Identify all properties that have multiple options, such as 'SPEC.(CM)', 'REMARK/COMBINATION/VERSION', and 'COLOR'. These are your variation axes.
        3.  **Variation Options**: For each axis, list the available options. The 'COLOR' column says '2 colors'; look at the images in the 'SPEC. PIC' column to identify the actual colors (e.g., 'Grey', 'Beige') and use them in the variations.
        4.  **Combinations**: Create a list of every possible combination of the variation options. For this sheet, it's a combination of each size with each color.
        5.  **Attributes**: For each combination, create a dictionary of its attributes.

        Return a JSON object that adheres to the provided schema. Ensure every single variation is listed.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    productName: { type: Type.STRING, description: "A general name for the product, like 'Fabric Sofa'." },
                    modelNo: { type: Type.STRING, description: "The model number, like 'LP-A813'." },
                    variations: {
                        type: Type.ARRAY,
                        description: "An array containing every single possible product variation.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                attributes: {
                                    type: Type.OBJECT,
                                    description: "A key-value map of the variation's attributes.",
                                    properties: {
                                        Size: { type: Type.STRING, description: "e.g., 'Three seats'" },
                                        Dimensions: { type: Type.STRING, description: "e.g., '240*100*78CM'" },
                                        Color: { type: Type.STRING, description: "The identified color name, e.g., 'Beige'" },
                                        Material: { type: Type.STRING, description: "e.g., 'Abrasive/suede fabric'" }
                                    },
                                    required: ["Size", "Dimensions", "Color", "Material"]
                                }
                            },
                            required: ["attributes"]
                        }
                    }
                },
                required: ['productName', 'modelNo', 'variations']
            }
        }
    });
    
    return JSON.parse(response.text);
};


const generateBaseProductDetails = async (specSheetFile: File, baseProductName: string): Promise<ProductDetails> => {
    const ai = getAiClient();
    const base64Image = await fileToBase64(specSheetFile);
    const imagePart = {
        inlineData: {
            mimeType: specSheetFile.type,
            data: base64Image.split(',')[1],
        },
    };
    const prompt = `Based on the provided furniture spec sheet for a "${baseProductName}", generate the following for an e-commerce store:
1.  **names**: An array of 3-5 creative and marketable product names. The first one should be the most conventional.
2.  **suggestedPrice**: A suggested retail price in USD, formatted as a string like "$1,299.99". Base this on the product's likely quality, materials, and size.
3.  **description**: A creative and appealing product description (in plain text, using newlines for paragraph breaks).
4.  **tags**: A list of 5-7 relevant product tags.
5.  **seoTitle**: A concise SEO title (under 60 characters).
6.  **seoDescription**: A compelling SEO meta description (under 160 characters).`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    names: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedPrice: { type: Type.STRING },
                    description: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    seoTitle: { type: Type.STRING },
                    seoDescription: { type: Type.STRING },
                },
                required: ['names', 'suggestedPrice', 'description', 'tags', 'seoTitle', 'seoDescription']
            }
        }
    });

    const detailsFromAI = JSON.parse(response.text);
    const primaryName = detailsFromAI.names[0] || baseProductName;

    return {
        ...detailsFromAI,
        measurements: 'See variations for specific dimensions.',
        shipping: 'Ships within 3 to 11 weeks.',
        careInstructions: 'General care: Wipe clean with a soft, dry cloth. Avoid harsh chemicals.',
        socialMediaCaption: `Elevate your space with the new ${primaryName}. ✨ #interiordesign #homedecor #${primaryName.replace(/\s+/g, '')}`
    };
};

export const regenerateImageFromSource = async (sourceFiles: File[], prompt: string): Promise<string> => {
    const ai = getAiClient();
    
    const imageParts = await Promise.all(sourceFiles.map(async (file) => {
        const base64Image = await fileToBase64(file);
        return {
            inlineData: {
                mimeType: file.type,
                data: base64Image.split(',')[1],
            },
        };
    }));

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [...imageParts, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!part || !part.inlineData) {
        throw new Error("Image regeneration failed, no image data returned.");
    }
    return part.inlineData.data;
}


export const editImageWithGemini = async (sources: string[], prompt: string): Promise<string> => {
    const ai = getAiClient();
    const contentParts: ContentPart[] = [];
    
    for (const source of sources) {
        const parts = source.split(';base64,');
        const mimeType = parts[0].split(':')[1];
        const base64Data = parts[1];
        contentParts.push({ inlineData: { data: base64Data, mimeType } });
    }
    
    contentParts.push({ text: prompt });
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: contentParts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!part || !part.inlineData) {
        throw new Error("Image editing failed, no image data returned.");
    }
    return part.inlineData.data;
};

export const generateVariationsFromSpecSheet = async (
  sourceFiles: File[],
  updateMessage: (message: string) => void,
): Promise<GeneratedContent> => {
  if (sourceFiles.length === 0) {
    throw new Error("At least one source image (the spec sheet) must be provided.");
  }
  const specSheetFile = sourceFiles[0];

  updateMessage('Analyzing specification sheet...');
  const parsedData = await parseSpecSheet(specSheetFile);
  const { productName, variations } = parsedData;

  updateMessage('Generating base product details...');
  const baseDetails = await generateBaseProductDetails(specSheetFile, productName);
  
  const variationResults: VariationResult[] = [];
  const totalVariations = variations.length;

  for (let i = 0; i < totalVariations; i++) {
    const variation = variations[i].attributes;
    const variationName = Object.values(variation).join(', ');
    updateMessage(`Generating images for variation ${i + 1}/${totalVariations}: ${variationName}`);
    
    const primaryProductName = baseDetails.names[0] || productName;
    const variationImages: GeneratedImage[] = [];

    // --- Generate Studio Image ---
    const studioPrompt = `Using the provided images as a visual guide (especially the spec sheet), create a professional product photo of the ${primaryProductName}. Variation details: Size is ${variation.Size}, color is ${variation.Color}. Place it on a pure white, seamless background (#FFFFFF). The lighting must be soft and even to showcase the form and hyper-realistic material textures. Add a subtle ground shadow for realism. The final image must be an ultra-realistic, 8k resolution photograph. ${upscaleInstruction}`;
    const studioBase64 = await regenerateImageFromSource(sourceFiles, studioPrompt);
    variationImages.push({
        id: crypto.randomUUID(),
        title: 'Studio Shot (Front View)',
        description: 'Clean shot on a white background.',
        base64: studioBase64,
        sourcePrompt: studioPrompt,
        sourceAspectRatio: '16:9',
        category: 'studio',
    });

    // --- Generate Lifestyle Image ---
    updateMessage(`Generating lifestyle scene for variation ${i + 1}/${totalVariations}...`);
    const lifestylePrompt = `Using the provided images as a visual guide (especially the spec sheet), create a trendy, aspirational lifestyle image of the ${primaryProductName}. Variation details: Size is ${variation.Size}, color is ${variation.Color}. Place it in a beautifully styled, minimalist interior with a Japandi or Scandinavian aesthetic. The lighting must be bright, soft, and natural. The composition should be impeccable. The final image must be an ultra-realistic photograph. ${upscaleInstruction}`;
    const lifestyleBase64 = await regenerateImageFromSource(sourceFiles, lifestylePrompt);
    variationImages.push({
        id: crypto.randomUUID(),
        title: 'Minimalist Lifestyle Scene',
        description: 'Product shown in a stylish, modern home.',
        base64: lifestyleBase64,
        sourcePrompt: lifestylePrompt,
        sourceAspectRatio: '16:9',
        category: 'lifestyle',
    });

    variationResults.push({
      id: crypto.randomUUID(),
      variation: variation,
      images: variationImages,
    });
  }
  
  updateMessage('Finalizing your photoshoot...');

  return { 
      baseDetails, 
      variationResults, 
      furnitureCategory: 'furniture' // Generic category for now
  };
};