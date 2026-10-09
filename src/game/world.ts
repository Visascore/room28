import lagos from "@/assets/city-lagos.jpg";
import abuja from "@/assets/city-abuja.jpg";
import london from "@/assets/city-london.jpg";
import manchester from "@/assets/city-manchester.jpg";
import toronto from "@/assets/city-toronto.jpg";
import newyork from "@/assets/city-newyork.jpg";
import dubai from "@/assets/city-dubai.jpg";

// `facts` = general real-world information. `sim` = GAME SIMULATION values (not real statistics).
export interface Country {
  id: string; name: string; flag: string;
  facts: { currency: string; language: string; capital: string; climate: string };
  sim: { symbol: string; fx: number; inflation: number; minWage: number; workAge: number; pensionAge: number; taxRate: number; salaryIndex: number; costIndex: number; opportunity: number; migration: string; healthcare: string; tax: string };
  lat: number; lon: number;
}
export interface City {
  id: string; name: string; country: string; image: string;
  neighbourhood: string; transport: string; weather: string; vibe: string; opportunities: string;
}

export const COUNTRIES: Record<string, Country> = {
  ng: { id: "ng", name: "Nigeria", flag: "🇳🇬", lat: 9, lon: 8,
    facts: { currency: "Nigerian Naira", language: "English (official)", capital: "Abuja", climate: "Tropical" },
    sim: { symbol: "₦", taxRate: 0.12, fx: 2000, inflation: 0.06, minWage: 840000, workAge: 15, pensionAge: 60, salaryIndex: 0.07, costIndex: 0.12, opportunity: 0.9, migration: "Citizen", healthcare: "Mixed public/private (simulated)", tax: "Low (simulated)" } },
  uk: { id: "uk", name: "United Kingdom", flag: "🇬🇧", lat: 54, lon: -2,
    facts: { currency: "Pound Sterling", language: "English", capital: "London", climate: "Temperate maritime" },
    sim: { symbol: "£", taxRate: 0.24, fx: 1, inflation: 0.01, minWage: 23800, workAge: 16, pensionAge: 66, salaryIndex: 1, costIndex: 1, opportunity: 1, migration: "Skilled worker / student visa (simulated)", healthcare: "Public NHS", tax: "Moderate (simulated)" } },
  ca: { id: "ca", name: "Canada", flag: "🇨🇦", lat: 56, lon: -100,
    facts: { currency: "Canadian Dollar", language: "English, French", capital: "Ottawa", climate: "Continental, cold winters" },
    sim: { symbol: "C$", taxRate: 0.26, fx: 1.85, inflation: 0.01, minWage: 36000, workAge: 16, pensionAge: 65, salaryIndex: 1.0, costIndex: 0.95, opportunity: 1.05, migration: "Points-based residency (simulated)", healthcare: "Public", tax: "Moderate (simulated)" } },
  us: { id: "us", name: "United States", flag: "🇺🇸", lat: 39, lon: -98,
    facts: { currency: "US Dollar", language: "English", capital: "Washington, D.C.", climate: "Varied" },
    sim: { symbol: "$", taxRate: 0.25, fx: 1.33, inflation: 0.01, minWage: 15080, workAge: 16, pensionAge: 67, salaryIndex: 1.3, costIndex: 1.2, opportunity: 1.2, migration: "Work visa lottery / sponsorship (simulated)", healthcare: "Mostly private insurance", tax: "Moderate (simulated)" } },
  ae: { id: "ae", name: "United Arab Emirates", flag: "🇦🇪", lat: 24, lon: 54,
    facts: { currency: "UAE Dirham", language: "Arabic (English widely used)", capital: "Abu Dhabi", climate: "Hot desert" },
    sim: { symbol: "AED ", taxRate: 0, fx: 4.9, inflation: 0.01, minWage: 36000, workAge: 18, pensionAge: 65, salaryIndex: 1.0, costIndex: 1.0, opportunity: 1.1, migration: "Employer-sponsored residency (simulated)", healthcare: "Employer insurance", tax: "Very low income tax (simulated)" } },
};

export const CITIES: Record<string, City> = {
  lagos: { id: "lagos", name: "Lagos", country: "ng", image: lagos, neighbourhood: "Yaba to Lekki", transport: "Danfo buses, ferries, traffic", weather: "Hot and humid", vibe: "Relentless, loud, full of hustle", opportunities: "Tech, trade, music, finance" },
  abuja: { id: "abuja", name: "Abuja", country: "ng", image: abuja, neighbourhood: "Wuse and Garki", transport: "Wide roads, cars", weather: "Warm, rainy season", vibe: "Planned, calmer, political", opportunities: "Government, law, consulting" },
  london: { id: "london", name: "London", country: "uk", image: london, neighbourhood: "Peckham to Hackney", transport: "Tube, buses, bikes", weather: "Grey, mild, rain", vibe: "Ambitious, expensive, endless", opportunities: "Finance, law, creative, tech" },
  manchester: { id: "manchester", name: "Manchester", country: "uk", image: manchester, neighbourhood: "Ancoats and Didsbury", transport: "Trams, buses", weather: "Rainy", vibe: "Warm, gritty, musical", opportunities: "Media, engineering, music" },
  toronto: { id: "toronto", name: "Toronto", country: "ca", image: toronto, neighbourhood: "Scarborough to Queen West", transport: "Subway, streetcars", weather: "Snowy winters, hot summers", vibe: "Diverse, polite, cold", opportunities: "Tech, healthcare, finance" },
  newyork: { id: "newyork", name: "New York", country: "us", image: newyork, neighbourhood: "Brooklyn and Harlem", transport: "Subway, cabs, walking", weather: "Four hard seasons", vibe: "Fast, brutal, electric", opportunities: "Finance, art, media, law" },
  dubai: { id: "dubai", name: "Dubai", country: "ae", image: dubai, neighbourhood: "Deira to Marina", transport: "Metro, cars", weather: "Very hot", vibe: "Glossy, transient, tax-light", opportunities: "Trade, hospitality, finance, property" },
};

export const cityCountry = (cityId: string) => COUNTRIES[CITIES[cityId].country];
// Life-event prices in content are written at UK price levels; this converts them to the local economy.
export const moneyScale = (cityId: string) => cityCountry(cityId).sim.costIndex;

export interface Career { id: string; name: string; base: number; minEdu: number; satisfaction: number; stress: number }
// base = annual salary in GBP-equivalent GAME units, scaled by country salaryIndex.
export const CAREERS: Record<string, Career> = {
  teacher: { id: "teacher", name: "Teacher", base: 32000, minEdu: 55, satisfaction: 70, stress: 55 },
  doctor: { id: "doctor", name: "Doctor", base: 70000, minEdu: 85, satisfaction: 75, stress: 75 },
  developer: { id: "developer", name: "Software developer", base: 55000, minEdu: 50, satisfaction: 65, stress: 50 },
  lawyer: { id: "lawyer", name: "Lawyer", base: 65000, minEdu: 80, satisfaction: 55, stress: 75 },
  entrepreneur: { id: "entrepreneur", name: "Entrepreneur", base: 30000, minEdu: 0, satisfaction: 75, stress: 80 },
  artist: { id: "artist", name: "Artist", base: 20000, minEdu: 0, satisfaction: 85, stress: 45 },
  musician: { id: "musician", name: "Musician", base: 18000, minEdu: 0, satisfaction: 85, stress: 50 },
  construction: { id: "construction", name: "Construction worker", base: 30000, minEdu: 0, satisfaction: 55, stress: 50 },
  retail: { id: "retail", name: "Retail worker", base: 21000, minEdu: 0, satisfaction: 40, stress: 45 },
  finance: { id: "finance", name: "Finance professional", base: 75000, minEdu: 70, satisfaction: 50, stress: 80 },
  driver: { id: "driver", name: "Driver", base: 25000, minEdu: 0, satisfaction: 45, stress: 40 },
  engineer: { id: "engineer", name: "Engineer", base: 52000, minEdu: 70, satisfaction: 65, stress: 55 },
  nurse: { id: "nurse", name: "Nurse", base: 34000, minEdu: 60, satisfaction: 70, stress: 70 },
  chef: { id: "chef", name: "Chef", base: 26000, minEdu: 0, satisfaction: 65, stress: 70 },
};

export interface Housing { id: string; name: string; cost: number; happiness: number; privacy: number }
// cost = annual GBP-equivalent game units, scaled by country costIndex
export const HOUSING: Record<string, Housing> = {
  family: { id: "family", name: "Family home", cost: 0, happiness: 0, privacy: 20 },
  shared: { id: "shared", name: "Shared room", cost: 7200, happiness: -4, privacy: 20 },
  studio: { id: "studio", name: "Studio", cost: 12000, happiness: 2, privacy: 60 },
  flat: { id: "flat", name: "Flat with partner", cost: 15000, happiness: 5, privacy: 70 },
  house: { id: "house", name: "House", cost: 20000, happiness: 8, privacy: 85 },
  luxury: { id: "luxury", name: "Luxury apartment", cost: 40000, happiness: 10, privacy: 90 },
};

export const FAMILY_TIERS: { id: import("./types").FamilyTier; name: string; cash: number; edu: number }[] = [
  { id: "low", name: "Low-income household", cash: 0, edu: -10 },
  { id: "lowermiddle", name: "Lower-middle income", cash: 1500, edu: -4 },
  { id: "middle", name: "Middle-income", cash: 5000, edu: 0 },
  { id: "uppermiddle", name: "Upper-middle income", cash: 15000, edu: 6 },
  { id: "wealthy", name: "Wealthy", cash: 60000, edu: 10 },
  { id: "ultra", name: "Extremely wealthy", cash: 400000, edu: 12 },
];

export const NAMES: Record<string, { first: string[]; last: string[] }> = {
  ng: { first: ["Tolu", "Chidi", "Amara", "Emeka", "Zainab", "Ife", "Kelechi", "Ada", "Femi", "Ngozi"], last: ["Adeyemi", "Okafor", "Bello", "Nwosu", "Balogun", "Eze"] },
  uk: { first: ["Oliver", "Amelia", "Jack", "Isla", "Priya", "Kwame", "Grace", "Leo", "Maya", "Sam"], last: ["Walker", "Patel", "Evans", "Mensah", "Clarke", "Hughes"] },
  ca: { first: ["Liam", "Chloé", "Noah", "Aisha", "Ethan", "Mei", "Lucas", "Sofia"], last: ["Tremblay", "Singh", "Martin", "Nguyen", "Roy", "Campbell"] },
  us: { first: ["Jordan", "Ava", "Marcus", "Elena", "Tyler", "Jasmine", "Diego", "Hannah"], last: ["Johnson", "Rivera", "Kim", "Brooks", "Lee", "Carter"] },
  ae: { first: ["Omar", "Layla", "Rashid", "Noor", "Arjun", "Fatima", "Yusuf", "Sara"], last: ["Al Mansoori", "Khan", "Haddad", "Nair", "Al Falasi", "Rahman"] },
};
