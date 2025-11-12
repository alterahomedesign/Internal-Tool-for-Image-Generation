import React, { useState } from 'react';
import { GeneratedContent, GeneratedImage } from '../types';
import { ImageCard } from './ImageCard';
import { createAndDownloadZip } from '../utils/fileUtils';
import { DownloadIcon } from './icons';

interface ResultsDisplayProps {
  content: GeneratedContent;
  onEditImage: (imageId: string, prompt: string) => Promise<void>;
  onRegenerateImage: (image: GeneratedImage) => Promise<void>;
  editingImageId: string | null;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  content,
  onEditImage,
  onRegenerateImage,
  editingImageId,
}) => {
  const { images } = content;
  const [editableDetails, setEditableDetails] = useState(content.details);
  const [finalProductName, setFinalProductName] = useState(content.details.names[0] || 'My Furniture Piece');


  const handleDownload = () => {
    createAndDownloadZip(images, finalProductName, editableDetails.description);
  };
  
  const handleNameClick = (name: string) => {
    setFinalProductName(name);
  };
  
  const sections: { title: string, category: GeneratedImage['category'] }[] = [
      { title: "Studio Shots", category: 'studio' },
      { title: "Lifestyle Scenes", category: 'lifestyle' },
      { title: "Social Media Posts", category: 'social' },
  ];

  return (
    <div className="space-y-12">
      {/* Header and Download Button */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Your Photoshoot is Ready!</h2>
            <p className="mt-2 text-lg text-gray-600">Review, edit, and download your generated assets.</p>
          </div>
          <button
            onClick={handleDownload}
            className="flex-shrink-0 inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
          >
            <DownloadIcon />
            Download All as ZIP
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Product Details</h3>
        <div className="space-y-6">
            <div>
                <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Final Product Name (for ZIP file)
                </label>
                <input
                    type="text"
                    id="product-name"
                    value={finalProductName}
                    onChange={(e) => setFinalProductName(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                 <div className="mt-2 text-sm text-gray-500">
                    Suggested names (click to use):
                    <div className="flex flex-wrap gap-2 mt-1">
                        {content.details.names.map((name, index) => (
                            <button key={index} onClick={() => handleNameClick(name)} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs transition-colors">
                                {name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div>
                 <label htmlFor="product-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Description
                </label>
                <textarea
                    id="product-description"
                    rows={6}
                    value={editableDetails.description}
                    onChange={(e) => setEditableDetails({ ...editableDetails, description: e.target.value })}
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>
        </div>
      </div>


      {/* Image Sections */}
      {sections.map(section => {
        const sectionImages = images.filter(img => img.category === section.category);
        if (sectionImages.length === 0) return null;

        return (
            <div key={section.category}>
                <h3 className="text-2xl font-bold text-gray-800 mb-6">{section.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sectionImages.map((image) => (
                    <ImageCard
                    key={image.id}
                    image={image}
                    onEdit={onEditImage}
                    onRegenerate={onRegenerateImage}
                    isEditing={editingImageId === image.id}
                    />
                ))}
                </div>
          </div>
        )
      })}
    </div>
  );
};