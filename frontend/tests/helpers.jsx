import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import auth from '../src/redux/slices/authSlice';
import state from '../src/redux/slices/stateSlice';
import task from '../src/redux/slices/taskSlice';

export function makeStore(preloadedState = {}) {
  return configureStore({ reducer: { auth, state, task }, preloadedState });
}
export function renderWithStore(ui, preloadedState = {}, path = '/') {
  const store = makeStore(preloadedState);
  return {
    ...render(<Provider store={store}><MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter></Provider>),
    store,
  };
}
export function wrapperFor(store) {
  return function Wrapper({ children }) { return <Provider store={store}>{children}</Provider>; };
}
