/**
 * Service to map countries to their native currency and measurement system.
 */

const COUNTRY_CURRENCY_MAP = {
  'Pakistan': { currency: 'PKR', symbol: '₨', system: 'Metric' },
  'United States': { currency: 'USD', symbol: '$', system: 'Imperial' },
  'United Kingdom': { currency: 'GBP', symbol: '£', system: 'Metric' },
  'Canada': { currency: 'CAD', symbol: 'C$', system: 'Metric' },
  'Australia': { currency: 'AUD', symbol: 'A$', system: 'Metric' },
  'India': { currency: 'INR', symbol: '₹', system: 'Metric' },
  'United Arab Emirates': { currency: 'AED', symbol: 'د.إ', system: 'Metric' },
  'Saudi Arabia': { currency: 'SAR', symbol: '﷼', system: 'Metric' },
};

function getDefaultBusinessSettings(country) {
  const match = Object.keys(COUNTRY_CURRENCY_MAP).find(c => 
    c.toLowerCase() === (country || '').toLowerCase()
  );

  if (match) {
    return COUNTRY_CURRENCY_MAP[match];
  }

  // Fallback default
  return { currency: 'USD', symbol: '$', system: 'Metric' };
}

module.exports = {
  getDefaultBusinessSettings
};
