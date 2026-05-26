import apiClient from './client';

export function createPrediction(payload) {
  return apiClient.post('/predictions', payload);
}

export function getPredictionHistory() {
  return apiClient.get('/predictions/history');
}

