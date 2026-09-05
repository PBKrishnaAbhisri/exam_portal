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
export const updateProfile = (data) => API.patch('/auth/profile', data);
export const resetStudentPassword = (data) => API.post('/auth/student/reset-password', data);
export const changePassword = (data) => API.post('/auth/change-password', data);
export const sendForgotPasswordOTP = (data) => API.post('/auth/forgot-password/send-otp', data);
export const resetPasswordWithOTP = (data) => API.post('/auth/forgot-password/reset', data);

export const createExam = (data) => API.post('/exams', data);
export const updateExam = (id, data) => API.put(`/exams/${id}`, data);
export const deleteExam = (id) => API.delete(`/exams/${id}`);
export const getAllExamsAdmin = () => API.get('/exams/admin/all');
export const getExamAdmin = (id) => API.get(`/exams/admin/${id}`);
export const togglePublishResults = (id, force = false) =>
  API.patch(`/exams/${id}/publish${force ? '?force=true' : ''}`);

const API_BASE = 'http://localhost:5000/api';

/**
 * notifyStudentsExam — streams SSE progress events.
 * @param {string} id - exam ID
 * @param {function} onProgress - called with {sent, failed, total} after each email
 * @returns {Promise<{sentCount, total, done, reason}>} final summary
 */
export const notifyStudentsExam = async (id, onProgress) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/exams/${id}/notify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE lines look like: "data: {...}\n\n"
    const lines = buffer.split('\n\n');
    buffer = lines.pop(); // last incomplete chunk stays in buffer

    for (const line of lines) {
      const jsonStr = line.replace(/^data:\s*/, '').trim();
      if (!jsonStr) continue;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.done) {
          finalResult = parsed;
        } else if (onProgress) {
          onProgress(parsed);
        }
      } catch (e) { /* ignore malformed chunks */ }
    }
  }

  return finalResult;
};
export const addQuestion = (examId, formData) =>
  API.post(`/exams/${examId}/questions`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateQuestion = (examId, questionId, formData) =>
  API.put(`/exams/${examId}/questions/${questionId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteQuestion = (examId, questionId) =>
  API.delete(`/exams/${examId}/questions/${questionId}`);

export const addSection = (examId, data) => API.post(`/exams/${examId}/sections`, data);
export const updateSection = (examId, sectionId, data) => API.put(`/exams/${examId}/sections/${sectionId}`, data);
export const deleteSection = (examId, sectionId) => API.delete(`/exams/${examId}/sections/${sectionId}`);

export const getDomains = (branch) => {
  const params = {};
  if (branch) {
    if (Array.isArray(branch)) {
      params.branches = branch.join(',');
    } else if (typeof branch === 'string' && branch.includes(',')) {
      params.branches = branch;
    } else {
      params.branch = branch;
    }
  }
  return API.get('/exams/domains', { params });
};
export const getQuestionBank = () => API.get('/exams/bank/questions');
export const getQuestionBankExam = (examId) => API.get(`/exams/bank/questions?examId=${examId}`);

export const getEligibleExams = () => API.get('/exams/student/eligible');
export const getExamStudent = (id) => API.get(`/exams/student/${id}`);

export const startExam = (examId) => API.post(`/submissions/start/${examId}`);
export const nextSection = (submissionId, timeRemaining) =>
  API.patch(`/submissions/${submissionId}/next-section`, { timeRemaining });
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
export const getMyAllResults = () => API.get('/submissions/my-results');
export const heartbeatExam = (submissionId) => API.patch(`/submissions/${submissionId}/heartbeat`);

export const getExamSubmissions = (examId) => API.get(`/submissions/admin/exam/${examId}`);
export const getLiveSubmissions = () => API.get('/submissions/admin/live');
export const adminUnlockStudent = (submissionId) => API.post(`/submissions/admin/unlock/${submissionId}`);
export const getReviewQueue = () => API.get('/submissions/admin/review-queue');
export const resolveReview = (submissionId, questionId, data) =>
  API.put(`/submissions/admin/review/${submissionId}/${questionId}`, data);

export const getAnalytics = (examId, params = {}) => API.get(`/admin/analytics/${examId}`, { params });
export const getAllStudents = (params = {}) => API.get('/admin/students', { params });
export const getStudentAdminProfile = (id, params = {}) => API.get(`/admin/students/${id}`, { params });
export const getToppers = (params = {}) => API.get('/admin/toppers', { params });
export const exportPDF = (examId, params = {}) => API.get(`/admin/export/pdf/${examId}`, { params, responseType: 'blob' });
export const exportExcel = (examId, params = {}) => API.get(`/admin/export/excel/${examId}`, { params, responseType: 'blob' });

// Resume
export const uploadResume = (formData) =>
  API.post('/auth/upload-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteResume = () => API.delete('/auth/resume');
export const getStudentResumeDownloadUrl = (studentId) => {
  const token = localStorage.getItem('token');
  return `${API_BASE}/admin/students/${studentId}/resume?token=${token}`;
};

export default API;
