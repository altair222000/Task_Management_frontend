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
test('FE-MODAL-MEMBER-02 passes a valid member email to the request unit', () => {
  renderWithStore(<AddPeople />); fireEvent.change(screen.getByPlaceholderText('Enter the email'), { target: { value: 'member@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Email' }));
  expect(useAddToBoard).toHaveBeenCalledWith(expect.anything(), expect.any(Function), expect.any(Function), 'member@example.com');
});
test('FE-MODAL-MEMBER-03 closes the member dialog on cancellation', () => {
  const { store } = renderWithStore(<AddPeople />, preload({ addPeopleM: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(store.getState().state.addPeopleM).toBe(false);
});
test('FE-MODAL-MEMBER-04 shows the added email and clears the confirmation', () => {
  const { store } = renderWithStore(<AddedPeople />, preload({ addedPeopleM: true, boardEmail: 'member@example.com' }));
  expect(screen.getByText('member@example.com added to board')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Okey, got it!' }));
  expect(store.getState().state.addedPeopleM).toBe(false); expect(store.getState().state.boardEmail).toBe('');
});
test('FE-LOGOUT-01 removes the token and profile, then navigates to login', () => {
  localStorage.setItem('token', 'test-token');
  const { store } = renderWithStore(<Routes><Route path="/" element={<Logout />} /><Route path="/login" element={<p>Login destination</p>} /></Routes>, { auth: { _id: 'u1' }, ...preload({ logoutM: true }) });
  fireEvent.click(screen.getByRole('button', { name: 'Yes, Logout' }));
  expect(localStorage.getItem('token')).toBeNull(); expect(store.getState().auth).toBeNull();
  expect(store.getState().state.logoutM).toBe(false); expect(screen.getByText('Login destination')).toBeTruthy();
});
test('FE-LOGOUT-02 cancellation keeps the current session', () => {
  localStorage.setItem('token', 'test-token'); const { store } = renderWithStore(<Logout />, { auth: { _id: 'u1' }, ...preload({ logoutM: true }) });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(localStorage.getItem('token')).toBe('test-token'); expect(store.getState().auth).toEqual({ _id: 'u1' }); expect(store.getState().state.logoutM).toBe(false);
});
test('FE-MODAL-STATE-01 sends the selected task and source and destination categories', () => {
  renderWithStore(<UpdateCategory />, preload({ taskMId: 't1', categoryName: { oldCategory: 'to-do', newCategory: 'done' } }));
  fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
  expect(useUpdateCategory).toHaveBeenCalledWith(expect.anything(), expect.any(Function), expect.any(Function), 't1', 'done', 'to-do');
});
test('FE-MODAL-STATE-02 cancellation clears the pending state transition', () => {
  const { store } = renderWithStore(<VisibleUpdateCategory />, preload({ updateCategoryM: true, categoryName: { oldCategory: 'to-do', newCategory: 'done' } }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(store.getState().state.updateCategoryM).toBe(false); expect(store.getState().state.categoryName).toBe('');
});
test('FE-MODAL-DELETE-01 delegates deletion of the selected task', () => {
  renderWithStore(<TaskDelete />, preload({ taskMId: 't1' })); fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }));
  expect(useDeleteTask).toHaveBeenCalledWith(expect.anything(), expect.any(Function), expect.any(Function), 't1');
});
test('FE-MODAL-DELETE-02 cancellation closes the dialog without invoking deletion', () => {
  const { store } = renderWithStore(<TaskDelete />, preload({ taskDeleteM: true })); fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(store.getState().state.taskDeleteM).toBe(false); expect(useDeleteTask).not.toHaveBeenCalled();
});
test('FE-PUBLIC-CARD-01 displays a shared task and checklist without administrative buttons', () => {
  publicCard({ _id: 'public-1', title: 'Public task', priority: 'High Priority', checklist: [{ name: 'Finished check', isDone: true }, { name: 'Pending check', isDone: false }], dueDate: '2026-10-10T00:00:00Z' });
  expect(screen.getByText('Public task')).toBeTruthy(); expect(screen.getByText('Checklist (1/2)')).toBeTruthy();
  expect(screen.getByText('Finished check')).toBeTruthy(); expect(screen.getByText('Pending check')).toBeTruthy();
  expect(screen.getByText('Due Date')).toBeTruthy(); expect(screen.getByText('Oct 10')).toBeTruthy();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
test('FE-PUBLIC-CARD-02 displays the not-found explanation for a null task', () => {
  publicCard(null); expect(screen.getByText('Task Not Found')).toBeTruthy(); expect(screen.getByRole('link', { name: 'Back to Home' })).toBeTruthy();
});
test('FE-PUBLIC-CARD-03 omits the due date when none is available', () => {
  publicCard({ title: 'Undated task', checklist: [], priority: 'Low Priority' });
  expect(screen.getByText('Undated task')).toBeTruthy(); expect(screen.queryByText('Due Date')).toBeNull();
});
test('FE-PUBLIC-CARD-04 shows loading until the public lookup finishes', () => {
  publicCard(undefined, true); expect(screen.queryByText('Task Not Found')).toBeNull(); expect(screen.queryByText('Pro Manage')).toBeNull();
  expect(useGetTask).toHaveBeenCalledWith('public-1', expect.any(Function));
});
