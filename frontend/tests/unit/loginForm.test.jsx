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

test('FE-LOGIN-01 requires login fields before any request', () => {
  form(); fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  expect(toast.error).toHaveBeenCalledWith('All fields are required'); expect(fetch).not.toHaveBeenCalled();
});
test('FE-LOGIN-02 rejects an invalid login email locally', () => {
  form(); fillLogin('invalid'); fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  expect(toast.error).toHaveBeenCalledWith('Invalid email format'); expect(fetch).not.toHaveBeenCalled();
});
test('FE-LOGIN-03 stores the token, updates auth state and navigates after login', async () => {
  const profile = { _id: 'u1', email: 'qa@example.com' }, { store } = form();
  resolve({ token: 'synthetic-token', data: profile, message: 'Login Successfully' });
  fillLogin(); fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await waitFor(() => expect(screen.getByText('Authenticated home')).toBeTruthy());
  expect(localStorage.getItem('token')).toBe('synthetic-token'); expect(store.getState().auth).toEqual(profile);
  expect(fetch).toHaveBeenCalledWith('https://unit-test.invalid/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'qa@example.com', password: 'Test123!' }) });
  expect(toast.success).toHaveBeenCalledWith('Login Successfully');
});
test('FE-LOGIN-04 keeps the user logged out when the service rejects credentials', async () => {
  const { store } = form(); resolve({ message: 'Incorrect Password' }); fillLogin();
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Incorrect Password'));
  expect(store.getState().auth).toBeNull(); expect(localStorage.getItem('token')).toBeNull();
  expect(screen.getByRole('button', { name: 'Login' }).disabled).toBe(false);
});
test('FE-LOGIN-05 restores login controls after a network failure', async () => {
  form(); fetch.mockRejectedValue(new Error('offline')); fillLogin();
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong'));
  expect(screen.getByRole('button', { name: 'Login' }).disabled).toBe(false); expect(toast.dismiss).toHaveBeenCalled();
});
test('FE-REGISTER-01 requires registration fields before a request', () => {
  form(); fireEvent.click(screen.getByRole('button', { name: 'Register' })); submitRegistration();
  expect(toast.error).toHaveBeenCalledWith('All fields are required'); expect(fetch).not.toHaveBeenCalled();
});
test('FE-REGISTER-02 rejects nonmatching passwords before a request', () => {
  form(); fillRegistration('Different123!'); submitRegistration();
  expect(toast.error).toHaveBeenCalledWith("Passwords don't match"); expect(fetch).not.toHaveBeenCalled();
});
test('FE-REGISTER-03 rejects invalid registration input before a request', () => {
  form(); fillRegistration(); fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'invalid' } }); submitRegistration();
  expect(toast.error).toHaveBeenCalledWith('Invalid email format'); expect(fetch).not.toHaveBeenCalled();
});
test('FE-REGISTER-04 returns to login and clears passwords after successful registration', async () => {
  form(); resolve({ token: 'registration-token', message: 'Registration Successfully' }); fillRegistration(); submitRegistration();
  await waitFor(() => expect(screen.queryByPlaceholderText('Confirm Password')).toBeNull());
  expect(screen.getByPlaceholderText('Password').value).toBe('');
  expect(fetch.mock.calls[0][0]).toBe('https://unit-test.invalid/api/auth/register');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ name: 'Luis', email: 'qa@example.com', password: 'Test123!' });
  expect(localStorage.getItem('token')).toBeNull();
});
test('FE-REGISTER-05 displays a registration error and keeps the form available', async () => {
  form(); resolve({ message: 'User Already Exist' }); fillRegistration(); submitRegistration();
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('User Already Exist'));
  expect(screen.getByPlaceholderText('Confirm Password')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Register' })[0].disabled).toBe(false);
});
test('FE-REGISTER-06 restores registration controls after a network failure', async () => {
  form(); fetch.mockRejectedValue(new Error('offline')); fillRegistration(); submitRegistration();
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong'));
  expect(screen.getAllByRole('button', { name: 'Register' })[0].disabled).toBe(false);
});
