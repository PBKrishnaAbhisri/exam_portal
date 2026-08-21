import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login on true token invalidation (not during unlock or login)
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/unlock') &&
      !error.config?.url?.includes('/login')
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const loginUser = (data) => API.post('/auth/login', data);
export const signupStudent = (data) => API.post('/auth/signup/student', data);
export const signupAdmin = (data) => API.post('/auth/signup/admin', data);
export const getMe = () => API.get('/auth/me');

export const createExam = (data) => API.post('/exams', data);
export const updateExam = (id, data) => API.put(`/exams/${id}`, data);
export const deleteExam = (id) => API.delete(`/exams/${id}`);
export const getAllExamsAdmin = () => API.get('/exams/admin/all');
export const getExamAdmin = (id) => API.get(`/exams/admin/${id}`);
export const togglePublishResults = (id) => API.patch(`/exams/${id}/publish`);
export const addQuestion = (examId, formData) =>
  API.post(`/exams/${examId}/questions`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateQuestion = (examId, questionId, formData) =>
  API.put(`/exams/${examId}/questions/${questionId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteQuestion = (examId, questionId) =>
  API.delete(`/exams/${examId}/questions/${questionId}`);
export const getQuestionBank = () => API.get('/exams/bank/questions');
export const getQuestionBankExam = (examId) => API.get(`/exams/bank/questions?examId=${examId}`);

export const getEligibleExams = () => API.get('/exams/student/eligible');
export const getExamStudent = (id) => API.get(`/exams/student/${id}`);

export const startExam = (examId) => API.post(`/submissions/start/${examId}`);
export const saveAnswers = (submissionId, answers) =>
  API.put(`/submissions/${submissionId}/answers`, { answers });
export const logViolation = (submissionId, data) =>
  API.post(`/submissions/${submissionId}/violations`, data);
export const unlockExam = (submissionId, unlockCode) =>
  API.post(`/submissions/${submissionId}/unlock`, { unlockCode });
export const submitExam = (submissionId, autoSubmit = false) =>
  API.post(`/submissions/${submissionId}/submit`, { autoSubmit });
export const getMySubmission = (examId) => API.get(`/submissions/my/${examId}`);
export const getMyResult = (examId) => API.get(`/submissions/result/${examId}`);

export const getExamSubmissions = (examId) => API.get(`/submissions/admin/exam/${examId}`);
export const getLiveSubmissions = () => API.get('/submissions/admin/live');
export const getReviewQueue = () => API.get('/submissions/admin/review-queue');
export const resolveReview = (submissionId, questionId, data) =>
  API.put(`/submissions/admin/review/${submissionId}/${questionId}`, data);

export const getAnalytics = (examId) => API.get(`/admin/analytics/${examId}`);
export const getAllStudents = () => API.get('/admin/students');
export const exportPDF = (examId) => API.get(`/admin/export/pdf/${examId}`, { responseType: 'blob' });
export const exportExcel = (examId) => API.get(`/admin/export/excel/${examId}`, { responseType: 'blob' });

export default API;
