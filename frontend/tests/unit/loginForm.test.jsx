import React from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { toast } from 'react-toastify';
import RegisterLogin from '../../src/pages/Register_Login';
import { renderWithStore } from '../helpers';
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn(), loading: vi.fn(), dismiss: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
function form() {
  return renderWithStore(<Routes><Route path="/login" element={<RegisterLogin />} /><Route path="/" element={<p>Authenticated home</p>} /></Routes>, {}, '/login');
}
function fillLogin(email = 'qa@example.com', password = 'Test123!') {
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: password } });
}
function fillRegistration(confirm = 'Test123!') {
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
  fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'luis' } });
  fillLogin();
  fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: confirm } });
}
function submitRegistration() { fireEvent.click(screen.getAllByRole('button', { name: 'Register' })[0]); }
function resolve(json) { fetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(json) }); }

test('FE-LOGIN-03 stores the token, updates auth state and navigates after login', async () => {
  const profile = { _id: 'u1', email: 'qa@example.com' }, { store } = form();
  resolve({ token: 'synthetic-token', data: profile, message: 'Login Successfully' });
  fillLogin(); fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await waitFor(() => expect(screen.getByText('Authenticated home')).toBeTruthy());
  expect(localStorage.getItem('token')).toBe('synthetic-token'); expect(store.getState().auth).toEqual(profile);
  expect(fetch).toHaveBeenCalledWith('https://unit-test.invalid/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'qa@example.com', password: 'Test123!' }) });
  expect(toast.success).toHaveBeenCalledWith('Login Successfully');
});

