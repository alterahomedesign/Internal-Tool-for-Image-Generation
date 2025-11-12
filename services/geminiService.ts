import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedContent, GeneratedImage, ProductDetails } from '../types';
import { fileToBase64 } from "../utils/fileUtils";

// API key must be from environment variables for security and proper configuration.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // This will be caught by the main App component and displayed to the user.
  throw new Error("API_KEY environment variable not set. Please configure it before running the application.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const analyzeFurnitureType = async (base64Image: string): Promise<string> => {
  const prompt = "Analyze the image and identify the primary type of furniture. Respond with one of the following categories: 'sofa', 'table', 'chair', 'bed', 'storage', 'office'. If it doesn't fit neatly, choose the closest category.";
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image.split(',')[1],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
          responseMimeType: 'application/json',
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  category: {
                      type: Type.STRING,
                      description: "The category of the furniture.",
                      enum: ['sofa', 'table', 'chair', 'bed', 'storage', 'office']
                  },
              },
              required: ['category']
          }
      }
    });

    const jsonString = response.text;
    const result = JSON.parse(jsonString);
    return result.category;
  } catch (error) {
      console.error("Failed to analyze furniture type, defaulting to 'sofa'.", error);
      return 'sofa'; // Default to a common category on error
  }
};


const generateProductDetails = async (base64Image: string): Promise<ProductDetails> => {
  const prompt = 'Based on the provided image of a furniture piece, generate a creative and appealing product description and 3 distinct, marketable names for it. The description should highlight its style, materials, and potential use cases.';
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image.split(',')[1],
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                names: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "An array of 3 marketable names for the furniture piece."
                },
                description: {
                    type: Type.STRING,
                    description: "A detailed and appealing product description."
                }
            },
            required: ['names', 'description']
        }
    }
  });

  const jsonString = response.text;
  return JSON.parse(jsonString) as ProductDetails;
};

export const editImageWithGemini = async (
    source: File | string,
    prompt: string
): Promise<string> => {
    let base64Data: string;
    let mimeType: string;

    if (typeof source === 'string') {
        const parts = source.split(';base64,');
        mimeType = parts[0].split(':')[1];
        base64Data = parts[1];
    } else {
        const result = await fileToBase64(source);
        const parts = result.split(';base64,');
        mimeType = parts[0].split(':')[1];
        base64Data = parts[1];
    }
    
    // Use gemini flash image for all image editing and scene creation
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: prompt },
            ],
        },
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

export const generateFullPhotoshoot = async (
  imageFile: File,
  updateMessage: (message: string) => void
): Promise<GeneratedContent> => {
  const base64Image = await fileToBase64(imageFile);

  updateMessage('Analyzing furniture type...');
  const furnitureCategory = await analyzeFurnitureType(base64Image);

  const getLifestylePrompts = (category: string) => {
    switch (category) {
      case 'sofa':
      case 'chair':
        return [
          { setting: "Modern House Living Room", prompt: "Task: Place the furniture from the user's image into a bright, airy living room in a modern house. The scene should be shot on a professional DSLR camera with a 35mm lens to capture a natural perspective. Light should stream in from large, floor-to-ceiling windows, creating soft, natural highlights and long, gentle shadows on the light oak floor. The furniture's texture (fabric weave, wood grain) must be rendered with extreme fidelity, making it look tangible and convincingly real. The overall mood should be serene and aspirational, worthy of a feature in Architectural Digest. Ensure the object is perfectly integrated, with realistic contact shadows where it meets the rug or floor." },
          { setting: "Cozy Den", prompt: "Task: Integrate the furniture from the user's image into a cozy, sophisticated living room in a contemporary house. The lighting should be warmer, suggestive of late afternoon sun, with dramatic shadows that add depth. The room should be styled with a plush wool rug, curated bookshelves, and healthy indoor plants. The furniture should be the hero of the shot, with its materials rendered with convincing, high-fidelity textures that look tangible and authentic under the warm light. Capture this as a hyper-realistic, cinematic photograph with a shallow depth of field, making the furniture pop." },
        ];
      case 'table':
        return [
          { setting: "Spacious Dining Room", prompt: "Task: Stage the table from the user's image in an elegant, spacious dining room of a modern house. The shot should be composed as if by a professional interior photographer. A large window out of frame should cast soft, directional light across the table, highlighting the material's finish and rendering its texture (e.g., fine wood grain, subtle stone veins, metallic sheen) with incredible realism. The shadows cast by the table and any (minimal) props should be soft and realistic. The floor should be polished concrete or dark hardwood. The final image must be ultra-realistic, with perfect perspective and lighting that feels natural and inviting." },
          { setting: "Modern Kitchen", prompt: "Task: Place the table from the user's image within a high-end, minimalist open-plan kitchen. The lighting should be bright and clean, a mix of natural light from a skylight and soft recessed ceiling lights. The table should appear as a natural part of the kitchen island or dining nook. Ensure reflections on the kitchen's marble countertops or stainless steel appliances are subtle and realistic. The focus should be sharp on the table, with its texture rendered in high detail, showcasing the material's authentic character (e.g. the polish on wood, the cool smoothness of marble). The final image should be a photorealistic shot for a luxury real estate catalog." },
        ];
      case 'office':
        return [
          { setting: "Sunlit Home Office", prompt: "Task: Place the office furniture from the user's image into a sophisticated and organized home office. The scene should be illuminated by soft, natural light from a large window, creating a calm and productive atmosphere. The composition should be clean, perhaps with a view of a tranquil garden outside. The furniture must be perfectly integrated, with realistic shadows on the hardwood floor and its textures—be it leather, wood, or fabric—rendered with impeccable, convincing detail. The final image should look like a professional photograph from a high-end magazine, emphasizing comfort and style." },
          { setting: "Elegant Study Room", prompt: "Task: Integrate the office furniture from the user's image into a classic, elegant study with a modern twist. Imagine a room with built-in dark walnut bookshelves. The lighting should be moody and focused, perhaps from a stylish desk lamp casting a warm pool of light, supplemented by soft ambient light. The furniture's materials—the supple texture of leather, the deep grain of wood, the cool finish of metal—must look incredibly realistic, with accurate specular highlights and tangible textures. This should be a cinematic, hyper-realistic photo that conveys a sense of quiet luxury and focus." },
        ];
      default: // for bed, storage, other
        return [
           { setting: "Modern House Living Room", prompt: "Task: Place the furniture from the user's image into a bright, airy living room in a modern house. The scene should be shot on a professional DSLR camera with a 35mm lens to capture a natural perspective. Light should stream in from large, floor-to-ceiling windows, creating soft, natural highlights and long, gentle shadows on the light oak floor. The furniture's texture (fabric weave, wood grain) must be rendered with extreme fidelity, making it look tangible and convincingly real. The overall mood should be serene and aspirational, worthy of a feature in Architectural Digest. Ensure the object is perfectly integrated, with realistic contact shadows where it meets the rug or floor." },
          { setting: "Serene Bedroom", prompt: "Place the furniture from the user's image into a serene, minimalist bedroom in a contemporary house. The room should have a calm color palette, soft textiles, and gentle morning light coming through a window. The final image must be a hyper-realistic photograph that creates a sense of peace and comfort, with all furniture textures appearing natural and detailed under the soft light." },
        ];
    }
  };

  const prompts = {
    studio: [
      { angle: "Front View", prompt: "Professional product photography. Place the furniture from the image on a pure white, seamless background (#FFFFFF). The camera is positioned directly in front, at a standard height. The lighting should be soft and even, mimicking a large octabox diffuser to showcase the furniture's form and render its material textures with hyper-realistic detail. Fabric weaves, wood grains, and metal finishes must appear tangible and authentic. Create a subtle, soft ground shadow for realism. The final image must be an ultra-realistic, 8k resolution photograph with sharp focus, perfect for a high-end e-commerce catalog." },
      { angle: "Three-Quarter View (Right)", prompt: "Professional product photography. Position the furniture from the image on a pure white, seamless background (#FFFFFF), angled slightly to the right to reveal its depth. The camera is positioned at a 45-degree angle. Use studio lighting with a key light and a fill light to create gentle depth and dimension, highlighting the form and contours. The textures of all materials (wood, fabric, metal) must appear exceptionally authentic and detailed, capturing subtle surface variations and light interplay. Create a soft, diffused ground shadow. The final image must be an ultra-realistic, 8k resolution photograph with sharp focus." },
      { angle: "Three-Quarter View (Left)", prompt: "Professional product photography. Position the furniture from the image on a pure white, seamless background (#FFFFFF), angled slightly to the left to showcase its other side. The camera is at a 3/4 angle. The lighting should be bright and clean, emphasizing the product's silhouette and material finish. Render all textures with extreme fidelity; the subtle grain of wood, the delicate weave of fabric, and the smooth sheen of metal must be captured with photorealistic precision. Ensure realistic, soft shadows are cast on the ground. The final image must be an ultra-realistic, 8k resolution photograph with sharp focus, suitable for a product gallery." },
    ],
    lifestyle: getLifestylePrompts(furnitureCategory),
    social: [
      { format: "Instagram Post (Square)", prompt: "Task: Create a trendy, aspirational Instagram post. Place the furniture from the user's image into a beautifully styled, minimalist interior with a Japandi or Scandinavian aesthetic. The lighting must be bright, soft, and natural. The composition within the 1:1 square format should be impeccable, using negative space effectively. The textures of the furniture must be rendered with exceptional detail, making the material—whether it's rich velvet, rustic wood, or sleek metal—look convincingly real and inviting. The final image needs to be an ultra-realistic photograph that would stop someone scrolling through their feed.", aspectRatio: '1:1' as const },
      { format: "Instagram Story (Vertical)", prompt: "Task: Generate a captivating 9:16 vertical image for an Instagram Story. Place the furniture from the user's image into a stylish, relatable corner of a modern home. Use a dynamic composition that leads the eye through the frame. The lighting should be soft and flattering, like early morning light. The scene should feel authentic and unstaged. The furniture's material and texture should be clearly visible and appealing, rendered with high fidelity to look great even on a small screen. The final photograph must be hyper-realistic and high-resolution, making the viewer feel like they've stumbled upon a beautiful moment in a real home.", aspectRatio: '9:16' as const },
    ],
  };

  updateMessage('Generating product details...');
  const details = await generateProductDetails(base64Image);

  const allImages: GeneratedImage[] = [];

  const processQueue = [
      ...prompts.studio.map(p => ({ prompt: p.prompt, title: p.angle, category: 'studio' as const, ar: '16:9' as const })),
      ...prompts.lifestyle.map(p => ({ prompt: p.prompt, title: p.setting, category: 'lifestyle' as const, ar: '16:9' as const })),
      ...prompts.social.map(p => ({ prompt: p.prompt, title: p.format, category: 'social' as const, ar: p.aspectRatio }))
  ];

  for (let i = 0; i < processQueue.length; i++) {
      const task = processQueue[i];
      const title = task.title || 'Image';
      updateMessage(`Generating image ${i + 1} of ${processQueue.length}: ${title}...`);
      
      const base64 = await editImageWithGemini(imageFile, task.prompt);

      allImages.push({
          id: crypto.randomUUID(),
          title: title,
          description: "A professionally generated image for your product.",
          base64,
          sourcePrompt: task.prompt,
          sourceAspectRatio: task.ar,
          category: task.category,
      });
  }
  
  updateMessage('Finalizing your photoshoot...');

  return { details, images: allImages };
};