import React, { useState } from 'react';
import { GeneratedContent, GeneratedImage } from '../types';
import { ImageCard } from './ImageCard';
import { createAndDownloadShopifyZip, createAndDownloadSocialMediaZip } from '../utils/fileUtils';
import { DownloadIcon, ShopifyIcon, RegenerateIcon } from './icons';

interface ResultsDisplayProps {
  content: GeneratedContent;
  onEditImage: (imageId: string, prompt: string) => Promise<void>;
  onRegenerateImage: (image: GeneratedImage) => Promise<void>;
  onRegenerateDetails: (newName: string) => Promise<void>;
  editingImageId: string | null;
  isUpdatingDetails: boolean;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  content,
  onEditImage,
  onRegenerateImage,
  onRegenerateDetails,
  editingImageId,
  isUpdatingDetails,
}) => {
  const { images, details } = content;
  const [editableDetails, setEditableDetails] = useState(details);
  const [finalProductName, setFinalProductName] = useState(details.names[0] || 'My Furniture Piece');
  const [vendor, setVendor] = useState('My Furniture Store');
  const [price, setPrice] = useState('999.99');
  const [tags, setTags] = useState<string[]>(details.tags);
  const [newTag, setNewTag] = useState('');

  // Update local state if content from parent changes (e.g., after regeneration)
  React.useEffect(() => {
    setEditableDetails(content.details);
  }, [content.details]);

  const handleShopifyDownload = () => {
    const shopifyImages = images.filter(img => img.category !== 'social');
    createAndDownloadShopifyZip({
      images: shopifyImages,
      productName: finalProductName,
      description: editableDetails.description,
      seoTitle: editableDetails.seoTitle,
      seoDescription: editableDetails.seoDescription,
      vendor,
      price,
      tags,
      productType: content.furnitureCategory,
    });
  };
  
  const handleSocialMediaDownload = () => {
      const socialImages = images.filter(img => img.category === 'social');
      createAndDownloadSocialMediaZip(socialImages, editableDetails.socialMediaCaption, finalProductName);
  };

  const handleNameClick = (name: string) => {
    setFinalProductName(name);
  };
  
  const handleRegenerateDetailsClick = () => {
      onRegenerateDetails(finalProductName);
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const sections: { title: string, category: GeneratedImage['category'] }[] = [
      { title: "Studio Shots", category: 'studio' },
      { title: "Lifestyle Scenes", category: 'lifestyle' },
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
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <button
              onClick={handleShopifyDownload}
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
            >
              <ShopifyIcon />
              Download for Shopify
            </button>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Product & Shopify Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
                 <div>
                    <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name
                    </label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="text"
                            id="product-name"
                            value={finalProductName}
                            onChange={(e) => setFinalProductName(e.target.value)}
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <button 
                            onClick={handleRegenerateDetailsClick}
                            disabled={isUpdatingDetails}
                            className="p-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex-shrink-0"
                            title="Regenerate details with this name"
                        >
                            {isUpdatingDetails ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <RegenerateIcon />
                            )}
                        </button>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                        Suggested names (click to use):
                        <div className="flex flex-wrap gap-2 mt-1">
                            {details.names.map((name, index) => (
                                <button key={index} onClick={() => handleNameClick(name)} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs transition-colors">
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="product-description" className="block text-sm font-medium text-gray-700 mb-1">
                        Product Description (Body HTML)
                    </label>
                    <textarea
                        id="product-description"
                        rows={10}
                        value={editableDetails.description}
                        onChange={(e) => setEditableDetails({ ...editableDetails, description: e.target.value })}
                        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 mb-1">
                            Vendor
                        </label>
                        <input
                            type="text"
                            id="vendor"
                            value={vendor}
                            onChange={(e) => setVendor(e.target.value)}
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                     <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                            Price
                        </label>
                        <input
                            type="number"
                            id="price"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md bg-white min-h-[42px]">
                        {tags.map((tag) => (
                            <div key={tag} className="flex items-center bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-1 rounded-full">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 flex-shrink-0 text-indigo-400 hover:text-indigo-500">
                                    <svg className="h-3 w-3" stroke="currentColor" fill="none" viewBox="0 0 8 8"><path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                         <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            placeholder="Add a new tag"
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <button onClick={handleAddTag} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Add</button>
                    </div>
                </div>
                 <div>
                    <label htmlFor="seo-title" className="block text-sm font-medium text-gray-700 mb-1">
                        SEO Title
                    </label>
                    <input
                        type="text"
                        id="seo-title"
                        value={editableDetails.seoTitle}
                        onChange={(e) => setEditableDetails({ ...editableDetails, seoTitle: e.target.value })}
                        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="seo-description" className="block text-sm font-medium text-gray-700 mb-1">
                        SEO Description
                    </label>
                    <textarea
                        id="seo-description"
                        rows={3}
                        value={editableDetails.seoDescription}
                        onChange={(e) => setEditableDetails({ ...editableDetails, seoDescription: e.target.value })}
                        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
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
      
      {/* Social Media Section */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h3 className="text-2xl font-bold text-gray-800">Social Media Kit</h3>
                <p className="mt-1 text-gray-600">Download a ZIP file containing square and vertical images with a ready-to-use caption.</p>
            </div>
            <button
              onClick={handleSocialMediaDownload}
              className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all flex-shrink-0"
            >
              <DownloadIcon />
              Download Social Kit
            </button>
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {images.filter(img => img.category === 'social').map(image => (
                 <div key={image.id} className="aspect-w-1 aspect-h-1">
                     <img src={`data:image/png;base64,${image.base64}`} alt={image.title} className="w-full h-full object-cover rounded-md" />
                 </div>
             ))}
        </div>
      </div>
    </div>
  );
};