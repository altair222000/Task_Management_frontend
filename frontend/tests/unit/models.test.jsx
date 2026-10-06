import React, { useEffect } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { AddPeople, AddedPeople, Logout, TaskDelete, TaskCardPublic, UpdateCategory } from '../../src/components/Model';
import useGetTask from '../../src/hooks/useGetTask';
import useAddToBoard from '../../src/hooks/useAddToBoard';
import useUpdateCategory from '../../src/hooks/useUpdateCategory';
import useDeleteTask from '../../src/hooks/useDeleteTask';
import { renderWithStore } from '../helpers';
import state from '../../src/redux/slices/stateSlice';
vi.mock('../../src/hooks/useGetTask', () => ({ default: vi.fn() }));
vi.mock('../../src/hooks/useAddToBoard', () => ({ default: vi.fn() }));
vi.mock('../../src/hooks/useUpdateCategory', () => ({ default: vi.fn() }));
vi.mock('../../src/hooks/useDeleteTask', () => ({ default: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); useGetTask.mockImplementation(() => {}); });
function preload(fields) { return { state: { ...state(undefined, { type: 'init' }), ...fields } }; }
function VisibleUpdateCategory() {
  const visible = useSelector(store => store.state.updateCategoryM);
  return visible ? <UpdateCategory /> : null;
}
function publicCard(task, loading = false) {
  if (!loading) useGetTask.mockImplementation((id, setter) => { useEffect(() => setter(task), []); });
  return renderWithStore(<Routes><Route path="/task/:id" element={<TaskCardPublic />} /></Routes>, {}, '/task/public-1');
}

test('FE-MODAL-MEMBER-01 rejects an invalid member email before invoking the request unit', () => {
  renderWithStore(<AddPeople />); fireEvent.change(screen.getByPlaceholderText('Enter the email'), { target: { value: 'invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Email' }));
  expect(toast.error).toHaveBeenCalledWith('Invalid email format'); expect(useAddToBoard).not.toHaveBeenCalled();
});

test('FE-LOGOUT-01 removes the token and profile, then navigates to login', () => {
  localStorage.setItem('token', 'test-token');
  const { store } = renderWithStore(<Routes><Route path="/" element={<Logout />} /><Route path="/login" element={<p>Login destination</p>} /></Routes>, { auth: { _id: 'u1' }, ...preload({ logoutM: true }) });
  fireEvent.click(screen.getByRole('button', { name: 'Yes, Logout' }));
  expect(localStorage.getItem('token')).toBeNull(); expect(store.getState().auth).toBeNull();
  expect(store.getState().state.logoutM).toBe(false); expect(screen.getByText('Login destination')).toBeTruthy();
});

test('FE-PUBLIC-CARD-01 displays a shared task and checklist without administrative buttons', () => {
  publicCard({ _id: 'public-1', title: 'Public task', priority: 'High Priority', checklist: [{ name: 'Finished check', isDone: true }, { name: 'Pending check', isDone: false }], dueDate: '2026-10-10T00:00:00Z' });
  expect(screen.getByText('Public task')).toBeTruthy(); expect(screen.getByText('Checklist (1/2)')).toBeTruthy();
  expect(screen.getByText('Finished check')).toBeTruthy(); expect(screen.getByText('Pending check')).toBeTruthy();
  expect(screen.getByText('Due Date')).toBeTruthy(); expect(screen.getByText('Oct 10')).toBeTruthy();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});

