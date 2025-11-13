import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultsDisplay } from './components/ResultsDisplay';
import { LoadingOverlay } from './components/LoadingOverlay';
import { GeneratedContent, GeneratedImage, CreativeStyle } from './types';
import { generateFullPhotoshoot, editImageWithGemini, regenerateDetailsFromNewName } from './services/geminiService';
import { HeaderIcon } from './components/icons';

const App: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUpdatingDetails, setIsUpdatingDetails] = useState<boolean>(false);
  const [generatingMessage, setGeneratingMessage] = useState<string>('');
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creativeStyle, setCreativeStyle] = useState<CreativeStyle>('modern_suburban');

  const handleGenerate = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one image.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const content = await generateFullPhotoshoot(uploadedFiles[0], setGeneratingMessage, creativeStyle);
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

  const handleRegenerateDetails = useCallback(async (newName: string) => {
    if (!generatedContent || uploadedFiles.length === 0) return;
    
    setIsUpdatingDetails(true);
    setError(null);
    try {
        const newDetails = await regenerateDetailsFromNewName(uploadedFiles[0], newName);
        setGeneratedContent(prevContent => {
            if (!prevContent) return null;
            return {
                ...prevContent,
                details: {
                    ...prevContent.details,
                    ...newDetails,
                }
            };
        });
    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during detail regeneration.';
        setError(`Failed to regenerate details: ${errorMessage}`);
    } finally {
        setIsUpdatingDetails(false);
    }
  }, [generatedContent, uploadedFiles]);


  const handleRegenerateImage = useCallback(async (imageToRegen: GeneratedImage) => {
    if (!generatedContent || uploadedFiles.length === 0) return;

    setEditingImageId(imageToRegen.id);
    setError(null);

    try {
      // For regeneration, we use the original uploaded file and the prompt for that specific scene.
      const newBase64 = await editImageWithGemini(
        uploadedFiles[0],
        imageToRegen.sourcePrompt
      );

      const updatedImages = generatedContent.images.map((img) =>
        img.id === imageToRegen.id ? { ...img, base64: newBase64 } : img
      );
      setGeneratedContent({ ...generatedContent, images: updatedImages });
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during regeneration.';
      setError(`Regeneration failed for "${imageToRegen.title}": ${errorMessage}`);
    } finally {
      setEditingImageId(null);
    }
  }, [generatedContent, uploadedFiles]);

  const handleEditImage = useCallback(async (imageId: string, prompt: string) => {
    if (!generatedContent) return;

    const imageToEdit = generatedContent.images.find(img => img.id === imageId);
    if (!imageToEdit) return;

    setEditingImageId(imageId);
    setError(null);

    try {
       const newBase64 = await editImageWithGemini(
         `data:image/png;base64,${imageToEdit.base64}`,
         prompt
       );

      const updatedImages = generatedContent.images.map((img) =>
        img.id === imageId ? { ...img, base64: newBase64, sourcePrompt: prompt } : img
      );
      setGeneratedContent({ ...generatedContent, images: updatedImages });
    // FIX: Added curly braces to the catch block to correctly handle errors.
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during edit.';
      setError(`Image edit failed for "${imageToEdit.title}": ${errorMessage}`);
    } finally {
      setEditingImageId(null);
    }
  }, [generatedContent]);

  const handleReset = () => {
    setUploadedFiles([]);
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
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-2">Upload Your Furniture Photos</h2>
            <p className="text-gray-600 text-center mb-6">Upload one or more images of your product. We'll use the first image to generate a complete professional photoshoot.</p>
            <ImageUploader
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              creativeStyle={creativeStyle}
              setCreativeStyle={setCreativeStyle}
            />
          </div>
        ) : (
          <ResultsDisplay
            content={generatedContent}
            onEditImage={handleEditImage}
            onRegenerateImage={handleRegenerateImage}
            onRegenerateDetails={handleRegenerateDetails}
            editingImageId={editingImageId}
            isUpdatingDetails={isUpdatingDetails}
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