import apiClient from './client';

export function getGrades() {
  return apiClient.get('/grades');
}

export function createGrade(payload) {
  return apiClient.post('/grades', payload);
}

