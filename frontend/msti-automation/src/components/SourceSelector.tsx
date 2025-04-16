import React, { useState } from 'react';

interface Source {
  id: string;
  name: string;
}

const sources: Source[] = [
  { id: 'leaf-1', name: 'LEAF-1' },
  { id: 'leaf-2', name: 'LEAF-2' },
  { id: 'spine', name: 'SPINE' },
];

interface SourceSelectorProps {
  onSourceChange: (source: Source) => void;
}

const SourceSelector: React.FC<SourceSelectorProps> = ({ onSourceChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source>(sources[0]);

  const handleSourceSelect = (source: Source) => {
    setSelectedSource(source);
    onSourceChange(source);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Source</span>
          <span className="text-sm text-gray-700">{selectedSource.name}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1 max-h-48 overflow-y-auto">
            {sources.map((source) => (
              <button
                key={source.id}
                onClick={() => handleSourceSelect(source)}
                className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                  selectedSource.id === source.id ? 'bg-gray-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                {source.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SourceSelector; 