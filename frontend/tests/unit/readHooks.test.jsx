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
test('FE-READ-02 stops loading without replacing columns after an application error', async () => {
  resolve({ message: 'error' }); renderHook(() => useAllTask());
  await waitFor(() => expect(dispatch).toHaveBeenLastCalledWith(setLoading(false)));
  expect(dispatch).toHaveBeenCalledTimes(2);
});
test('FE-READ-03 reports a failed board fetch and clears loading', async () => {
  fetch.mockRejectedValue(new Error('offline')); renderHook(() => useAllTask());
  await waitFor(() => expect(dispatch).toHaveBeenLastCalledWith(setLoading(false)));
  expect(toast.error).toHaveBeenCalledWith('Something went wrong'); expect(dispatch).toHaveBeenCalledTimes(2);
});

test('FE-FILTER-01 includes the selected day range and updates all columns', async () => {
  resolve({ message: 'success', data }); useAllTaskFilter(dispatch, 7);
  await waitFor(() => expect(dispatch).toHaveBeenLastCalledWith(setLoading(false)));
  expect(fetch.mock.calls[0][0]).toBe('https://unit-test.invalid/api/task/all?days=7'); expectColumns();
});
test('FE-FILTER-02 preserves columns after an application error', async () => {
  resolve({ message: 'error' }); useAllTaskFilter(dispatch, 7);
  await waitFor(() => expect(dispatch).toHaveBeenLastCalledWith(setLoading(false)));
  expect(dispatch).toHaveBeenCalledTimes(2);
});
test('FE-FILTER-03 reports a network failure and clears loading', async () => {
  fetch.mockRejectedValue(new Error('offline')); useAllTaskFilter(dispatch, 7);
  await waitFor(() => expect(dispatch).toHaveBeenLastCalledWith(setLoading(false)));
  expect(toast.error).toHaveBeenCalledWith('Something went wrong');
});

test('FE-PUBLIC-01 reads a shared task without sending an authentication token', async () => {
  const setTask = vi.fn(), task = { _id: 'public-1', title: 'Shared task' };
  resolve({ message: 'success', data: task }); renderHook(() => useGetTask('public-1', setTask));
  await waitFor(() => expect(setTask).toHaveBeenCalledWith(task));
  expect(fetch).toHaveBeenCalledWith('https://unit-test.invalid/api/task/public-1', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
});
test('FE-PUBLIC-02 sets null for an unsuccessful public lookup', async () => {
  const setTask = vi.fn(); resolve({ message: 'not found' }); renderHook(() => useGetTask('missing', setTask));
  await waitFor(() => expect(setTask).toHaveBeenCalledWith(null));
  expect(toast.error).toHaveBeenCalledWith('Something went wrong');
});
test('FE-PUBLIC-03 reports a public lookup network error', async () => {
  const setTask = vi.fn(); fetch.mockRejectedValue(new Error('offline')); renderHook(() => useGetTask('t1', setTask));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong'));
  expect(setTask).not.toHaveBeenCalled();
});
test('FE-ANALYTICS-01 loads authenticated analytics data', async () => {
  const setter = vi.fn(), stats = { backlog: 1, todo: 2 }; resolve({ message: 'success', data: stats });
  renderHook(() => useGetAnalytics(setter)); await waitFor(() => expect(setter).toHaveBeenCalledWith(stats));
  expect(fetch.mock.calls[0][0]).toBe('https://unit-test.invalid/api/analytics');
});
test('FE-ANALYTICS-02 reports an unsuccessful analytics response', async () => {
  const setter = vi.fn(); resolve({ message: 'error' }); renderHook(() => useGetAnalytics(setter));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong')); expect(setter).not.toHaveBeenCalled();
});
test('FE-ANALYTICS-03 reports an analytics network failure', async () => {
  fetch.mockRejectedValue(new Error('offline')); renderHook(() => useGetAnalytics(vi.fn()));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong'));
});
