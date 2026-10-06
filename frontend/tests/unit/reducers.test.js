import { expect, test } from 'vitest';
import auth, { addAuth, removeAuth } from '../../src/redux/slices/authSlice';
import task, * as actions from '../../src/redux/slices/taskSlice';
import state, { setCategoryName, setUpdateCategoryM, setBoardEmail } from '../../src/redux/slices/stateSlice';

const categories = [
  ['backlog', 'Backlog'], ['todo', 'Todo'],
  ['inProgress', 'InProgress'], ['done', 'Done'],
];

test.each([['todo', 'Todo']])('FE-STORE-update-%s changes the matching task and retains unrelated tasks', (key, suffix) => {
  const original = { backlog: [], todo: [], inProgress: [], done: [], [key]: [{ _id: 't1', title: 'Old' }, { _id: 't2', title: 'Other' }] };
  const changed = { _id: 't1', title: 'New' }, result = task(original, actions[`update${suffix}Task`](changed));
  expect(result[key]).toEqual([changed, original[key][1]]);
  expect(original[key][0].title).toBe('Old');
  expect(result[key][1]).toBe(original[key][1]);
});

