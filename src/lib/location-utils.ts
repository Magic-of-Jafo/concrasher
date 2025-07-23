interface ConventionLocation {
  city?: string | null;
  stateAbbreviation?: string | null;
  stateName?: string | null;
  country?: string | null;
}

/**
 * Formats convention location for consistent display across the application
 * Handles cases where some location fields might be missing
 */
export function formatConventionLocation(location: ConventionLocation): string {
  const locationParts = [];
  
  if (location.city) {
    locationParts.push(location.city);
  }
  
  // Prefer state abbreviation over state name, but fall back to state name if abbreviation is missing
  if (location.stateAbbreviation) {
    locationParts.push(location.stateAbbreviation);
  } else if (location.stateName) {
    locationParts.push(location.stateName);
  }
  
  if (location.country) {
    locationParts.push(location.country);
  }
  
  return locationParts.length > 0 ? locationParts.join(', ') : 'TBD';
}

/**
 * Formats location for display in convention grids and lists
 * Optimized for US locations (shows city, state) vs international (shows city, country)
 */
export function formatLocationForGrid(location: ConventionLocation): string {
  const city = location.city || '';
  const state = location.stateAbbreviation || location.stateName || '';
  const country = location.country || '';
  
  // For US locations, show "City, State"
  if (country === 'United States' || country === 'USA' || country === 'US') {
    return state ? `${city}, ${state}` : city;
  }
  
  // For international locations, show "City, Country"
  return country ? `${city}, ${country}` : city;
} 