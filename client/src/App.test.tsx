import { render, screen } from '@testing-library/react';
import App from './App'; // Assumindo que App.tsx está na mesma pasta ou o import está correto
import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('renders the auth page on initial load', async () => {
    // Renderiza o componente
    render(<App />);

    // Procura pelo título da página de autenticação
    const headingElement = await screen.findByText(/Welcome Back/i);

    // Verifica se o elemento foi encontrado no documento
    expect(headingElement).toBeInTheDocument();
  });
});
