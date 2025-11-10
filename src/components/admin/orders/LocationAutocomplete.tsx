import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: { name: string; coordinates: [number, number] }) => void;
  placeholder?: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  mapbox_id: string;
}

export const LocationAutocomplete = ({ value, onChange, onLocationSelect, placeholder }: LocationAutocompleteProps) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/mapbox-geocoding`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: searchQuery }),
        }
      );
      const data = await response.json();
      setSuggestions(data.features || []);
      setIsOpen(true);
    } catch (error) {
      console.error("Erro ao buscar endereços:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    setQuery(newValue);
    onChange(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 300);
  };

  const handleSelectSuggestion = async (placeName: string, mapboxId: string) => {
    setQuery(placeName);
    onChange(placeName);
    setSuggestions([]);
    setIsOpen(false);

    // Retrieve full details including coordinates
    if (onLocationSelect && mapboxId) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(
          `${supabaseUrl}/functions/v1/mapbox-geocoding`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mapbox_id: mapboxId }),
          }
        );
        const data = await response.json();
        
        if (data.features?.[0]?.geometry?.coordinates) {
          const [longitude, latitude] = data.features[0].geometry.coordinates;
          onLocationSelect({
            name: placeName,
            coordinates: [longitude, latitude]
          });
        }
      } catch (error) {
        console.error("Erro ao buscar coordenadas:", error);
      }
    }
  };

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
      />
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1">
          <Command className="rounded-lg border shadow-md bg-background">
            <CommandList>
              {isLoading ? (
                <CommandEmpty>Buscando endereços...</CommandEmpty>
              ) : (
                <CommandGroup>
                  {suggestions.map((feature) => (
                    <CommandItem
                      key={feature.id}
                      value={feature.place_name}
                      onSelect={() => handleSelectSuggestion(feature.place_name, feature.mapbox_id)}
                    >
                      {feature.place_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};
