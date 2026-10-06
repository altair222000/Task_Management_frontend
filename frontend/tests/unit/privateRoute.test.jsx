import React from 'react';
import { expect, test } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import PrivateRoute from '../../src/components/PrivateRoute';
import { renderWithStore } from '../helpers';

function routes() {
  return <Routes><Route path="/private" element={<PrivateRoute><p>Protected content</p></PrivateRoute>} /><Route path="/login" element={<p>Login page</p>} /></Routes>;
}
test('FE-ACCESS-01 redirects a visitor without authentication to login', () => {
  renderWithStore(routes(), { auth: null }, '/private');
  expect(screen.getByText('Login page')).toBeTruthy();
  expect(screen.queryByText('Protected content')).toBeNull();
});
test('FE-ACCESS-02 renders the private content for an authenticated user', () => {
  renderWithStore(routes(), { auth: { _id: 'u1' } }, '/private');
  expect(screen.getByText('Protected content')).toBeTruthy();
  expect(screen.queryByText('Login page')).toBeNull();
});
