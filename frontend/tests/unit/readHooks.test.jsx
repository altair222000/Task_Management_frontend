import { beforeEach, expect, test, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import useAllTask from '../../src/hooks/useAllTask';
import useAllTaskFilter from '../../src/hooks/useAllTaskFilter';
import useGetTask from '../../src/hooks/useGetTask';
import useGetAnalytics from '../../src/hooks/useGetAnalytics';
import * as actions from '../../src/redux/slices/taskSlice';
import { setLoading } from '../../src/redux/slices/stateSlice';
const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }));
vi.mock('react-redux', () => ({ useDispatch: () => dispatch }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); localStorage.setItem('token', 'test-token'); });
const data = { backlog: [{ _id: 'b' }], todo: [{ _id: 't' }], inProgress: [{ _id: 'p' }], done: [{ _id: 'd' }] };
function resolve(json) { fetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(json) }); }
function expectColumns() {
  expect(dispatch).toHaveBeenCalledWith(actions.setBacklog(data.backlog));
  expect(dispatch).toHaveBeenCalledWith(actions.setTodo(data.todo));
  expect(dispatch).toHaveBeenCalledWith(actions.setInProgress(data.inProgress));
  expect(dispatch).toHaveBeenCalledWith(actions.setDone(data.done));
}

test('FE-READ-01 loads all four board columns and finishes loading', async () => {
  resolve({ message: 'success', data }); renderHook(() => useAllTask());
  await waitFor(() => expect(dispatch).toHaveBeenLastCalledWith(setLoading(false)));
  expectColumns();
  expect(fetch).toHaveBeenCalledWith('https://unit-test.invalid/api/task/all', { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' } });
});

test('FE-FILTER-01 includes the selected day range and updates all columns', async () => {
  resolve({ message: 'success', data }); useAllTaskFilter(dispatch, 7);
  await waitFor(() => expect(dispatch).toHaveBeenLastCalledWith(setLoading(false)));
  expect(fetch.mock.calls[0][0]).toBe('https://unit-test.invalid/api/task/all?days=7'); expectColumns();
});

test('FE-PUBLIC-01 reads a shared task without sending an authentication token', async () => {
  const setTask = vi.fn(), task = { _id: 'public-1', title: 'Shared task' };
  resolve({ message: 'success', data: task }); renderHook(() => useGetTask('public-1', setTask));
  await waitFor(() => expect(setTask).toHaveBeenCalledWith(task));
  expect(fetch).toHaveBeenCalledWith('https://unit-test.invalid/api/task/public-1', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
});

