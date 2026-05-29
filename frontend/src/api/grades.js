import apiClient from './client';

export function getGrades() {
  return apiClient.get('/grades');
}

export function getMyGrades() {
  return apiClient.get('/grades/my');
}

export function createGrade(payload) {
  return apiClient.post('/grades', payload);
}

export function bulkSaveGrades(payload) {
  return apiClient.post('/grades/bulk', payload);
}

export function deleteGrade(id) {
  return apiClient.delete(`/grades/${id}`);
}
