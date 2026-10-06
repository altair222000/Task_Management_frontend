import React from 'react';
import { expect, test } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import TaskBox from '../../src/components/TaskBox';
import { renderWithStore } from '../helpers';
const task = { _id: 't1', title: 'Visible task', priority: 'High Priority', category: 'to-do', userName: { name: 'Luis Colindres' }, checklist: [{ name: 'Done check', isDone: true }, { name: 'Pending check', isDone: false }] };
test('FE-TASKBOX-01 displays task title, priority and completed checklist count', () => {
  renderWithStore(<TaskBox task={task} />);
  expect(screen.getByText('Visible task')).toBeTruthy(); expect(screen.getByText('High Priority')).toBeTruthy(); expect(screen.getByText('Checklist (1/2)')).toBeTruthy();
  expect(screen.queryByText('TO-DO')).toBeNull();
});
test.each([['BACKLOG', 'backlog'], ['PROGRESS', 'in-progress'], ['DONE', 'done']])('FE-TASKBOX-transition-%s records the intended transition and task id', (label, category) => {
  const { store } = renderWithStore(<TaskBox task={task} />); fireEvent.click(screen.getByText(label));
  expect(store.getState().state.categoryName).toEqual({ newCategory: category, oldCategory: 'to-do' });
  expect(store.getState().state.taskMId).toBe('t1'); expect(store.getState().state.updateCategoryM).toBe(true);
});
test('FE-TASKBOX-todo records a transition back to To Do', () => {
  const { store } = renderWithStore(<TaskBox task={{ ...task, category: 'backlog' }} />); fireEvent.click(screen.getByText('TO-DO'));
  expect(store.getState().state.categoryName).toEqual({ oldCategory: 'backlog', newCategory: 'to-do' });
});
test('FE-TASKBOX-due displays the due date for a completed task', () => {
  renderWithStore(<TaskBox task={{ ...task, category: 'done', dueDate: '2026-10-10T00:00:00Z', userName: { name: 'Luis' } }} />);
  expect(screen.getByText('Oct 10')).toBeTruthy(); expect(screen.queryByText('DONE')).toBeNull();
});
