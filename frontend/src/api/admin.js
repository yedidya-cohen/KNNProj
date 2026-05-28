import apiClient from './client';

export function getAdminStats() {
  return apiClient.get('/admin/stats');
}

export function getDashboard() {
  return apiClient.get('/admin/dashboard');
}

export function getModelStats() {
  return apiClient.get('/admin/model-stats');
}

export function getKnnK() {
  return apiClient.get('/admin/settings/knn_k');
}

export function updateKnnK(payload) {
  return apiClient.put('/admin/settings/knn_k', payload);
}

export function runSeed() {
  return apiClient.post('/admin/seed');
}

export function getUsers() {
  return apiClient.get('/admin/users');
}

export function getHistoricalStudents() {
  return apiClient.get('/admin/historical-students');
}

export function createHistoricalStudent(payload) {
  return apiClient.post('/admin/historical-students', payload);
}

export function getHistoricalData(params) {
  return apiClient.get('/admin/historical-data', { params });
}

export function uploadHistoricalData(payload) {
  return apiClient.post('/admin/historical-data', payload);
}

export function deleteHistoricalRecord(id) {
  return apiClient.delete(`/admin/historical-data/${id}`);
}
