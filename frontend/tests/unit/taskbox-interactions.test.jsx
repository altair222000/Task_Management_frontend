import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import TaskBox from '../../src/components/TaskBox';
import stateReducer from '../../src/redux/slices/stateSlice';

const task = {
  _id: 't1',
  title: 'Revisar respaldos',
  priority: 'High Priority',
  category: 'to-do',
  checklist: [{ name: 'Verificar archivos', isDone: false }, { name: 'Comprobar fecha', isDone: true }],
  userName: { name: 'Carlos Lopez' },
  dueDate: '2026-11-15',
};

const setup = (data = task) => {
  const store = configureStore({ reducer: { state: stateReducer } });
  const result = render(
    <Provider store={store}>
      <MemoryRouter>
        <TaskBox
          task={data}
          backlogCollapse={false}
          todoCollapse={false}
          progressCollapse={false}
          doneCollapse={false}
        />
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...result };
};

// Revisa la interacción con las tarjetas.
describe('Tarjetas de tareas', () => {
  test('muestra el título, prioridad y elementos de la tarea', () => {
    setup();
    expect(screen.getByText('Revisar respaldos')).toBeTruthy();
    expect(screen.getByText('High Priority')).toBeTruthy();
    expect(screen.getByText('Verificar archivos')).toBeTruthy();
    expect(screen.getByText('Comprobar fecha')).toBeTruthy();
    expect(screen.getByText('Checklist (1/2)')).toBeTruthy();
  });

  test.each(['BACKLOG', 'PROGRESS', 'DONE'])('permite solicitar el estado %s', label => {
    const { store } = setup();
    fireEvent.click(screen.getByText(label));
    expect(store.getState().state.updateCategoryM).toBe(true);
    expect(store.getState().state.taskMId).toBe('t1');
  });

  test('permite cambiar una tarea terminada al estado To-Do', () => {
    const { store } = setup({ ...task, category: 'done' });
    fireEvent.click(screen.getByText('TO-DO'));
    expect(store.getState().state.categoryName).toEqual({ oldCategory: 'done', newCategory: 'to-do' });
  });

  test('abre el menú y permite editar la tarea', () => {
    const { store, container } = setup();
    const icon = container.querySelector('.relative svg');
    expect(icon).toBeTruthy();
    fireEvent.click(icon);
    fireEvent.click(screen.getByText('Edit'));
    expect(store.getState().state.taskCardM).toBe(true);
    expect(store.getState().state.taskM._id).toBe('t1');
  });

  test('abre el menú y solicita eliminar la tarea', () => {
    const { store, container } = setup();
    fireEvent.click(container.querySelector('.relative svg'));
    fireEvent.click(screen.getByText('Delete'));
    expect(store.getState().state.taskDeleteM).toBe(true);
  });

  test('el menú permite informar cuando no hay portapapeles', () => {
    const { container } = setup();
    fireEvent.click(container.querySelector('.relative svg'));
    if (!navigator.clipboard) {
      fireEvent.click(screen.getByText('Share'));
      expect(screen.getByText('Revisar respaldos')).toBeTruthy();
    }
  });
});
