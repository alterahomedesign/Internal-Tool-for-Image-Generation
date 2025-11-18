import React, { useCallback, useState } from 'react';
import { UploadIcon, GenerateIcon, PlusIcon } from './icons';

interface ImageUploaderProps {
  sourceImages: File[];
  setSourceImages: (files: File[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  sourceImages,
  setSourceImages,
  onGenerate,
  isGenerating,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files) {
      // De-duplication logic: ensures the exact same file isn't added twice.
      const newFiles = Array.from(files).filter(newFile => 
        !sourceImages.some(existingFile => 
            existingFile.name === newFile.name && 
            existingFile.size === newFile.size &&
            existingFile.lastModified === newFile.lastModified
        )
      );
      if (newFiles.length > 0) {
        setSourceImages([...sourceImages, ...newFiles]);
      }
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
  }, [sourceImages]);

  const handleRemoveImage = (index: number) => {
      setSourceImages(sourceImages.filter((_, i) => i !== index));
  }

  return (
    <div className="w-full space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
        <h3 className="font-semibold text-lg mb-1">1. Upload Source Images</h3>
        <p className="text-sm text-gray-500 mb-4">The first image should be the spec sheet. Add others for context (textures, angles).</p>
        
        <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center w-full flex-grow border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
            onDragEnter={onDragEnter}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {sourceImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center min-h-[200px]">
                    <UploadIcon />
                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag & drop</p>
                    <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
                </div>
            ) : (
                <div className="p-4 w-full">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {sourceImages.map((file, index) => (
                            <div key={`${file.name}-${file.lastModified}`} className="relative group aspect-w-1 aspect-h-1 bg-gray-100 rounded-lg overflow-hidden border">
                            <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center">
                                <button
                                    onClick={(e) => { e.preventDefault(); handleRemoveImage(index); }}
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                    aria-label="Remove image"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            {index === 0 && (
                                <span className="absolute bottom-0 left-0 right-0 bg-indigo-600 text-white text-xs font-bold text-center py-0.5">Spec Sheet</span>
                            )}
                            </div>
                        ))}

                        <div className="flex flex-col items-center justify-center w-full aspect-w-1 aspect-h-1 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-indigo-400">
                            <PlusIcon />
                            <span className="mt-2 text-xs text-gray-500 text-center">Add more</span>
                        </div>
                    </div>
                </div>
            )}
             <input
              id="file-upload"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              multiple
              onChange={(e) => handleFileChange(e.target.files)}
            />
        </label>
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={onGenerate}
          disabled={sourceImages.length === 0 || isGenerating}
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
              Generate All Variations
            </>
          )}
        </button>
      </div>
    </div>
  );
};