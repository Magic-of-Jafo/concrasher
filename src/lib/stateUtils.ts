// Map of state abbreviations to full names
export const stateAbbreviations: { [key: string]: string } = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

// Map of full state names to abbreviations
export const stateNames: { [key: string]: string } = Object.entries(stateAbbreviations).reduce(
  (acc, [abbr, name]) => ({ ...acc, [name.toLowerCase()]: abbr }),
  {}
);

// Function to get both abbreviation and full name for a state
export function getStateVariations(state: string): string[] {
  const normalizedState = state.toLowerCase().trim();
  const variations: string[] = [state]; // Include original input

  // If input is an abbreviation, add the full name
  if (stateAbbreviations[state.toUpperCase()]) {
    variations.push(stateAbbreviations[state.toUpperCase()]);
  }

  // If input is a full name, add the abbreviation
  if (stateNames[normalizedState]) {
    variations.push(stateNames[normalizedState]);
  }

  return variations;
} 