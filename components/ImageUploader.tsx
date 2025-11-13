import React, { useCallback, useState } from 'react';
import { UploadIcon, GenerateIcon } from './icons';
import { CreativeStyle } from '../types';

interface ImageUploaderProps {
  uploadedFiles: File[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onGenerate: () => void;
  isGenerating: boolean;
  creativeStyle: CreativeStyle;
  setCreativeStyle: React.Dispatch<React.SetStateAction<CreativeStyle>>;
}

const styleOptions: { id: CreativeStyle; name: string; description: string }[] = [
    { id: 'modern_suburban', name: 'Modern Suburban', description: 'Clean, upscale, and versatile.' },
    { id: 'scandinavian', name: 'Bright & Airy Scandinavian', description: 'Minimalist, light-filled, with natural woods.' },
    { id: 'moody_luxurious', name: 'Moody & Luxurious', description: 'Dramatic, sophisticated, with rich textures.' },
    { id: 'warm_rustic', name: 'Warm & Rustic', description: 'Cozy and inviting with brick and warm woods.' },
    { id: 'industrial_loft', name: 'Industrial Loft', description: 'Urban, edgy, with brick, metal, and concrete.' },
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  uploadedFiles,
  setUploadedFiles,
  onGenerate,
  isGenerating,
  creativeStyle,
  setCreativeStyle,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files) {
      setUploadedFiles(Array.from(files));
    }
  };

  const onDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  }, []);

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
          onDragEnter={onDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <UploadIcon />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG, or WEBP (max. 10MB)</p>
          </div>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files)}
          />
        </label>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
           <h3 className="font-semibold text-lg mb-4">Uploaded Images</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`preview ${index}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                 <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
       <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <label htmlFor="creative-style" className="block text-lg font-semibold text-gray-800 mb-2">
                Choose a Creative Style
            </label>
            <p className="text-sm text-gray-600 mb-4">Select an art direction for the photoshoot. This will influence the environments, lighting, and overall mood of the lifestyle images.</p>
            <select
                id="creative-style"
                value={creativeStyle}
                onChange={(e) => setCreativeStyle(e.target.value as CreativeStyle)}
                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                {styleOptions.map(option => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
             <p className="text-xs text-gray-500 mt-2">
                {styleOptions.find(opt => opt.id === creativeStyle)?.description}
            </p>
        </div>


      <div className="flex justify-center">
        <button
          onClick={onGenerate}
          disabled={uploadedFiles.length === 0 || isGenerating}
          className="flex items-center justify-center w-full max-w-xs px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <GenerateIcon />
              Generate Photoshoot
            </>
          )}
        </button>
      </div>
    </div>
  );
};