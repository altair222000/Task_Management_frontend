import React from 'react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import authReducer, { addAuth } from '../../src/redux/slices/authSlice';
import stateReducer, * as stateActions from '../../src/redux/slices/stateSlice';
import taskReducer from '../../src/redux/slices/taskSlice';
import { AddPeople, AddedPeople, UpdateCategory, Logout, TaskDelete, TaskCard, TaskCardPublic } from '../../src/components/Model';
import { toast } from 'react-toastify';

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const makeStore = () => configureStore({
  reducer: { auth: authReducer, state: stateReducer, task: taskReducer },
});
const reply = json => Promise.resolve({ json: () => Promise.resolve(json) });
const show = (Component, currentStore = makeStore(), route = '/') => {
  render(
    <Provider store={currentStore}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={route.startsWith('/task/') ? '/task/:id' : '/'} element={<Component />} />
          <Route path="/login" element={<span>Pantalla de acceso</span>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return currentStore;
};

// Valida las decisiones del usuario en los formularios.
describe('Ventanas de tareas y colaboradores', () => {
  beforeEach(() => vi.clearAllMocks());

  test('el formulario de colaboradores rechaza un correo inválido', () => {
    show(AddPeople);
    fireEvent.change(screen.getByPlaceholderText('Enter the email'), { target: { value: 'incorrecto' } });
    fireEvent.click(screen.getByText('Add Email'));
    expect(toast.error).toHaveBeenCalledWith('Invalid email format');
  });

  test('el formulario de colaboradores registra un correo válido', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'success', data: { board: ['qa@example.com'] }, email: 'qa@example.com' })));
    const currentStore = show(AddPeople);
    fireEvent.change(screen.getByPlaceholderText('Enter the email'), { target: { value: 'qa@example.com' } });
    fireEvent.click(screen.getByText('Add Email'));
    await vi.waitFor(() => expect(currentStore.getState().state.addedPeopleM).toBe(true));
  });

  test('confirmar la adición de una persona limpia el mensaje', () => {
    const currentStore = makeStore();
    currentStore.dispatch(stateActions.setBoardEmail('qa@example.com'));
    show(AddedPeople, currentStore);
    expect(screen.getByText('qa@example.com added to board')).toBeTruthy();
    fireEvent.click(screen.getByText('Okey, got it!'));
    expect(currentStore.getState().state.boardEmail).toBe('');
  });

  test('cancelar el cierre de sesión mantiene el usuario', () => {
    const currentStore = makeStore();
    currentStore.dispatch(addAuth({ email: 'qa@example.com' }));
    show(Logout, currentStore);
    fireEvent.click(screen.getByText('Cancel'));
    expect(currentStore.getState().auth.email).toBe('qa@example.com');
  });

  test('cerrar sesión elimina el token', async () => {
    const currentStore = makeStore();
    currentStore.dispatch(addAuth({ email: 'qa@example.com' }));
    localStorage.setItem('token', 'temporal');
    show(Logout, currentStore);
    fireEvent.click(screen.getByText('Yes, Logout'));
    expect(localStorage.getItem('token')).toBeNull();
    expect(currentStore.getState().auth).toBeNull();
    expect(screen.getByText('Pantalla de acceso')).toBeTruthy();
  });

  test('confirmar la eliminación cierra el cuadro', async () => {
    const currentStore = makeStore();
    currentStore.dispatch(stateActions.setTaskMId('a'));
    currentStore.dispatch(stateActions.setTaskDeleteM(true));
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'success', data: { _id: 'a', category: 'to-do' } })));
    show(TaskDelete, currentStore);
    fireEvent.click(screen.getByText('Yes, Delete'));
    await vi.waitFor(() => expect(currentStore.getState().state.taskDeleteM).toBe(false));
  });

  test('cancelar el cambio de estado limpia la selección', () => {
    const currentStore = makeStore();
    currentStore.dispatch(stateActions.setCategoryName({ oldCategory: 'to-do', newCategory: 'done' }));
    show(UpdateCategory, currentStore);
    fireEvent.click(screen.getByText('Cancel'));
    expect(currentStore.getState().state.categoryName).toBe('');
  });

  test('el formulario de tarea rechaza los campos vacíos', () => {
    const currentStore = makeStore();
    currentStore.dispatch(addAuth({ board: [] }));
    show(TaskCard, currentStore);
    fireEvent.click(screen.getByText('Save'));
    expect(toast.error).toHaveBeenCalledWith('All fields are required');
  });

  test('el formulario permite crear tareas con checklist', async () => {
    const currentStore = makeStore();
    currentStore.dispatch(addAuth({ board: [] }));
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'success', data: { _id: 'a', category: 'to-do' } })));
    show(TaskCard, currentStore);
    fireEvent.change(screen.getByPlaceholderText('Enter Task Title'), { target: { value: 'Revisar servicios' } });
    fireEvent.click(screen.getByLabelText('High Priority'));
    fireEvent.click(screen.getByText('Add New'));
    fireEvent.change(screen.getByPlaceholderText('Add a task'), { target: { value: 'Validar reporte' } });
    fireEvent.click(screen.getByText('Save'));
    await vi.waitFor(() => expect(currentStore.getState().task.todo).toHaveLength(1));
  });

  test('el visor público presenta la tarea compartida', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'success', data: {
      _id: 'a', title: 'Tarea pública', priority: 'High Priority',
      checklist: [{ name: 'Revisar', isDone: false }], dueDate: '',
    } })));
    show(TaskCardPublic, makeStore(), '/task/a');
    await vi.waitFor(() => expect(screen.getByText('Tarea pública')).toBeTruthy());
  });

  test('el visor público informa si la tarea ya no existe', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'not found' })));
    show(TaskCardPublic, makeStore(), '/task/a');
    await vi.waitFor(() => expect(screen.getByText('Task Not Found')).toBeTruthy());
  });
});
