import React from 'react';
import { GeneratedContent, GeneratedImage } from '../types';
import { ImageCard } from './ImageCard';
import { downloadAllImagesAsZip, formatDimensions } from '../utils/fileUtils';
import { DownloadIcon } from './icons';
import { CopyButton } from './CopyButton';

interface ResultsDisplayProps {
  content: GeneratedContent;
  onEditImage: (variationId: string, imageId: string, prompt: string) => Promise<void>;
  onRegenerateImage: (variationId: string, image: GeneratedImage, newPrompt?: string) => Promise<void>;
  editingImageId: string | null;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  content,
  onEditImage,
  onRegenerateImage,
  editingImageId,
}) => {
  const { baseDetails, variationResults } = content;

  const handleDownloadAll = () => {
    downloadAllImagesAsZip(variationResults, baseDetails.names[0] || 'product');
  };

  const getVariationTitle = (variation: Record<string, string>): string => {
    // Exclude dimensions from the main title
    return Object.entries(variation)
      .filter(([key]) => key.toLowerCase() !== 'dimensions')
      .map(([, value]) => value)
      .join(' / ');
  };
  
  const primaryName = baseDetails.names[0] || 'Unnamed Product';
  const alternativeNames = baseDetails.names.slice(1);

  return (
    <div className="space-y-12">
      {/* Header and Download Button */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Your Photoshoot is Ready!</h2>
            <p className="mt-2 text-lg text-gray-600">Review, edit, and download the generated assets for all product variations.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <button
              onClick={handleDownloadAll}
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
            >
              <DownloadIcon />
              Download All Images (.zip)
            </button>
          </div>
        </div>
      </div>

      {/* Base Product Details */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Base Product Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
                <div>
                    <h4 className="text-lg font-bold text-gray-900">{primaryName}</h4>
                    {alternativeNames.length > 0 && (
                        <div className="mt-2">
                            <p className="text-sm text-gray-500 mb-1">Alternative names:</p>
                            <div className="flex flex-wrap gap-2 items-center">
                                {alternativeNames.map((name, i) => (
                                    <span key={i} className="flex items-center text-sm text-gray-700 bg-gray-100 rounded-full px-3 py-1">
                                        {name}
                                        <CopyButton textToCopy={name} className="ml-2 p-1" />
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="prose prose-sm max-w-none text-gray-600">
                    {baseDetails.description.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                </div>
                 <div className="flex flex-wrap gap-2">
                    {baseDetails.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-medium">{tag}</span>
                    ))}
                </div>
            </div>
            <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-indigo-800">Suggested Price</p>
                    <p className="text-3xl font-bold text-indigo-900">{baseDetails.suggestedPrice}</p>
                    <p className="text-xs text-indigo-700 mt-1">Based on product materials and dimensions.</p>
                </div>
            </div>
        </div>
      </div>

      {/* Image Sections per Variation */}
      <div className="space-y-10">
        {variationResults.map(result => (
          <div key={result.id}>
              <div className="mb-6 pb-2 border-b border-gray-300">
                <h3 className="text-2xl font-bold text-gray-800">
                    Variation: <span className="text-indigo-600">{getVariationTitle(result.variation)}</span>
                </h3>
                {result.variation.Dimensions && (
                    <p className="mt-1 text-sm text-gray-500">
                        {formatDimensions(result.variation.Dimensions)}
                    </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {result.images.map((image) => (
                  <ImageCard
                  key={image.id}
                  image={image}
                  onEdit={(imageId, prompt) => onEditImage(result.id, imageId, prompt)}
                  onRegenerate={(img, newPrompt) => onRegenerateImage(result.id, img, newPrompt)}
                  isEditing={editingImageId === image.id}
                  />
              ))}
              </div>
          </div>
        ))}
      </div>
    </div>
  );
};