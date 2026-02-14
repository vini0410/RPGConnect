// Importa matchers adicionais para o Jest/Vitest, como o .toBeInTheDocument()
import '@testing-library/jest-dom';

// Polyfills for JSDOM
if (typeof window !== 'undefined') {
  // Polyfill for PointerEvent which is not supported in JSDOM
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  // Polyfill for scrollIntoView which is not supported in JSDOM
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
}
