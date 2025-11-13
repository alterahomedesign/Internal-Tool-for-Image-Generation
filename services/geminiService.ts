import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedContent, GeneratedImage, ProductDetails, CreativeStyle } from '../types';
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

const generateSocialMediaCaption = async (base64Image: string, productName: string): Promise<string> => {
    const prompt = `Based on the image and the product name "${productName}", write a captivating and short social media caption. Include 2-3 relevant hashtags. The tone should be inspiring and aspirational.`;
    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1],
        },
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
    });
    return response.text;
};

export const regenerateDetailsFromNewName = async (imageFile: File, newName: string): Promise<Partial<ProductDetails>> => {
    const base64Image = await fileToBase64(imageFile);
    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1],
        },
    };
    const prompt = `Given the product name "${newName}", regenerate a compelling product description (HTML format), a concise SEO title (under 60 characters), and an engaging SEO meta description (under 160 characters) for the furniture in the image.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING },
                    seoTitle: { type: Type.STRING },
                    seoDescription: { type: Type.STRING }
                },
                required: ['description', 'seoTitle', 'seoDescription']
            }
        }
    });

    return JSON.parse(response.text);
};


const generateProductDetails = async (base64Image: string): Promise<Omit<ProductDetails, 'socialMediaCaption'>> => {
  const prompt = 'Based on the provided image of a furniture piece, generate the following for an e-commerce store: a creative and appealing product description (in HTML format, using paragraphs and lists where appropriate), 3 distinct marketable names, a list of 5-7 relevant product tags, a concise SEO title (under 60 characters), and a compelling SEO meta description (under 160 characters).';
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image.split(',')[1],
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro', // Using a more powerful model for better structured output
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
                    description: "A detailed and appealing product description in HTML format."
                },
                tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "An array of 5-7 relevant e-commerce tags."
                },
                seoTitle: {
                    type: Type.STRING,
                    description: "A concise SEO title (under 60 characters)."
                },
                seoDescription: {
                    type: Type.STRING,
                    description: "A compelling SEO meta description (under 160 characters)."
                }
            },
            required: ['names', 'description', 'tags', 'seoTitle', 'seoDescription']
        }
    }
  });

  const jsonString = response.text;
  return JSON.parse(jsonString);
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

const getPromptLibraries = (category: string) => {
    const commonInstructions = "The furniture's texture must be rendered with hyper-realistic fidelity. The final image must be an ultra-realistic, cinematic photograph. There should be NO vignetting, lens flare, or artificial light gradients. The furniture must be perfectly integrated with realistic contact shadows. Avoid showing any cityscapes or prominent sky. Ensure all areas, including the edges and corners of the frame, are free of any unnatural shading, discoloration, or grey spots.";

    const scenes = {
        modern_suburban: {
            living: [
                { setting: "Modern Open-Concept Living Room", prompt: `Task: Place the furniture from the user's image, shot from a straight-on perspective, into a spacious, open-concept living room within a high-end suburban house. The room features light oak hardwood floors, high ceilings, and a neutral, minimalist color palette. The primary light source is bright, indirect natural light from a large wall of glass (out of frame), creating a soft, airy ambiance. Decor is sparse and tasteful. ${commonInstructions}` },
                { setting: "Suburban Sunroom", prompt: `Task: Integrate the furniture from the user's image, captured from a dynamic three-quarter view, into a bright and airy sunroom in an upscale suburban house. The room is surrounded by a lush green garden visible through large, clean windows (out of frame). The lighting is soft and diffused, filling the space evenly. The floor is a light-colored polished stone tile. The atmosphere is serene and connected to nature. ${commonInstructions}` },
            ],
            dining: [
                 { setting: "Formal Suburban Dining Room", prompt: `Task: Stage the table from the user's image, shot from a slightly elevated angle, in the formal dining room of an upscale modern suburban house. The room features elegant wainscoting, dark polished hardwood floors, and is illuminated by a large, contemporary chandelier that provides warm, focused light. The scene feels sophisticated and ready for entertaining. ${commonInstructions}` },
                 { setting: "Bright Eat-in Kitchen", prompt: `Task: Place the table from the user's image, from a casual, side-on perspective, within a spacious eat-in kitchen area in a modern suburban house. The background features sleek, handleless white cabinets and a marble kitchen island. Abundant natural light streams in from a large bay window (out of frame), creating a bright and welcoming daytime scene. ${commonInstructions}` },
            ],
            office: [
                { setting: "Peaceful Home Office", prompt: `Task: Position the office furniture from the user's image, shot from a classic three-quarter view, in a dedicated home office in an upscale suburban house. A large picture window (out of frame) overlooks a serene, landscaped backyard, providing ample, calm natural light. The walls are a calming, muted greige. The space is uncluttered and conducive to focus. ${commonInstructions}` },
                { setting: "Loft Workspace", prompt: `Task: Integrate the office furniture from the user's image, from a straight-on perspective, into a designated office nook within a large, open-plan loft area of a suburban house. The space is defined by a stylish area rug over polished concrete floors. The lighting is a mix of natural light from a skylight (out of frame) and modern track lighting. ${commonInstructions}` },
            ],
             bedroom: [
                { setting: "Serene Master Bedroom", prompt: `Task: Place the furniture from the user's image, shot from a straight-on angle, in a spacious master bedroom in a modern suburban house. The atmosphere is calm and serene, with a neutral color palette and plush, light-colored carpeting. Soft, indirect morning light fills the space from a large sliding door leading to a private balcony (out of frame). ${commonInstructions}` },
                { setting: "Chic Guest Bedroom", prompt: `Task: Integrate the furniture from the user's image, from a casual, three-quarter angle, into a chic and welcoming guest bedroom in a modern suburban house. The room is well-appointed but not cluttered. The lighting is warm and inviting, coming from stylish bedside sconces and a central ceiling fixture, creating a cozy evening ambiance. ${commonInstructions}` },
            ]
        },
        scandinavian: {
             living: [
                { setting: "Airy Scandinavian Loft", prompt: `Task: Place the furniture from the user's image, shot from a low angle, into a bright, airy Scandinavian-style loft. The room has whitewashed brick walls, pale Dinesen-style wood floors, and is flooded with soft, natural light from large, black-framed windows (out of frame). The decor is minimal, featuring a few carefully chosen plants and a simple, textured rug. ${commonInstructions}` },
                { setting: "Minimalist Living Space", prompt: `Task: Integrate the furniture from the user's image, from a three-quarter view, into a minimalist Scandinavian living space. The walls are pure white, the flooring is light ash wood. A single, large abstract art piece hangs on the wall. The lighting is diffuse and even, creating a calm and tranquil mood. ${commonInstructions}` },
            ],
            dining: [{ setting: "Scandinavian Dining Nook", prompt: `Task: Place the table from the user's image into a cozy Scandinavian dining nook with a built-in light wood bench and simple pendant lighting. ${commonInstructions}`}],
            office: [{ setting: "Functional Scandi Office", prompt: `Task: Stage the office furniture in a functional and clean Scandinavian home office with birch plywood details and excellent natural light. ${commonInstructions}`}],
            bedroom: [{ setting: "Restful Scandinavian Bedroom", prompt: `Task: Place the bed/furniture in a restful Scandinavian bedroom with layered neutral linens, a simple platform bed frame, and soft morning light. ${commonInstructions}`}],
        },
        moody_luxurious: {
             living: [
                { setting: "Elegant Evening Lounge", prompt: `Task: Place the furniture from the user's image, shot straight-on, into a moody and luxurious lounge. The walls are a deep charcoal grey, floors are dark, polished herringbone wood. The room is illuminated by sophisticated, warm artificial light from a modern brass chandelier and a few spotlights, creating dramatic highlights and shadows. The ambiance is exclusive and elegant. ${commonInstructions}` },
                { setting: "Sophisticated Study", prompt: `Task: Integrate the furniture from the user's image, from a classic three-quarter angle, into a sophisticated study with floor-to-ceiling dark wood bookshelves. A single, low-hanging pendant light casts a warm, focused glow on the furniture. The mood is intimate, perfect for a high-end catalog. ${commonInstructions}` },
            ],
            dining: [{ setting: "Dramatic Dining Room", prompt: `Task: Stage the table in a dramatic, dark-walled dining room, lit by candlelight and a statement chandelier. Textures like velvet and dark marble are present. ${commonInstructions}`}],
            office: [{ setting: "Executive Home Office", prompt: `Task: Place the office furniture in an executive home office with dark paneled walls, a leather-topped desk, and focused task lighting. The mood is powerful and serious. ${commonInstructions}`}],
            bedroom: [{ setting: "Luxury Hotel-Style Bedroom", prompt: `Task: Integrate the furniture into a luxurious, hotel-style bedroom with dark, textured wallpaper, plush carpets, and sophisticated accent lighting. ${commonInstructions}`}],
        },
        warm_rustic: {
             living: [
                { setting: "Cozy Farmhouse Living Room", prompt: `Task: Place the furniture from the user's image, from a slightly low angle, into a cozy, modern farmhouse living room. The scene features a whitewashed exposed brick wall and wide-plank, reclaimed wood floors. The room is filled with warm, inviting light from a fireplace (glowing, out of frame). The atmosphere is comfortable and authentic. ${commonInstructions}` },
                { setting: "Rustic Converted Barn", prompt: `Task: Integrate the furniture from the user's image, from a straight-on perspective, into a spacious converted barn with high ceilings and exposed wooden beams. The floor is polished concrete with a large, neutral-toned jute rug. The lighting is a mix of natural light from large barn doors (out of frame) and warm, industrial-style Edison bulb fixtures. ${commonInstructions}` },
            ],
            dining: [{ setting: "Rustic Harvest Kitchen", prompt: `Task: Stage the table in a rustic kitchen with a large harvest table, terracotta floor tiles, and warm pendant lighting. ${commonInstructions}`}],
            office: [{ setting: "Comfortable Den Office", prompt: `Task: Place the office furniture in a comfortable den-style office with wood paneling, a worn leather rug, and warm light from a desk lamp. ${commonInstructions}`}],
            bedroom: [{ setting: "Cozy Cabin Bedroom", prompt: `Task: Integrate the furniture into a cozy cabin bedroom with wood-paneled walls, a plush flannel duvet, and the warm glow of a bedside lamp. ${commonInstructions}`}],
        },
        industrial_loft: {
            living: [
                { setting: "Urban Industrial Loft", prompt: `Task: Place the furniture from the user's image, from a three-quarter view, into a spacious industrial loft apartment. The room has high ceilings with exposed ductwork, a weathered red brick accent wall, and polished concrete floors. Light streams in from massive, black-paned factory windows (out of frame). The aesthetic is urban, edgy, and modern. ${commonInstructions}` },
                { setting: "Artist's Loft Studio", prompt: `Task: Integrate the furniture from the user's image, from a straight-on angle, into a multi-purpose artist's loft. The space is open and features scuffed hardwood floors and large, paint-splattered canvases leaning against a white brick wall. Track lighting on the ceiling illuminates the scene with focused, gallery-style light. The vibe is creative and eclectic. ${commonInstructions}` },
            ],
            dining: [{ setting: "Loft Dining Area", prompt: `Task: Stage the table in an industrial loft dining area with a large, rustic wood and metal table, mismatched metal chairs, and oversized industrial pendant lights overhead. ${commonInstructions}`}],
            office: [{ setting: "Startup-Style Loft Office", prompt: `Task: Place the office furniture in a home office corner of an industrial loft. The scene includes an exposed metal pipe shelving unit and a view of a brick wall. Lighting is functional and modern. ${commonInstructions}`}],
            bedroom: [{ setting: "Mezzanine Loft Bedroom", prompt: `Task: Integrate the furniture into a bedroom on a mezzanine level in an industrial loft. A low-slung platform bed and black metal railings are visible. The lighting is soft and moody from bedside Edison lamps. ${commonInstructions}`}],
        },
    };
    
    let promptsForCategory;
    switch (category) {
        case 'sofa':
        case 'chair':
        case 'storage':
            promptsForCategory = {
                modern_suburban: scenes.modern_suburban.living,
                scandinavian: scenes.scandinavian.living,
                moody_luxurious: scenes.moody_luxurious.living,
                warm_rustic: scenes.warm_rustic.living,
                industrial_loft: scenes.industrial_loft.living,
            };
            break;
        case 'table':
             promptsForCategory = {
                modern_suburban: scenes.modern_suburban.dining,
                scandinavian: scenes.scandinavian.dining,
                moody_luxurious: scenes.moody_luxurious.dining,
                warm_rustic: scenes.warm_rustic.dining,
                industrial_loft: scenes.industrial_loft.dining,
            };
            break;
        case 'office':
             promptsForCategory = {
                modern_suburban: scenes.modern_suburban.office,
                scandinavian: scenes.scandinavian.office,
                moody_luxurious: scenes.moody_luxurious.office,
                warm_rustic: scenes.warm_rustic.office,
                industrial_loft: scenes.industrial_loft.office,
            };
            break;
        case 'bed':
             promptsForCategory = {
                modern_suburban: scenes.modern_suburban.bedroom,
                scandinavian: scenes.scandinavian.bedroom,
                moody_luxurious: scenes.moody_luxurious.bedroom,
                warm_rustic: scenes.warm_rustic.bedroom,
                industrial_loft: scenes.industrial_loft.bedroom,
            };
            break;
        default:
             promptsForCategory = {
                modern_suburban: scenes.modern_suburban.living,
                scandinavian: scenes.scandinavian.living,
                moody_luxurious: scenes.moody_luxurious.living,
                warm_rustic: scenes.warm_rustic.living,
                industrial_loft: scenes.industrial_loft.living,
            };
    }
    return promptsForCategory;
};


export const generateFullPhotoshoot = async (
  imageFile: File,
  updateMessage: (message: string) => void,
  style: CreativeStyle,
): Promise<GeneratedContent> => {
  const base64Image = await fileToBase64(imageFile);

  updateMessage('Analyzing furniture type...');
  const furnitureCategory = await analyzeFurnitureType(base64Image);
  
  const lifestylePrompts = getPromptLibraries(furnitureCategory)[style];

  const studioNegativePrompt = " The background must be perfectly uniform, with no gradients, shadows, discoloration, or artifacts, especially in the corners.";
  
  const prompts = {
    studio: [
      { angle: "Front View", prompt: `Professional product photography. Place the furniture from the image on a pure white, seamless background (#FFFFFF). The camera is positioned directly in front, at a standard height. The lighting should be soft and even, mimicking a large octabox diffuser to showcase the furniture's form and render its material textures with hyper-realistic detail. Fabric weaves, wood grains, and metal finishes must appear tangible and authentic. Create a subtle, soft ground shadow for realism. The final image must be an ultra-realistic, 8k resolution photograph with sharp focus, perfect for a high-end e-commerce catalog. ${studioNegativePrompt}` },
      { angle: "Three-Quarter View (Right)", prompt: `Professional product photography. Position the furniture from the image on a pure white, seamless background (#FFFFFF), angled slightly to the right to reveal its depth. The camera is positioned at a 45-degree angle. Use studio lighting with a key light and a fill light to create gentle depth and dimension, highlighting the form and contours. The textures of all materials (wood, fabric, metal) must appear exceptionally authentic and detailed, capturing subtle surface variations and light interplay. Create a soft, diffused ground shadow. The final image must be an ultra-realistic, 8k resolution photograph with sharp focus. ${studioNegativePrompt}` },
      { angle: "Three-Quarter View (Left)", prompt: `Professional product photography. Position the furniture from the image on a pure white, seamless background (#FFFFFF), angled slightly to the left to showcase its other side. The camera is at a 3/4 angle. The lighting should be bright and clean, emphasizing the product's silhouette and material finish. Render all textures with extreme fidelity; the subtle grain of wood, the delicate weave of fabric, and the smooth sheen of metal must be captured with photorealistic precision. Ensure realistic, soft shadows are cast on the ground. The final image must be an ultra-realistic, 8k resolution photograph with sharp focus, suitable for a product gallery. ${studioNegativePrompt}` },
    ],
    lifestyle: lifestylePrompts,
    social: [
      { format: "Instagram Post (Square)", prompt: "Task: Create a trendy, aspirational Instagram post. Place the furniture from the user's image into a beautifully styled, minimalist interior with a Japandi or Scandinavian aesthetic. The lighting must be bright, soft, and natural. The composition within the 1:1 square format should be impeccable, using negative space effectively. The textures of the furniture must be rendered with exceptional detail, making the material—whether it's rich velvet, rustic wood, or sleek metal—look convincingly real and inviting. The final image needs to be an ultra-realistic photograph that would stop someone scrolling through their feed.", aspectRatio: '1:1' as const },
      { format: "Instagram Story (Vertical)", prompt: "Task: Generate a captivating 9:16 vertical image for an Instagram Story. Place the furniture from the user's image into a stylish, relatable corner of a modern home. Use a dynamic composition that leads the eye through the frame. The lighting should be soft and flattering, like early morning light. The scene should feel authentic and unstaged. The furniture's material and texture should be clearly visible and appealing, rendered with high fidelity to look great even on a small screen. The final photograph must be hyper-realistic and high-resolution, making the viewer feel like they've stumbled upon a beautiful moment in a real home.", aspectRatio: '9:16' as const },
    ],
  };

  updateMessage('Generating product details, tags, and SEO metadata...');
  const initialDetails = await generateProductDetails(base64Image);
  
  updateMessage('Generating social media caption...');
  const socialCaption = await generateSocialMediaCaption(base64Image, initialDetails.names[0]);
  
  const details: ProductDetails = { ...initialDetails, socialMediaCaption: socialCaption };

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

  return { details, images: allImages, furnitureCategory };
};