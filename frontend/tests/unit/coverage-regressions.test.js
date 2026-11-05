import { describe, expect, test, vi, beforeEach } from 'vitest';
import authReducer, { addAuth, removeAuth } from '../../src/redux/slices/authSlice';
import taskReducer, * as taskActions from '../../src/redux/slices/taskSlice';
import stateReducer, * as stateActions from '../../src/redux/slices/stateSlice';
import getHeader from '../../src/utils/header';
import { checkValidEmail, checkValidSignInFrom, checkValidSignUpFrom } from '../../src/utils/validate';
import useDeleteTask from '../../src/hooks/useDeleteTask';
import useUpdateCategory from '../../src/hooks/useUpdateCategory';
import useAllTaskFilter from '../../src/hooks/useAllTaskFilter';

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Prueba los cambios de estado y las respuestas del servidor.
describe('Estados y validaciones del frontend', () => {
  test('la sesión se guarda y se elimina', () => {
    expect(authReducer(undefined, { type: 'init' })).toBeNull();
    expect(authReducer(null, addAuth({ email: 'qa@example.com' }))).toEqual({ email: 'qa@example.com' });
    expect(authReducer({ email: 'qa@example.com' }, removeAuth())).toBeNull();
  });

  test('los encabezados incluyen el token actual', () => {
    localStorage.setItem('token', 'prueba-token');
    expect(getHeader()).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer prueba-token',
    });
  });

  test('se validan correos y contraseñas', () => {
    expect(checkValidEmail('correo-incorrecto')).toBe('Invalid email format');
    expect(checkValidEmail('qa@example.com')).toBeNull();
    expect(checkValidSignInFrom('mal', '123')).toBe('Invalid email format');
    expect(checkValidSignInFrom('qa@example.com', '123')).toBe('Invalid password');
    expect(checkValidSignInFrom('qa@example.com', 'Prueba123!')).toBeNull();
    expect(checkValidSignUpFrom('Carlos Lopez', 'qa@example.com', 'Prueba123!')).toBeNull();
    expect(checkValidSignUpFrom('Carlos Lopez', 'mal', 'Prueba123!')).toBe('Invalid email format');
    expect(checkValidSignUpFrom('Carlos Lopez', 'qa@example.com', 'C1!abc')).toBe('Min 8 characters');
    expect(checkValidSignUpFrom('Carlos Lopez', 'qa@example.com', 'PRUEBA123!')).toBe('Needs 1 lowercase letter');
    expect(checkValidSignUpFrom('Carlos Lopez', 'qa@example.com', 'prueba123!')).toBe('Needs 1 uppercase lette');
    expect(checkValidSignUpFrom('Carlos Lopez', 'qa@example.com', 'Pruebaabc!')).toBe('Needs 1 number');
    expect(checkValidSignUpFrom('Carlos Lopez', 'qa@example.com', 'Prueba123')).toBe('Needs 1 special char');
  });

  test('las tareas se agregan, actualizan y eliminan en cada columna', () => {
    const cases = [
      ['Backlog', 'backlog'], ['Todo', 'todo'], ['InProgress', 'inProgress'], ['Done', 'done'],
    ];
    for (const [name, key] of cases) {
      let state = taskReducer(undefined, { type: 'init' });
      state = taskReducer(state, taskActions['set' + name]([{ _id: 'a', title: 'Inicial' }]));
      expect(state[key]).toHaveLength(1);
      state = taskReducer(state, taskActions['add' + name + 'Task']({ _id: 'b', title: 'Nueva' }));
      expect(state[key]).toHaveLength(2);
      state = taskReducer(state, taskActions['update' + name + 'Task']({ _id: 'a', title: 'Cambiada' }));
      expect(state[key][0].title).toBe('Cambiada');
      state = taskReducer(state, taskActions['delete' + name + 'Task']({ _id: 'a' }));
      expect(state[key]).toEqual([{ _id: 'b', title: 'Nueva' }]);
    }
  });

  test('los controles de interfaz actualizan su estado', () => {
    const controls = [
      ['updateDashboardSection', 'dashboardSection', 'analytics'],
      ['setLoading', 'loading', true],
      ['setAddPeopleM', 'addPeopleM', true],
      ['setAddedPeopleM', 'addedPeopleM', true],
      ['setLogoutM', 'logoutM', true],
      ['setTaskDeleteM', 'taskDeleteM', true],
      ['setTaskCardM', 'taskCardM', true],
      ['setTaskFilterP', 'taskFilterP', true],
      ['setTaskFilterName', 'taskFilterName', 'Last week'],
      ['setTaskMId', 'taskMId', 'id1'],
      ['setTaskM', 'taskM', { _id: 'id1' }],
      ['setBoardEmail', 'boardEmail', 'qa@example.com'],
      ['setUpdateCategoryM', 'updateCategoryM', true],
      ['setCategoryName', 'categoryName', 'done'],
    ];
    for (const [action, key, value] of controls) {
      const next = stateReducer(undefined, stateActions[action](value));
      expect(next[key]).toEqual(value);
    }
  });
});

const mockResponse = value => Promise.resolve({ json: () => Promise.resolve(value) });

describe('Operaciones de tareas', () => {
  beforeEach(() => vi.clearAllMocks());

  test.each(['to-do', 'backlog', 'in-progress', 'done'])('eliminar tarea de %s actualiza el tablero', async category => {
    const setLoad = vi.fn();
    const dispatch = vi.fn();
    const e = { target: { disabled: false } };
    vi.stubGlobal('fetch', vi.fn(() => mockResponse({ message: 'success', data: { _id: 'a', category } })));
    useDeleteTask(e, setLoad, dispatch, 'a');
    await vi.waitFor(() => expect(setLoad).toHaveBeenCalledWith(''));
    expect(e.target.disabled).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  test('la eliminación rechazada muestra aviso', async () => {
    const setLoad = vi.fn();
    const dispatch = vi.fn();
    const e = { target: { disabled: false } };
    vi.stubGlobal('fetch', vi.fn(() => mockResponse({ message: 'No autorizado' })));
    useDeleteTask(e, setLoad, dispatch, 'a');
    await vi.waitFor(() => expect(setLoad).toHaveBeenCalledWith(''));
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('la eliminación maneja errores de red', async () => {
    const setLoad = vi.fn();
    const e = { target: { disabled: false } };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Sin red'))));
    useDeleteTask(e, setLoad, vi.fn(), 'a');
    await vi.waitFor(() => expect(setLoad).toHaveBeenCalledWith(''));
    expect(e.target.disabled).toBe(false);
  });

  test.each(['to-do', 'backlog', 'in-progress', 'done'])('cambiar estado desde %s mantiene la lista coherente', async oldCategory => {
    const setLoad = vi.fn();
    const dispatch = vi.fn();
    const e = { target: { disabled: false } };
    vi.stubGlobal('fetch', vi.fn(() => mockResponse({ message: 'success', data: { _id: 'a', category: oldCategory } })));
    useUpdateCategory(e, setLoad, dispatch, 'a', oldCategory, oldCategory);
    await vi.waitFor(() => expect(setLoad).toHaveBeenCalledWith(''));
    expect(e.target.disabled).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(4);
  });

  test('cambiar estado muestra errores del servidor', async () => {
    const setLoad = vi.fn();
    const e = { target: { disabled: false } };
    vi.stubGlobal('fetch', vi.fn(() => mockResponse({ message: 'Error de acceso' })));
    useUpdateCategory(e, setLoad, vi.fn(), 'a', 'done', 'to-do');
    await vi.waitFor(() => expect(setLoad).toHaveBeenCalledWith(''));
    expect(e.target.disabled).toBe(false);
  });

  test('cambiar estado controla fallos de conexión', async () => {
    const setLoad = vi.fn();
    const e = { target: { disabled: false } };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Sin red'))));
    useUpdateCategory(e, setLoad, vi.fn(), 'a', 'done', 'to-do');
    await vi.waitFor(() => expect(setLoad).toHaveBeenCalledWith(''));
    expect(e.target.disabled).toBe(false);
  });

  test('la consulta filtrada actualiza las cuatro listas', async () => {
    const dispatch = vi.fn();
    vi.stubGlobal('fetch', vi.fn(() => mockResponse({
      message: 'success', data: { backlog: [], todo: [], inProgress: [], done: [] },
    })));
    useAllTaskFilter(dispatch, 30);
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(6));
  });

  test('la consulta filtrada maneja respuestas sin éxito', async () => {
    const dispatch = vi.fn();
    vi.stubGlobal('fetch', vi.fn(() => mockResponse({ message: 'error' })));
    useAllTaskFilter(dispatch, 30);
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(2));
  });

  test('la consulta filtrada maneja fallos de red', async () => {
    const dispatch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Sin red'))));
    useAllTaskFilter(dispatch, 30);
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(2));
  });
});
