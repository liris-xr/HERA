const SPECIAL_LETTERS = {
  "\u00e6": "ae",
  "\u00c6": "ae",
  "\u0153": "oe",
  "\u0152": "oe",
};

export function normalizeSearchText(value) {
  return String(value ?? "")
    .replace(/[\u00e6\u00c6\u0153\u0152]/g, (letter) => SPECIAL_LETTERS[letter])
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function includesSearchText(value, query) {
  const normalizedQuery = normalizeSearchText(query).trim();

  if (!normalizedQuery) {
    return true;
  }

  return normalizeSearchText(value).includes(normalizedQuery);
}
