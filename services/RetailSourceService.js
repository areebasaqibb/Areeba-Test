/**
 * Returns a list of trusted local retailers based on the country.
 */
function getRetailersForCountry(country) {
  const c = (country || '').toLowerCase();
  
  if (c.includes('pakistan')) {
    return ['Al Fatah', 'Carrefour', 'Metro Pakistan', 'Chefiality', 'Naheed', 'Imtiaz', 'Foodpanda Shops', 'Pandamart'];
  } else if (c.includes('united states') || c === 'us' || c === 'usa') {
    return ['Walmart', 'Target', 'Whole Foods', 'Kroger', 'Safeway', 'Trader Joe\'s'];
  } else if (c.includes('united kingdom') || c === 'uk') {
    return ['Tesco', 'Sainsbury\'s', 'Asda', 'Morrisons', 'Waitrose'];
  } else if (c.includes('canada')) {
    return ['Loblaws', 'Metro', 'Sobeys', 'Walmart Canada', 'Costco'];
  } else if (c.includes('australia')) {
    return ['Woolworths', 'Coles', 'Aldi', 'IGA'];
  } else if (c.includes('india')) {
    return ['BigBasket', 'Blinkit', 'JioMart', 'Zepto', 'Instamart'];
  } else if (c.includes('emirates') || c === 'uae') {
    return ['Carrefour UAE', 'Lulu Hypermarket', 'Spinneys', 'Choithrams', 'Kibsons'];
  }
  
  // Generic Fallback
  return ['Local Supermarket 1', 'Local Supermarket 2', 'Online Grocery Store'];
}

module.exports = {
  getRetailersForCountry
};
