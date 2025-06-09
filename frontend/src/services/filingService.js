import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

export const getFilings = () => axios.get(`${API_URL}/api/filings`);
export const createFiling = (data) => axios.post(`${API_URL}/api/filings`, data);
export const updateFiling = (id, data) => axios.put(`${API_URL}/api/filings/${id}`, data);
export const deleteFiling = (id) => axios.delete(`${API_URL}/api/filings/${id}`);
