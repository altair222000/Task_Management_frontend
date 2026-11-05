import { describe, expect, test, vi, beforeEach } from 'vitest';
import useAddTask from '../../src/hooks/useAddTask';
import useUpdateTask from '../../src/hooks/useUpdateTask';
import useAddToBoard from '../../src/hooks/useAddToBoard';

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const response = data => Promise.resolve({ json: () => Promise.resolve(data) });
const event = () => ({ target: { disabled: false } });

const runAndCheck = async (fn, payload) => {
  const e = event();
  const setLoad = vi.fn();
  const dispatch = vi.fn();
  vi.stubGlobal('fetch', vi.fn(() => response(payload)));
  fn(e, setLoad, dispatch);
  await vi.waitFor(() => expect(setLoad).toHaveBeenCalledWith(''));
  expect(e.target.disabled).toBe(false);
  return { dispatch, setLoad };
};

describe('Creación y edición de tareas', () => {
  beforeEach(() => vi.clearAllMocks());

  test('crear tarea agrega la nueva actividad', async () => {
    const { dispatch } = await runAndCheck(
      (e, setLoad, d) => useAddTask(e, setLoad, 'Nueva', 'high', [], '', '', d),
      { message: 'success', data: { _id: 'a', category: 'to-do' } },
    );
    expect(dispatch).toHaveBeenCalledTimes(3);
  });

  test('crear tarea conserva la información si el servicio la rechaza', async () => {
    const { dispatch } = await runAndCheck(
      (e, setLoad, d) => useAddTask(e, setLoad, 'Nueva', 'high', [], '', '', d),
      { message: 'No autorizado' },
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('crear tarea maneja errores de conexión', async () => {
    const e = event();
    const setLoad = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Sin red'))));
    useAddTask(e, setLoad, 'Nueva', 'high', [], '', '', vi.fn());
    await vi.waitFor(() => expect(setLoad).toHaveBeenCalledWith(''));
    expect(e.target.disabled).toBe(false);
  });

  test.each(['to-do', 'backlog', 'in-progress', 'done'])('editar tarea en %s actualiza su lista', async category => {
    const { dispatch } = await runAndCheck(
      (e, setLoad, d) => useUpdateTask(e, setLoad, 'Editada', 'high', [], '', '', d, 'a'),
      { message: 'success', data: { _id: 'a', category } },
    );
    expect(dispatch).toHaveBeenCalledTimes(3);
  });

  test.each(['to-do', 'backlog', 'in-progress', 'done'])('editar tarea reasignada desde %s ajusta su lista', async category => {
    const { dispatch } = await runAndCheck(
      (e, setLoad, d) => useUpdateTask(e, setLoad, 'Editada', 'high', [], '', '', d, 'a'),
      { message: 'success', data: { _id: 'a', category }, removeAssignCategory: category },
    );
    expect(dispatch).toHaveBeenCalledTimes(3);
  });

  test('editar tarea rechazada no cambia el tablero', async () => {
    const { dispatch } = await runAndCheck(
      (e, setLoad, d) => useUpdateTask(e, setLoad, 'Editada', 'high', [], '', '', d, 'a'),
      { message: 'No autorizado' },
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('editar tarea maneja errores de conexión', async () => {
    const e = event();
    const setLoad = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Sin red'))));
    useUpdateTask(e, setLoad, 'Editada', 'high', [], '', '', vi.fn(), 'a');
    await vi.waitFor(() => expect(setLoad).toHaveBeenCalledWith(''));
    expect(e.target.disabled).toBe(false);
  });
});

describe('Miembros del tablero', () => {
  beforeEach(() => vi.clearAllMocks());

  test('agregar correo válido actualiza el usuario', async () => {
    const { dispatch } = await runAndCheck(
      (e, setLoad, d) => useAddToBoard(e, setLoad, d, 'qa@example.com'),
      { message: 'success', data: { _id: 'u' }, email: 'qa@example.com' },
    );
    expect(dispatch).toHaveBeenCalledTimes(4);
  });

  test('agregar correo rechazado no actualiza el usuario', async () => {
    const { dispatch } = await runAndCheck(
      (e, setLoad, d) => useAddToBoard(e, setLoad, d, 'qa@example.com'),
      { message: 'No autorizado' },
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('agregar correo maneja errores de conexión', async () => {
    const e = event();
    const setLoad = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Sin red'))));
    useAddToBoard(e, setLoad, vi.fn(), 'qa@example.com');
    await vi.waitFor(() => expect(setLoad).toHaveBeenCalledWith(''));
    expect(e.target.disabled).toBe(false);
  });
});
