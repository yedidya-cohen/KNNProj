import apiClient from './client';

export function getCourses() {
  return apiClient.get('/courses');
}

export function createCourse(payload) {
  return apiClient.post('/courses', payload);
}

