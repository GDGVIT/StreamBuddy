// Minimal in-memory stand-in for electron-store (get / set / clear)
export function createMemoryStore (initial = {}) {
  let data = structuredClone(initial)
  return {
    get: (key) => data[key],
    set: (key, value) => { data[key] = structuredClone(value) },
    clear: () => { data = {} },
    dump: () => structuredClone(data)
  }
}
