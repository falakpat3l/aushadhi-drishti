// Loads the small JSON files that the data build writes to public/data/.
const base = `${import.meta.env.BASE_URL}data/`;
const cache = new Map();

export async function loadJSON(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(base + path).then((r) => {
        if (!r.ok) throw new Error(`Could not load ${path} (${r.status})`);
        return r.json();
      }),
    );
  }
  return cache.get(path);
}

export const dataUrl = (path) => base + path;
