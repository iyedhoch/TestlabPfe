import axios from "axios";
import { store } from "@/app/store";
import { signOut } from "@/app/slices/authSlice";

let isRedirectingToSignIn = false;

export const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = store.getState().rootReducer.authReducer.token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const currentPath = window.location.pathname;

    if (status === 401 && currentPath !== "/sign-in" && !isRedirectingToSignIn) {
      isRedirectingToSignIn = true;
      store.dispatch(signOut());

      // Clear persisted auth immediately to prevent stale rehydration loops after reload.
      localStorage.removeItem("persist:auth");

      window.location.replace("/sign-in");
    }

    return Promise.reject(error);
  }
);
