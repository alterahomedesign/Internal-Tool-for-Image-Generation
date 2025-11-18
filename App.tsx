import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultsDisplay } from './components/ResultsDisplay';
import { LoadingOverlay } from './components/LoadingOverlay';
import { GeneratedContent, GeneratedImage } from './types';
import { generateVariationsFromSpecSheet, editImageWithGemini, regenerateImageFromSource } from './services/geminiService';
import { HeaderIcon } from './components/icons';

const App: React.FC = () => {
  const [sourceImages, setSourceImages] = useState<File[]>([]);
  const [userInstructions, setUserInstructions] = useState<string>('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingMessage, setGeneratingMessage] = useState<string>('');
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (sourceImages.length === 0) {
      setError('Please upload a product specification sheet.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const content = await generateVariationsFromSpecSheet(sourceImages, userInstructions, setGeneratingMessage);
      setGeneratedContent(content);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during generation.';
      setError(`Generation failed: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
      setGeneratingMessage('');
    }
  };

  const handleRegenerateImage = useCallback(async (variationId: string, imageToRegen: GeneratedImage, newPrompt?: string) => {
      if (!generatedContent || sourceImages.length === 0) return;

      setEditingImageId(imageToRegen.id);
      setError(null);

      try {
          const variation = generatedContent.variationResults.find(v => v.id === variationId)?.variation;
          if (!variation) {
              throw new Error("Could not find the variation to regenerate.");
          }
          
          const finalPrompt = (newPrompt && newPrompt.trim())
              ? `${imageToRegen.sourcePrompt}. Additional instruction for this regeneration: "${newPrompt}"`
              : imageToRegen.sourcePrompt;

          const newBase64 = await regenerateImageFromSource(sourceImages, finalPrompt);

          const updatedResults = generatedContent.variationResults.map(result => {
              if (result.id === variationId) {
                  const updatedImages = result.images.map(img => 
                      img.id === imageToRegen.id ? { ...img, base64: newBase64, sourcePrompt: finalPrompt } : img
                  );
                  return { ...result, images: updatedImages };
              }
              return result;
          });

          setGeneratedContent({ ...generatedContent, variationResults: updatedResults });

      } catch (err) {
          console.error(err);
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during regeneration.';
          setError(`Regeneration failed for "${imageToRegen.title}": ${errorMessage}`);
      } finally {
          setEditingImageId(null);
      }
  }, [generatedContent, sourceImages]);

  const handleEditImage = useCallback(async (variationId: string, imageId: string, prompt: string) => {
    if (!generatedContent) return;
    
    const variationResult = generatedContent.variationResults.find(vr => vr.id === variationId);
    const imageToEdit = variationResult?.images.find(img => img.id === imageId);

    if (!imageToEdit) return;

    setEditingImageId(imageId);
    setError(null);

    try {
       const newBase64 = await editImageWithGemini(
         [`data:image/png;base64,${imageToEdit.base64}`],
         prompt
       );

      const updatedResults = generatedContent.variationResults.map(result => {
        if (result.id === variationId) {
          const updatedImages = result.images.map(img => 
            img.id === imageId ? { ...img, base64: newBase64, sourcePrompt: prompt } : img
          );
          return { ...result, images: updatedImages };
        }
        return result;
      });

      setGeneratedContent({ ...generatedContent, variationResults: updatedResults });

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during edit.';
      setError(`Image edit failed for "${imageToEdit.title}": ${errorMessage}`);
    } finally {
      setEditingImageId(null);
    }
  }, [generatedContent]);

  const handleReset = () => {
    setSourceImages([]);
    setUserInstructions('');
    setGeneratedContent(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {isGenerating && <LoadingOverlay message={generatingMessage} />}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <HeaderIcon />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">AI Furniture Photoshoot</h1>
            </div>
             {generatedContent && (
                <button
                onClick={handleReset}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                Start New
                </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {!generatedContent ? (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-2">Create a New Photoshoot</h2>
            <p className="text-gray-600 text-center mb-6">Upload a product spec sheet and reference images. Add instructions to guide the style.</p>
            <ImageUploader
              sourceImages={sourceImages}
              setSourceImages={setSourceImages}
              userInstructions={userInstructions}
              setUserInstructions={setUserInstructions}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>
        ) : (
          <ResultsDisplay
            content={generatedContent}
            onEditImage={handleEditImage}
            onRegenerateImage={handleRegenerateImage}
            editingImageId={editingImageId}
          />
        )}
         {error && (
          <div className="fixed bottom-4 right-4 max-w-sm bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;