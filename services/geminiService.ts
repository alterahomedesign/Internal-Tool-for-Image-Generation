
import { GoogleGenAI, Type, Modality, ContentPart } from "@google/genai";
import { GeneratedContent, GeneratedImage, ProductDetails, VariationResult } from '../types';
import { fileToBase64 } from "../utils/fileUtils";

// Lazily initialize the AI client to prevent app crash on load if API key is missing.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const preservationInstruction = "**CRITICAL INSTRUCTION: You MUST preserve the exact design, shape, proportions, and materials of the furniture from the source images. DO NOT add, remove, or alter any part of the furniture's design. Your ONLY task is to place this exact piece of furniture into the described scene or modify the scene around it. If the source image is low resolution, upscale it while strictly maintaining the original textures and details. DO NOT include any text, dimensions, measurements, arrows, lines, or annotations in the image. The image must be a clean, professional photograph without any graphic overlays or artifacts.**";

const cleanImageInstruction = "The final image must be a single, full-frame, clean photograph. DO NOT include any text, numbers, measurements, arrows, diagrams, watermarks, or overlay graphics. DO NOT produce a collage, split screen, grid, or multi-view composition. DO NOT include black lines or dividers. DO NOT include vignetting, grey corners, or lighting artifacts in the background. The lighting should be natural and soft, avoiding harsh artificial highlights.";

interface ParsedSpecSheet {
    productName: string;
    modelNo: string;
    variations: {
        attributes: Record<string, string>;
    }[];
}

const parseSpecSheet = async (sourceFiles: File[]): Promise<ParsedSpecSheet> => {
    const ai = getAiClient();
    
    // We send all images (up to 3 to save tokens/latency) to check for spec data
    const maxFilesToCheck = Math.min(sourceFiles.length, 4);
    const contentParts: ContentPart[] = [];

    for (let i = 0; i < maxFilesToCheck; i++) {
        const base64Image = await fileToBase64(sourceFiles[i]);
         contentParts.push({
            inlineData: {
                mimeType: sourceFiles[i].type,
                data: base64Image.split(',')[1],
            },
        });
    }

    const prompt = `
        Analyze the provided images. Some may be photos of furniture, others might be a technical specification sheet containing text and charts.

        Your goal is to extract product information.

        1.  **Search for Spec Data**: Look for a table, chart, or text that lists Model Number, Colors, Sizes, or Dimensions.
        2.  **If Spec Data Exists**: Extract the Product Name, Model Number, and all Variations (Combinations of Color/Size).
        3.  **If NO Spec Data Exists (Just Photos)**:
            *   Identify the type of furniture (e.g., "Modern Armchair").
            *   Estimate the dimensions based on standard furniture sizes (format: L*W*H CM).
            *   Identify the color and material shown in the photos.
            *   Create a single "Default" variation with these observed attributes.

        Return a JSON object adhering to the schema.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [...contentParts, { text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    productName: { type: Type.STRING, description: "A general name for the product." },
                    modelNo: { type: Type.STRING, description: "The model number if found, otherwise 'N/A'." },
                    variations: {
                        type: Type.ARRAY,
                        description: "An array containing every single possible product variation. If no variations found, return one entry representing the product shown.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                attributes: {
                                    type: Type.OBJECT,
                                    description: "A key-value map of the variation's attributes.",
                                    properties: {
                                        Size: { type: Type.STRING, description: "e.g., 'Standard' or 'Three seats'" },
                                        Dimensions: { type: Type.STRING, description: "e.g., '240*100*78CM'. Must estimate if not found." },
                                        Color: { type: Type.STRING, description: "The identified color name, e.g., 'Beige'" },
                                        Material: { type: Type.STRING, description: "e.g., 'Velvet' or 'Wood'" }
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


const generateBaseProductDetails = async (sourceFiles: File[], baseProductName: string, userInstructions: string): Promise<ProductDetails> => {
    const ai = getAiClient();
    // Use the first image as the main visual reference for description
    const base64Image = await fileToBase64(sourceFiles[0]);
    const imagePart = {
        inlineData: {
            mimeType: sourceFiles[0].type,
            data: base64Image.split(',')[1],
        },
    };
    const prompt = `Based on the provided furniture image(s) for a "${baseProductName}", generate the following for an e-commerce store. 
    
    User specific instructions for tone, style, or details: "${userInstructions}"
    
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
    
    const finalPrompt = `${preservationInstruction}\n${cleanImageInstruction}\n\nUser request: "${prompt}"`;
    contentParts.push({ text: finalPrompt });
    
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
  userInstructions: string,
  updateMessage: (message: string) => void,
): Promise<GeneratedContent> => {
  if (sourceFiles.length === 0) {
    throw new Error("At least one source image must be provided.");
  }

  updateMessage('Analyzing images for product details...');
  const parsedData = await parseSpecSheet(sourceFiles);
  const { productName, variations } = parsedData;

  updateMessage('Generating base product details...');
  const baseDetails = await generateBaseProductDetails(sourceFiles, productName, userInstructions);
  
  const variationResults: VariationResult[] = [];
  const totalVariations = variations.length;

  // Add user instructions to the prompt context if provided
  const instructionsText = userInstructions ? `User specific instructions: "${userInstructions}".` : "";
  
  const photographyStyle = "Award-winning product photography, shot on 85mm lens, f/8 aperture for sharp focus with subtle depth of field. Soft, diffused natural studio lighting. Ultra-high resolution, 8k, highly detailed textures. Super natural, tangible, and organic look. No CGI gloss, no artifacts.";

  for (let i = 0; i < totalVariations; i++) {
    const variation = variations[i].attributes;
    const variationName = Object.values(variation).join(', ');
    updateMessage(`Generating images for variation ${i + 1}/${totalVariations}: ${variationName}`);
    
    const primaryProductName = baseDetails.names[0] || productName;
    const variationImages: GeneratedImage[] = [];

    // --- Studio Shot (Front View) - Always Generate ---
    // Strict prompt to avoid top-left grey shadings
    const studioPromptFront = `Using the provided images as a visual guide, create a professional Front View product photo of the ${primaryProductName}. Variation details: Size is ${variation.Size}, color is ${variation.Color}. Place it on a completely flat, pure white background (Hex #FFFFFF). The background must be evenly lit from edge-to-edge with NO grey shadings, NO shadows in the top corners, NO vignetting, and NO horizon line. It should be a perfect cutout-style white background. ${photographyStyle} ${instructionsText} ${preservationInstruction} ${cleanImageInstruction}`;
    const studioBase64 = await regenerateImageFromSource(sourceFiles, studioPromptFront);
    variationImages.push({
        id: crypto.randomUUID(),
        title: 'Studio Shot (Front View)',
        description: 'High quality front view on white background.',
        base64: studioBase64,
        sourcePrompt: studioPromptFront,
        sourceAspectRatio: '16:9',
        category: 'studio',
    });

    // --- Studio Shot (3/4 View) - Generate if Single Variation ---
    if (totalVariations === 1) {
         updateMessage(`Generating 3/4 angle view...`);
         // Strict prompt to avoid top-left grey shadings
         const studioPromptAngle = `Using the provided images as a visual guide, create a professional 3/4 Angle View product photo of the ${primaryProductName}. Show the depth and side details. Variation details: Size is ${variation.Size}, color is ${variation.Color}. Place it on a completely flat, pure white background (Hex #FFFFFF). The background must be evenly lit from edge-to-edge with NO grey shadings, NO shadows in the top corners, NO vignetting, and NO horizon line. It should be a perfect cutout-style white background. ${photographyStyle} ${instructionsText} ${preservationInstruction} ${cleanImageInstruction}`;
         const studioBase64Angle = await regenerateImageFromSource(sourceFiles, studioPromptAngle);
         variationImages.push({
             id: crypto.randomUUID(),
             title: 'Studio Shot (3/4 View)',
             description: 'High quality 3/4 angle view on white background.',
             base64: studioBase64Angle,
             sourcePrompt: studioPromptAngle,
             sourceAspectRatio: '16:9',
             category: 'studio',
         });
    }

    // --- Lifestyle Images ---
    if (totalVariations === 1) {
        // Rule: If only 1 variation (or no spec sheet found), generate 3 distinct lifestyle images.
        
        // Lifestyle 1: Standard Living Area
        updateMessage(`Generating lifestyle scene 1/3...`);
        const lifestylePrompt1 = `Using the provided images as a visual guide, create a super natural, high-end lifestyle image of the ${primaryProductName}. Place it in a beautifully styled, minimalist living room with a Japandi aesthetic. Soft, organic natural daylight entering from a window. The room should feel lived-in but tidy. ${photographyStyle} ${instructionsText} ${preservationInstruction} ${cleanImageInstruction}`;
        const lifestyleBase64_1 = await regenerateImageFromSource(sourceFiles, lifestylePrompt1);
        variationImages.push({
            id: crypto.randomUUID(),
            title: 'Lifestyle: Living Space',
            description: 'Natural minimalist living room context.',
            base64: lifestyleBase64_1,
            sourcePrompt: lifestylePrompt1,
            sourceAspectRatio: '16:9',
            category: 'lifestyle',
        });

        // Lifestyle 2: Detail/Close-up or Cozy Corner
        updateMessage(`Generating lifestyle scene 2/3...`);
        const lifestylePrompt2 = `Using the provided images as a visual guide, create a cozy, atmospheric lifestyle image of the ${primaryProductName}. Focus on the texture of the materials. Place it in a warm, inviting corner with soft evening light and organic decor elements like a plant or a rug. ${photographyStyle} ${instructionsText} ${preservationInstruction} ${cleanImageInstruction}`;
        const lifestyleBase64_2 = await regenerateImageFromSource(sourceFiles, lifestylePrompt2);
        variationImages.push({
            id: crypto.randomUUID(),
            title: 'Lifestyle: Atmospheric/Cozy',
            description: 'Warm lighting with focus on texture and atmosphere.',
            base64: lifestyleBase64_2,
            sourcePrompt: lifestylePrompt2,
            sourceAspectRatio: '16:9',
            category: 'lifestyle',
        });

         // Lifestyle 3: High-End/Editorial
         updateMessage(`Generating lifestyle scene 3/3...`);
         const lifestylePrompt3 = `Using the provided images as a visual guide, create a high-end editorial style image of the ${primaryProductName}. Place it in a spacious, architectural concrete loft or gallery space. Dramatic but soft shadows, strong composition, magazine quality. ${photographyStyle} ${instructionsText} ${preservationInstruction} ${cleanImageInstruction}`;
         const lifestyleBase64_3 = await regenerateImageFromSource(sourceFiles, lifestylePrompt3);
         variationImages.push({
             id: crypto.randomUUID(),
             title: 'Lifestyle: Architectural Loft',
             description: 'High-end editorial style in a loft.',
             base64: lifestyleBase64_3,
             sourcePrompt: lifestylePrompt3,
             sourceAspectRatio: '16:9',
             category: 'lifestyle',
         });

    } else {
        // Standard behavior for multiple variations: 1 Lifestyle shot per variation
        updateMessage(`Generating lifestyle scene for variation ${i + 1}/${totalVariations}...`);
        const lifestylePrompt = `Using the provided images as a visual guide, create a trendy, aspirational lifestyle image of the ${primaryProductName}. Variation details: Size is ${variation.Size}, color is ${variation.Color}. Place it in a beautifully styled, minimalist interior with a Japandi or Scandinavian aesthetic. The lighting must be bright, soft, and natural. ${photographyStyle} ${instructionsText} ${preservationInstruction} ${cleanImageInstruction}`;
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
    }

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
