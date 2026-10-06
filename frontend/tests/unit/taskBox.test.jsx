import React from 'react';
import { expect, test } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import TaskBox from '../../src/components/TaskBox';
import { renderWithStore } from '../helpers';
const task = { _id: 't1', title: 'Visible task', priority: 'High Priority', category: 'to-do', userName: { name: 'Luis Colindres' }, checklist: [{ name: 'Done check', isDone: true }, { name: 'Pending check', isDone: false }] };

test.each([['DONE', 'done']])('FE-TASKBOX-transition-%s records the intended transition and task id', (label, category) => {
  const { store } = renderWithStore(<TaskBox task={task} />); fireEvent.click(screen.getByText(label));
  expect(store.getState().state.categoryName).toEqual({ newCategory: category, oldCategory: 'to-do' });
  expect(store.getState().state.taskMId).toBe('t1'); expect(store.getState().state.updateCategoryM).toBe(true);
});

