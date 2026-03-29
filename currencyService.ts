export const fetchCountries = async () => {
  const response = await fetch("https://restcountries.com/v3.1/all?fields=name,currencies,cca2");
  const data = await response.json();
  return data.map((c: any) => ({
    name: c.name.common,
    code: c.cca2,
    currency: Object.keys(c.currencies || {})[0] || "USD",
  })).sort((a: any, b: any) => a.name.localeCompare(b.name));
};

export const getExchangeRate = async (from: string, to: string) => {
  if (from === to) return 1;
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const data = await response.json();
    return data.rates[to] || 1;
  } catch (error) {
    console.error("Currency conversion error:", error);
    return 1;
  }
};
