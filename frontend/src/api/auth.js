import apiClient from './client';

export function login(credentials) {
  return apiClient.post('/auth/login', credentials);
}

export function register(payload) {
  return apiClient.post('/auth/register', payload);
}

