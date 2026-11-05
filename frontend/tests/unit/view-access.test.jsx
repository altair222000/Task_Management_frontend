import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import authReducer, { addAuth } from '../../src/redux/slices/authSlice';
import taskReducer from '../../src/redux/slices/taskSlice';
import stateReducer from '../../src/redux/slices/stateSlice';
import PrivateRoute from '../../src/components/PrivateRoute';
import useGetTask from '../../src/hooks/useGetTask';
import useAllTask from '../../src/hooks/useAllTask';

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const store = () => configureStore({
  reducer: { auth: authReducer, task: taskReducer, state: stateReducer },
});

const reply = value => Promise.resolve({ json: () => Promise.resolve(value) });

// Verifica el acceso y la consulta de tareas.
describe('Acceso a las pantallas', () => {
  test('un visitante sin sesión se dirige al inicio de sesión', () => {
    render(
      <Provider store={store()}>
        <MemoryRouter initialEntries={['/private']}>
          <Routes>
            <Route path="/private" element={<PrivateRoute><span>Tablero privado</span></PrivateRoute>} />
            <Route path="/login" element={<span>Iniciar sesión</span>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
    expect(screen.getByText('Iniciar sesión')).toBeTruthy();
  });

  test('un usuario registrado puede ver el tablero', () => {
    const currentStore = store();
    currentStore.dispatch(addAuth({ email: 'qa@example.com' }));
    render(
      <Provider store={currentStore}>
        <MemoryRouter initialEntries={['/private']}>
          <Routes>
            <Route path="/private" element={<PrivateRoute><span>Tablero privado</span></PrivateRoute>} />
            <Route path="/login" element={<span>Iniciar sesión</span>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
    expect(screen.getByText('Tablero privado')).toBeTruthy();
  });
});

describe('Consulta de tareas', () => {
  test('consulta correctamente una tarea compartida', async () => {
    const setTask = vi.fn();
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'success', data: { _id: 'a' } })));
    renderHook(() => useGetTask('a', setTask));
    await vi.waitFor(() => expect(setTask).toHaveBeenCalledWith({ _id: 'a' }));
  });

  test('indica cuando la tarea compartida no existe', async () => {
    const setTask = vi.fn();
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'not found' })));
    renderHook(() => useGetTask('a', setTask));
    await vi.waitFor(() => expect(setTask).toHaveBeenCalledWith(null));
  });

  test('controla errores de red en tareas compartidas', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Sin red'))));
    renderHook(() => useGetTask('a', vi.fn()));
    await vi.waitFor(() => expect(console.error).toHaveBeenCalled());
  });

  test('la carga general actualiza las listas de tareas', async () => {
    const currentStore = store();
    vi.stubGlobal('fetch', vi.fn(() => reply({
      message: 'success',
      data: { backlog: [{ _id: 'a' }], todo: [], inProgress: [], done: [] },
    })));
    renderHook(() => useAllTask(), {
      wrapper: ({ children }) => <Provider store={currentStore}>{children}</Provider>,
    });
    await vi.waitFor(() => expect(currentStore.getState().task.backlog).toEqual([{ _id: 'a' }]));
    await vi.waitFor(() => expect(currentStore.getState().state.loading).toBe(false));
  });

  test('la carga general maneja respuestas inválidas', async () => {
    const currentStore = store();
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'error' })));
    renderHook(() => useAllTask(), {
      wrapper: ({ children }) => <Provider store={currentStore}>{children}</Provider>,
    });
    await vi.waitFor(() => expect(currentStore.getState().state.loading).toBe(false));
  });

  test('la carga general maneja fallos de conexión', async () => {
    const currentStore = store();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Sin red'))));
    renderHook(() => useAllTask(), {
      wrapper: ({ children }) => <Provider store={currentStore}>{children}</Provider>,
    });
    await vi.waitFor(() => expect(console.error).toHaveBeenCalled());
    await vi.waitFor(() => expect(currentStore.getState().state.loading).toBe(false));
  });
});
