import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom nemá ResizeObserver – potrebné pre Radix komponenty
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class implements ResizeObserver {
    constructor(_callback: ResizeObserverCallback) {}
    observe(_target: Element) {}
    unobserve(_target: Element) {}
    disconnect() {}
  };
}
