import { expect, test } from 'vitest';
import auth, { addAuth, removeAuth } from '../../src/redux/slices/authSlice';
import task, * as actions from '../../src/redux/slices/taskSlice';
import state, { setCategoryName, setUpdateCategoryM, setBoardEmail } from '../../src/redux/slices/stateSlice';

test('FE-AUTH-STATE-01 starts with no authenticated user', () => {
  expect(auth(undefined, { type: 'init' })).toBeNull();
});
test('FE-AUTH-STATE-02 stores an authenticated profile', () => {
  const profile = { _id: 'u1', email: 'qa@example.com' };
  expect(auth(null, addAuth(profile))).toEqual(profile);
});
test('FE-AUTH-STATE-03 clears the authenticated profile on logout', () => {
  expect(auth({ _id: 'u1' }, removeAuth())).toBeNull();
});

const categories = [
  ['backlog', 'Backlog'], ['todo', 'Todo'],
  ['inProgress', 'InProgress'], ['done', 'Done'],
];
test.each(categories)('FE-STORE-set-%s replaces only the selected column', (key, suffix) => {
  const original = { backlog: [{ _id: 'b' }], todo: [{ _id: 't' }], inProgress: [{ _id: 'p' }], done: [{ _id: 'd' }] };
  const list = [{ _id: 'new' }], result = task(original, actions[`set${suffix}`](list));
  expect(result[key]).toEqual(list);
  for (const [other] of categories.filter(([column]) => column !== key)) expect(result[other]).toBe(original[other]);
  expect(original[key]).not.toEqual(list);
});
test.each(categories)('FE-STORE-add-%s preserves existing tasks and other columns', (key, suffix) => {
  const original = { backlog: [], todo: [], inProgress: [], done: [], [key]: [{ _id: 'existing' }] };
  const result = task(original, actions[`add${suffix}Task`]({ _id: 'new' }));
  expect(result[key].map(t => t._id)).toEqual(['existing', 'new']);
  expect(original[key]).toEqual([{ _id: 'existing' }]);
  for (const [other] of categories.filter(([column]) => column !== key)) expect(result[other]).toBe(original[other]);
});
test.each(categories)('FE-STORE-update-%s changes the matching task and retains unrelated tasks', (key, suffix) => {
  const original = { backlog: [], todo: [], inProgress: [], done: [], [key]: [{ _id: 't1', title: 'Old' }, { _id: 't2', title: 'Other' }] };
  const changed = { _id: 't1', title: 'New' }, result = task(original, actions[`update${suffix}Task`](changed));
  expect(result[key]).toEqual([changed, original[key][1]]);
  expect(original[key][0].title).toBe('Old');
  expect(result[key][1]).toBe(original[key][1]);
});
test.each(categories)('FE-STORE-delete-%s removes only the matching task', (key, suffix) => {
  const original = { backlog: [], todo: [], inProgress: [], done: [], [key]: [{ _id: 't1' }, { _id: 't2' }] };
  const result = task(original, actions[`delete${suffix}Task`]({ _id: 't1' }));
  expect(result[key]).toEqual([{ _id: 't2' }]);
  expect(original[key]).toHaveLength(2);
});
test('FE-STORE-unknown leaves the state intact for an unknown action', () => {
  const original = task(undefined, { type: 'init' });
  expect(task(original, { type: 'unknown' })).toBe(original);
});
test('FE-STATE-01 remembers old and new categories for a pending transition', () => {
  let s = state(undefined, setCategoryName({ oldCategory: 'to-do', newCategory: 'done' }));
  s = state(s, setUpdateCategoryM(true));
  expect(s.categoryName).toEqual({ oldCategory: 'to-do', newCategory: 'done' });
  expect(s.updateCategoryM).toBe(true);
});
test('FE-STATE-02 retains the added board email for confirmation', () => {
  expect(state(undefined, setBoardEmail('member@example.com')).boardEmail).toBe('member@example.com');
});
