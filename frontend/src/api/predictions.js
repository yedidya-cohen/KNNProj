import apiClient from './client';

export function createPrediction(payload) {
  return apiClient.post('/predictions', payload);
}

export function runPrediction(payload) {
  return apiClient.post('/predictions/predict', payload);
}

export function getTopRecommendations() {
  return apiClient.get('/predictions/recommend-top');
}

export function getPredictionHistory() {
  return apiClient.get('/predictions/history');
}

export function getMyPredictionHistory() {
  return apiClient.get('/predictions/my-history');
}

export function getPrediction(id) {
  return apiClient.get(`/predictions/${id}`);
}
