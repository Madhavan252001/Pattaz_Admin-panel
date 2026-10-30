import { BASE_URL } from './api';
import axios from 'axios';

const getHeaders = () => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const request = async (endpoint, options = {}) => {
  try {
    const response = await axios({
      url: `${BASE_URL}${endpoint}`,
      method: options.method || 'GET',
      headers: { ...getHeaders(), ...(options.headers || {}) },
      data: options.body ? JSON.parse(options.body) : options.data,
    });

    return response.data || {};
  } catch (axiosError) {
    const error = new Error(
      axiosError.response?.data?.message
      || axiosError.response?.data?.error
      || axiosError.message
      || 'Request failed'
    );
    error.status = axiosError.response?.status;
    throw error;
  }
};

const requestWithFallback = async (primaryEndpoint, fallbackEndpoint) => {
  try {
    return await request(primaryEndpoint, { method: 'PUT', body: JSON.stringify({}) });
  } catch (error) {
    if (error.status === 404 || error.status === 405) {
      return request(fallbackEndpoint, { method: 'PUT', body: JSON.stringify({}) });
    }
    throw error;
  }
};

const requestWithFallbacks = async (endpoints, data = {}) => {
  let lastError;
  for (const endpoint of endpoints) {
    try {
      return await request(endpoint, { method: 'PUT', body: JSON.stringify(data) });
    } catch (error) {
      lastError = error;
      if (![404, 405].includes(error.status)) throw error;
    }
  }
  throw lastError;
};

export const adminService = {
  getAllAdmins: () => request('/superadmin/admins'),
  createAdmin: (data) => request('/superadmin/admins', { method: 'POST', body: JSON.stringify(data) }),
  getIncompleteAdmins: () => request('/superadmin/admins/incomplete'),
  getDeclinedAdmins: () => request('/superadmin/admins/declined'),
  updateAdmin: (id, data) => request(`/superadmin/admins/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  blockAdmin: (id) => requestWithFallback(`/superadmin/admins/${id}/block`, `/staffs/${id}/block`),
  unblockAdmin: (id) => requestWithFallback(`/superadmin/admins/${id}/unblock`, `/staffs/${id}/unblock`),
  approveAdmin: (id, data = {}) => requestWithFallbacks([`/superadmin/admins/${id}/approve`, `/admins/${id}/approve`], data),
  declineAdmin: (id) => requestWithFallbacks([`/superadmin/admins/${id}/decline`, `/superadmin/admins/${id}/reject`, `/admins/${id}/decline`]),
};
