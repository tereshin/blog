if (typeof CSS === 'undefined' || !CSS.escape) {
  Object.defineProperty(globalThis, 'CSS', {
    value: { escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&') },
    writable: true,
  });
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverStub,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
