export interface CountryCode {
  value: string;
  label: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { value: '+91', label: 'India (+91)' },
  { value: '+1', label: 'United States / Canada (+1)' },
  { value: '+44', label: 'United Kingdom (+44)' },
  { value: '+971', label: 'UAE (+971)' },
  { value: '+61', label: 'Australia (+61)' },
  { value: '+49', label: 'Germany (+49)' },
  { value: '+33', label: 'France (+33)' },
  { value: '+353', label: 'Ireland (+353)' },
  { value: '+65', label: 'Singapore (+65)' },
  { value: '+81', label: 'Japan (+81)' },
  { value: '+86', label: 'China (+86)' },
  { value: '+234', label: 'Nigeria (+234)' },
  { value: '+27', label: 'South Africa (+27)' },
  { value: '+55', label: 'Brazil (+55)' },
  { value: '+62', label: 'Indonesia (+62)' },
  { value: '+63', label: 'Philippines (+63)' },
  { value: '+66', label: 'Thailand (+66)' },
  { value: '+92', label: 'Pakistan (+92)' },
  { value: '+880', label: 'Bangladesh (+880)' },
  { value: '+966', label: 'Saudi Arabia (+966)' },
];

export const buildPhoneTarget = (countryCode: string, phone: string): string => {
  const digits = phone.replace(/[^0-9]/g, '');
  return `${countryCode}${digits}`;
};