import { describe, expect, test } from 'vitest';
import { checkValidSignInFrom, checkValidSignUpFrom, checkValidEmail } from '../../src/utils/validate';
import getHeader from '../../src/utils/header';

describe('authentication and member input validation', () => {
  test('FE-VALID-01 accepts a valid login', () => {
    expect(checkValidSignInFrom('qa@example.com', 'Test123!')).toBeNull();
  });
  test('FE-VALID-02 rejects malformed login email', () => {
    expect(checkValidSignInFrom('qa.example.com', 'Test123!')).toBe('Invalid email format');
  });
  test('FE-VALID-03 rejects a weak login password', () => {
    expect(checkValidSignInFrom('qa@example.com', 'weak')).toBe('Invalid password');
  });
  test.each([
    ['FE-VALID-04', 'Luis Colindres', 'qa@example.com', 'Test123!', null],
    ['FE-VALID-05', '1234', 'qa@example.com', 'Test123!', 'Invalid name format'],
    ['FE-VALID-06', 'Luis', 'invalid', 'Test123!', 'Invalid email format'],
    ['FE-VALID-07', 'Luis', 'qa@example.com', 'Ab1!', 'Min 8 characters'],
    ['FE-VALID-08', 'Luis', 'qa@example.com', 'ABCDEF1!', 'Needs 1 lowercase letter'],
    ['FE-VALID-09', 'Luis', 'qa@example.com', 'abcdef1!', 'Needs 1 uppercase lette'],
    ['FE-VALID-10', 'Luis', 'qa@example.com', 'Abcdefg!', 'Needs 1 number'],
    ['FE-VALID-11', 'Luis', 'qa@example.com', 'Abcdefg1', 'Needs 1 special char'],
  ])('%s checks the registration contract', (id, name, email, password, expected) => {
    expect(checkValidSignUpFrom(name, email, password)).toBe(expected);
  });
  test('FE-VALID-12 accepts a valid board member email', () => {
    expect(checkValidEmail('member@example.com')).toBeNull();
  });
  test('FE-VALID-13 rejects an invalid board member email', () => {
    expect(checkValidEmail('member@')).toBe('Invalid email format');
  });
  test('FE-HEADER-01 includes the locally stored bearer token', () => {
    localStorage.setItem('token', 'synthetic-token');
    expect(getHeader()).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-token' });
  });
});
