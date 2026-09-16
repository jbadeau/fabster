import { render } from '@testing-library/react';

import { TRPCProvider } from '../lib/trpc-provider';
import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <TRPCProvider>
        <App />
      </TRPCProvider>,
    );
    expect(baseElement).toBeTruthy();
  });
});
