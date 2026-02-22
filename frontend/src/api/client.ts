
/**
 * api/client.ts
 * This file sets up an Axios instance for making API calls to the backend server.
 * The baseURL is configured to point to the local development server at http://localhost:8000.
 * Request interceptor attaches JWT token from localStorage to all requests.
 * Response interceptor handles 401 errors by redirecting to login page.
 */

/// <reference types="vite/client" />
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
    baseURL : baseURL,
});

// Request interceptor: attach JWT token to all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor: handle 401 (Unauthorized) by redirecting to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear auth data and redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);