import React from 'react';
import { XCircle } from 'lucide-react';

interface ErrorBoxProps {
  error: string;
  onRetry?: () => void;
}

const ErrorBox: React.FC<ErrorBoxProps> = ({ error, onRetry }) => (
  <div className="bg-red-900/30 border border-red-800 text-red-100 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
    <div className="flex justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        <XCircle size={20} />
        <span>{error}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-sm px-3 py-1 bg-red-900/50 rounded hover:bg-red-800 transition">
          Retry
        </button>
      )}
    </div>
  </div>
);

export default ErrorBox;