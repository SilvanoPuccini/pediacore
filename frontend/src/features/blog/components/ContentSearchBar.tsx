import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface ContentSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function ContentSearchBar({
  value,
  onChange,
  placeholder = "Buscar...",
}: ContentSearchBarProps) {
  // Local state for immediate input display
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state if parent resets value (e.g. clear from outside)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setLocalValue(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(next);
    }, 300);
  }

  function handleClear() {
    setLocalValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange("");
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        {/* Magnifying glass icon */}
        <span className="absolute left-4 flex items-center pointer-events-none text-ink3">
          <Search size={16} />
        </span>

        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-10 pr-10 py-3 rounded-full border border-line bg-surface text-[14px] text-ink placeholder:text-ink3 transition focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal"
          style={{ boxShadow: "var(--shadow-card)" }}
        />

        {/* Clear button */}
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpiar búsqueda"
            className="absolute right-3.5 flex items-center justify-center w-6 h-6 rounded-full text-ink3 hover:text-ink hover:bg-line/50 transition"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
