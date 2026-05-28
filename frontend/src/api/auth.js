import apiClient from './client';

export function login({ username, password }) {
  // OAuth2 requires application/x-www-form-urlencoded
  return apiClient.post('/auth/login', new URLSearchParams({ username, password }));
}

export function register(payload) {
  return apiClient.post('/auth/register', payload);
}

export function getMe() {
  return apiClient.get('/auth/me');
}
