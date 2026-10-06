import { beforeEach, expect, test, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import useAddTask from '../../src/hooks/useAddTask';
import useDeleteTask from '../../src/hooks/useDeleteTask';
import useUpdateTask from '../../src/hooks/useUpdateTask';
import useUpdateCategory from '../../src/hooks/useUpdateCategory';
import useAddToBoard from '../../src/hooks/useAddToBoard';
import * as taskActions from '../../src/redux/slices/taskSlice';
import * as stateActions from '../../src/redux/slices/stateSlice';
import { addAuth } from '../../src/redux/slices/authSlice';

// fetch isolates HTTP/Railway; toast isolates notifications from request behavior.
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.setItem('token', 'test-token');
});
const body = { title: 'QA task', priority: 'High Priority', checklist: [{ name: 'Check', isDone: false }], assign: 'member@example.com', dueDate: '2026-10-10' };
function controls() { return { e: { target: { disabled: false } }, setLoad: vi.fn(), dispatch: vi.fn() }; }
function resolve(json) { fetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(json) }); }
async function settled(c) { await waitFor(() => expect(c.setLoad).toHaveBeenLastCalledWith('')); expect(c.e.target.disabled).toBe(false); }
function add(c) { useAddTask(c.e, c.setLoad, body.title, body.priority, body.checklist, body.assign, body.dueDate, c.dispatch); }
function update(c) { useUpdateTask(c.e, c.setLoad, body.title, body.priority, body.checklist, body.assign, body.dueDate, c.dispatch, 't1'); }

test('FE-ADD-01 posts authenticated task data and adds a successful task to To Do', async () => {
  const c = controls(), task = { _id: 't1', ...body, category: 'to-do' };
  resolve({ message: 'success', data: task }); add(c);
  expect(c.e.target.disabled).toBe(true);
  expect(c.setLoad).toHaveBeenCalledWith('Loading...');
  await settled(c);
  expect(fetch).toHaveBeenCalledWith('https://unit-test.invalid/api/task/add', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' }, body: JSON.stringify(body) });
  expect(c.dispatch).toHaveBeenCalledWith(taskActions.addTodoTask(task));
  expect(c.dispatch).toHaveBeenCalledWith(stateActions.setTaskCardM(false));
  expect(c.dispatch).toHaveBeenCalledWith(stateActions.setTaskM(''));
  expect(toast.success).toHaveBeenCalledWith('Task Added Successfully');
});
test('FE-ADD-02 leaves the board unchanged after an application error', async () => {
  const c = controls(); resolve({ message: 'Rejected task' }); add(c); await settled(c);
  expect(toast.error).toHaveBeenCalledWith('Rejected task'); expect(c.dispatch).not.toHaveBeenCalled();
});
test('FE-ADD-03 restores controls after a network failure', async () => {
  const c = controls(); fetch.mockRejectedValue(new Error('offline')); add(c); await settled(c);
  expect(toast.error).toHaveBeenCalledWith('Something went wrong'); expect(c.dispatch).not.toHaveBeenCalled();
});

const categories = [['to-do', 'Todo'], ['backlog', 'Backlog'], ['in-progress', 'InProgress'], ['done', 'Done']];
test.each(categories)('FE-DELETE-%s removes the task from its current column', async (category, suffix) => {
  const c = controls(), task = { _id: 't1', category };
  resolve({ message: 'success', data: task });
  useDeleteTask(c.e, c.setLoad, c.dispatch, 't1'); await settled(c);
  expect(fetch.mock.calls[0][0]).toBe('https://unit-test.invalid/api/task/t1');
  expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  expect(c.dispatch).toHaveBeenCalledWith(taskActions[`delete${suffix}Task`](task));
  expect(c.dispatch).toHaveBeenCalledWith(stateActions.setTaskDeleteM(false));
});
test('FE-DELETE-error does not remove a task rejected by the service', async () => {
  const c = controls(); resolve({ message: 'Delete rejected' });
  useDeleteTask(c.e, c.setLoad, c.dispatch, 't1'); await settled(c);
  expect(c.dispatch).not.toHaveBeenCalled(); expect(toast.error).toHaveBeenCalledWith('Delete rejected');
});
test('FE-DELETE-network restores the delete button after a failed request', async () => {
  const c = controls(); fetch.mockRejectedValue(new Error('offline'));
  useDeleteTask(c.e, c.setLoad, c.dispatch, 't1'); await settled(c);
  expect(c.dispatch).not.toHaveBeenCalled(); expect(toast.error).toHaveBeenCalledWith('Something went wrong');
});

test.each(categories)('FE-UPDATE-%s replaces the task in its existing column', async (category, suffix) => {
  const c = controls(), task = { _id: 't1', ...body, category };
  resolve({ message: 'success', data: task }); update(c); await settled(c);
  expect(fetch).toHaveBeenCalledWith('https://unit-test.invalid/api/task/t1', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' }, body: JSON.stringify(body) });
  expect(c.dispatch).toHaveBeenCalledWith(taskActions[`update${suffix}Task`](task));
  expect(c.dispatch).toHaveBeenCalledWith(stateActions.setTaskCardM(false));
});
test.each(categories)('FE-REASSIGN-%s removes a task no longer assigned to this user', async (category, suffix) => {
  const c = controls(), task = { _id: 't1', ...body, category };
  resolve({ message: 'success', data: task, removeAssignCategory: category }); update(c); await settled(c);
  expect(c.dispatch).toHaveBeenCalledWith(taskActions[`delete${suffix}Task`](task));
  expect(c.dispatch).not.toHaveBeenCalledWith(taskActions[`update${suffix}Task`](task));
});
test('FE-UPDATE-error preserves state after an application error', async () => {
  const c = controls(); resolve({ message: 'Update rejected' }); update(c); await settled(c);
  expect(c.dispatch).not.toHaveBeenCalled(); expect(toast.error).toHaveBeenCalledWith('Update rejected');
});
test('FE-UPDATE-network restores editing controls after a network failure', async () => {
  const c = controls(); fetch.mockRejectedValue(new Error('offline')); update(c); await settled(c);
  expect(c.dispatch).not.toHaveBeenCalled(); expect(toast.error).toHaveBeenCalledWith('Something went wrong');
});

test.each([
  ['to-do', 'Todo', 'backlog', 'Backlog'],
  ['backlog', 'Backlog', 'in-progress', 'InProgress'],
  ['in-progress', 'InProgress', 'done', 'Done'],
  ['done', 'Done', 'to-do', 'Todo'],
])('FE-TRANSITION-%s moves the task to the destination and removes it from the source', async (destination, addSuffix, source, deleteSuffix) => {
  const c = controls(), task = { _id: 't1', category: destination };
  resolve({ message: 'success', data: task });
  useUpdateCategory(c.e, c.setLoad, c.dispatch, 't1', destination, source); await settled(c);
  expect(fetch.mock.calls[0][1].body).toBe(JSON.stringify({ category: destination }));
  expect(c.dispatch).toHaveBeenCalledWith(taskActions[`add${addSuffix}Task`](task));
  expect(c.dispatch).toHaveBeenCalledWith(taskActions[`delete${deleteSuffix}Task`](task));
  expect(c.dispatch).toHaveBeenCalledWith(stateActions.setUpdateCategoryM(false));
  expect(c.dispatch).toHaveBeenCalledWith(stateActions.setCategoryName(''));
});
test('FE-TRANSITION-error keeps the task in its source column after rejection', async () => {
  const c = controls(); resolve({ message: 'Status rejected' });
  useUpdateCategory(c.e, c.setLoad, c.dispatch, 't1', 'done', 'to-do'); await settled(c);
  expect(c.dispatch).not.toHaveBeenCalled(); expect(toast.error).toHaveBeenCalledWith('Status rejected');
});
test('FE-TRANSITION-network restores controls without moving the task', async () => {
  const c = controls(); fetch.mockRejectedValue(new Error('offline'));
  useUpdateCategory(c.e, c.setLoad, c.dispatch, 't1', 'done', 'to-do'); await settled(c);
  expect(c.dispatch).not.toHaveBeenCalled(); expect(toast.error).toHaveBeenCalledWith('Something went wrong');
});

test('FE-MEMBER-01 updates the profile and shows confirmation after adding a member', async () => {
  const c = controls(), email = 'member@example.com', profile = { _id: 'u1', board: [email] };
  resolve({ message: 'success', data: profile, email });
  useAddToBoard(c.e, c.setLoad, c.dispatch, email); await settled(c);
  expect(fetch).toHaveBeenCalledWith('https://unit-test.invalid/api/user/board', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' }, body: JSON.stringify({ email }) });
  expect(c.dispatch).toHaveBeenCalledWith(addAuth(profile));
  expect(c.dispatch).toHaveBeenCalledWith(stateActions.setAddPeopleM(false));
  expect(c.dispatch).toHaveBeenCalledWith(stateActions.setAddedPeopleM(true));
  expect(c.dispatch).toHaveBeenCalledWith(stateActions.setBoardEmail(email));
});
test('FE-MEMBER-02 leaves the profile unchanged if member addition is rejected', async () => {
  const c = controls(); resolve({ message: 'Member rejected' });
  useAddToBoard(c.e, c.setLoad, c.dispatch, 'member@example.com'); await settled(c);
  expect(c.dispatch).not.toHaveBeenCalled(); expect(toast.error).toHaveBeenCalledWith('Member rejected');
});
test('FE-MEMBER-03 restores controls after a failed member request', async () => {
  const c = controls(); fetch.mockRejectedValue(new Error('offline'));
  useAddToBoard(c.e, c.setLoad, c.dispatch, 'member@example.com'); await settled(c);
  expect(c.dispatch).not.toHaveBeenCalled(); expect(toast.error).toHaveBeenCalledWith('Something went wrong');
});
