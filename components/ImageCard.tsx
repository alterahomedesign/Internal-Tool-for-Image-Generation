import React, { useState } from 'react';
import { GeneratedImage } from '../types';
import { EditIcon, RegenerateIcon } from './icons';

interface ImageCardProps {
  image: GeneratedImage;
  onEdit: (imageId: string, prompt: string) => Promise<void>;
  onRegenerate: (image: GeneratedImage, newPrompt?: string) => Promise<void>;
  isEditing: boolean;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, onEdit, onRegenerate, isEditing }) => {
  const [editPrompt, setEditPrompt] = useState('');

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editPrompt.trim()) {
      onEdit(image.id, editPrompt);
    }
  };

  const handleRegenerate = () => {
    onRegenerate(image, editPrompt);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 transition-shadow hover:shadow-xl flex flex-col">
      <div className="relative aspect-w-1 aspect-h-1">
        <img src={`data:image/png;base64,${image.base64}`} alt={image.title} className="w-full h-full object-cover" />
        {isEditing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h4 className="font-bold text-lg text-gray-800">{image.title}</h4>
        <p className="text-sm text-gray-600 mb-4 flex-grow">{image.description}</p>
        
        <form onSubmit={handleEdit} className="flex gap-2 items-center mt-auto">
          <input
            type="text"
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="e.g., 'Add a retro filter'"
            className="flex-grow block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={isEditing}
          />
          <button
            type="submit"
            disabled={!editPrompt.trim() || isEditing}
            className="p-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            aria-label="Edit Image"
            title="Edit Image"
          >
            <EditIcon />
          </button>
        </form>

        <button
          onClick={handleRegenerate}
          disabled={isEditing}
          className="mt-2 w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
          title={editPrompt.trim() ? "Regenerate image from source using the new prompt above" : "Regenerate image from source with original prompt"}
        >
          <RegenerateIcon />
          Regenerate
        </button>
      </div>
    </div>
  );
};
