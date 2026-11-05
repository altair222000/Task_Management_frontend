import React from 'react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import authReducer from '../../src/redux/slices/authSlice';
import Register_Login from '../../src/pages/Register_Login';
import { toast } from 'react-toastify';

vi.mock('react-toastify', () => ({
  toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

const renderAuth = () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Register_Login />} />
          <Route path="/" element={<span>Tablero visible</span>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...result };
};
const type = (placeholder, value) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
const reply = value => Promise.resolve({ json: () => Promise.resolve(value) });
const registerMode = () => fireEvent.click(screen.getByRole('button', { name: 'Register' }));

// Revisa el acceso y las respuestas de los formularios.
describe('Formulario de acceso', () => {
  beforeEach(() => vi.clearAllMocks());

  test('no envía un inicio de sesión vacío', () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(toast.error).toHaveBeenCalledWith('All fields are required');
  });

  test('rechaza un correo de inicio de sesión inválido', () => {
    renderAuth();
    type('Email', 'incorrecto');
    type('Password', 'Prueba123!');
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(toast.error).toHaveBeenCalledWith('Invalid email format');
  });

  test('el inicio de sesión válido almacena el token', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({
      message: 'Login Successfully', token: 'token-prueba', data: { email: 'qa@example.com' },
    })));
    const { store } = renderAuth();
    type('Email', 'qa@example.com');
    type('Password', 'Prueba123!');
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await vi.waitFor(() => expect(screen.getByText('Tablero visible')).toBeTruthy());
    expect(localStorage.getItem('token')).toBe('token-prueba');
    expect(store.getState().auth.email).toBe('qa@example.com');
  });

  test('el inicio de sesión muestra rechazos del backend', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'Incorrect Password' })));
    renderAuth();
    type('Email', 'qa@example.com');
    type('Password', 'Prueba123!');
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Incorrect Password'));
  });

  test('el inicio de sesión maneja fallos de red', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Sin red'))));
    renderAuth();
    type('Email', 'qa@example.com');
    type('Password', 'Prueba123!');
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong'));
  });
});

describe('Formulario de registro', () => {
  beforeEach(() => vi.clearAllMocks());

  test('rechaza campos vacíos', () => {
    renderAuth();
    registerMode();
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(toast.error).toHaveBeenCalledWith('All fields are required');
  });

  test('rechaza confirmaciones de contraseña distintas', () => {
    renderAuth();
    registerMode();
    type('Name', 'Carlos Lopez');
    type('Email', 'qa@example.com');
    type('Password', 'Prueba123!');
    type('Confirm Password', 'Otra123!');
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(toast.error).toHaveBeenCalledWith("Passwords don't match");
  });

  test('rechaza un correo inválido', () => {
    renderAuth();
    registerMode();
    type('Name', 'Carlos Lopez');
    type('Email', 'incorrecto');
    type('Password', 'Prueba123!');
    type('Confirm Password', 'Prueba123!');
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(toast.error).toHaveBeenCalledWith('Invalid email format');
  });

  test('registra usuario y regresa a inicio de sesión', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({ token: 'creado', message: 'Registration Successfully' })));
    renderAuth();
    registerMode();
    type('Name', 'Carlos Lopez');
    type('Email', 'qa@example.com');
    type('Password', 'Prueba123!');
    type('Confirm Password', 'Prueba123!');
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Registration Successfully'));
    expect(screen.getByRole('button', { name: 'Login' })).toBeTruthy();
  });

  test('registra rechazo del backend', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'User Already Exist' })));
    renderAuth();
    registerMode();
    type('Name', 'Carlos Lopez');
    type('Email', 'qa@example.com');
    type('Password', 'Prueba123!');
    type('Confirm Password', 'Prueba123!');
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('User Already Exist'));
  });

  test('el registro maneja fallos de conexión', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Sin red'))));
    renderAuth();
    registerMode();
    type('Name', 'Carlos Lopez');
    type('Email', 'qa@example.com');
    type('Password', 'Prueba123!');
    type('Confirm Password', 'Prueba123!');
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong'));
  });
});
