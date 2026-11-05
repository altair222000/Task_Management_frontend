import React from 'react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { TaskCard, UpdateCategory } from '../../src/components/Model';
import authReducer, { addAuth } from '../../src/redux/slices/authSlice';
import taskReducer from '../../src/redux/slices/taskSlice';
import stateReducer, * as stateActions from '../../src/redux/slices/stateSlice';
import { toast } from 'react-toastify';

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const task = {
  _id: 't1',
  title: 'Revisar servicios',
  priority: 'High Priority',
  category: 'to-do',
  checklist: [{ name: 'Verificar', isDone: false }],
  assign: 'qa@example.com',
  dueDate: '2026-11-15',
};
const setup = (Component, existing = task) => {
  const store = configureStore({ reducer: { auth: authReducer, task: taskReducer, state: stateReducer } });
  store.dispatch(addAuth({ board: ['qa@example.com'] }));
  store.dispatch(stateActions.setTaskM(existing));
  store.dispatch(stateActions.setTaskMId('t1'));
  store.dispatch(stateActions.setCategoryName({ oldCategory: 'to-do', newCategory: 'done' }));
  const result = render(
    <Provider store={store}>
      <MemoryRouter><Component /></MemoryRouter>
    </Provider>,
  );
  return { store, ...result };
};
const reply = x => Promise.resolve({ json: () => Promise.resolve(x) });

// Comprueba la edición y los detalles de una tarea.
describe('Detalles de tareas', () => {
  beforeEach(() => vi.clearAllMocks());

  test('se muestran los datos existentes de la tarea', () => {
    setup(TaskCard);
    expect(screen.getByDisplayValue('Revisar servicios')).toBeTruthy();
    expect(screen.getByDisplayValue('Verificar')).toBeTruthy();
    expect(screen.getByText('qa@example.com')).toBeTruthy();
    expect(screen.getByText('Checklist (0/1)')).toBeTruthy();
  });

  test('permite marcar un elemento del checklist', () => {
    const { container } = setup(TaskCard);
    fireEvent.click(container.querySelector('.checklist-btn-l'));
    expect(screen.getByText('Checklist (1/1)')).toBeTruthy();
  });

  test('puede añadir y eliminar un elemento del checklist', () => {
    const { container } = setup(TaskCard);
    fireEvent.click(screen.getByText('Add New'));
    expect(screen.getAllByPlaceholderText('Add a task')).toHaveLength(2);
    fireEvent.click(container.querySelector('.checklist-btn-r'));
    expect(screen.getAllByPlaceholderText('Add a task')).toHaveLength(1);
  });

  test('la edición rechaza un checklist con elemento vacío', () => {
    setup(TaskCard);
    fireEvent.click(screen.getByText('Add New'));
    fireEvent.click(screen.getByText('Save'));
    expect(toast.error).toHaveBeenCalledWith('Checklist is required');
  });

  test('permite actualizar título y datos de una tarea', async () => {
    const { store } = setup(TaskCard);
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'success', data: { ...task, title: 'Revisar equipos' } })));
    fireEvent.change(screen.getByPlaceholderText('Enter Task Title'), { target: { value: 'revisar equipos' } });
    fireEvent.click(screen.getByText('Save'));
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Task Updated Successfully'));
    expect(store.getState().state.taskM).toBe('');
  });

  test('permite elegir un responsable del tablero', () => {
    const { container } = setup(TaskCard, { ...task, assign: '' });
    fireEvent.click(container.querySelector('.model-assign-input'));
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    expect(screen.getByText('qa@example.com')).toBeTruthy();
  });

  test('permite quitar el responsable asignado', () => {
    const { container } = setup(TaskCard);
    fireEvent.click(container.querySelector('.model-assign-input'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Add a assignee')).toBeTruthy();
  });

  test('confirma el cambio de estado de la tarea', async () => {
    const { store } = setup(UpdateCategory);
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'success', data: { ...task, category: 'done' } })));
    fireEvent.click(screen.getByText('Update status'));
    await vi.waitFor(() => expect(store.getState().state.updateCategoryM).toBe(false));
    expect(store.getState().state.categoryName).toBe('');
  });
});
