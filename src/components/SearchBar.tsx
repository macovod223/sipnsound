import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useSettings } from './SettingsContext';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function SearchBar({ value, onChange, onFocus, onBlur }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { t } = useSettings();

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="relative">
      <div 
        className="glass-card rounded-2xl sm:rounded-3xl px-4 sm:px-5 py-3 sm:py-3.5 flex items-center gap-2.5 sm:gap-3 fast-transition gpu-accelerated"
        style={(isFocused || value) ? {
          borderColor: 'rgba(255, 255, 255, 0.5)',
          background: 'rgba(40, 40, 40, 0.8)'
        } : {}}
      >
        <Search 
          className="w-4.5 h-4.5 sm:w-5 sm:h-5 fast-transition" 
          style={(isFocused || value) ? { 
            color: '#ffffff',
            opacity: 1
          } : {
            color: '#b3b3b3',
            opacity: 0.7
          }}
        />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={value}
          className="flex-1 bg-transparent outline-none placeholder:opacity-40 text-sm sm:text-base"
          style={{ color: '#ffffff' }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-white/10 instant-transition"
            style={{ color: '#b3b3b3' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
