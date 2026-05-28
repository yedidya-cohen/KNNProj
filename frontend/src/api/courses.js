import apiClient from './client';

export function getCourses() {
  return apiClient.get('/courses');
}

export function getCourse(id) {
  return apiClient.get(`/courses/${id}`);
}

export function createCourse(payload) {
  return apiClient.post('/courses', payload);
}

export function updateCourse(id, payload) {
  return apiClient.put(`/courses/${id}`, payload);
}

export function deleteCourse(id) {
  return apiClient.delete(`/courses/${id}`);
}
