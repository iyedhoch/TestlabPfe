import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

export type UserRole = "ADMIN" | "QA" | "BA";

interface IAuthSlice {
  isAuthenticated: boolean;
  username: string;
  userId: string;
  role: UserRole | null;
  token: string;
}

const initialState: IAuthSlice = {
  isAuthenticated: false,
  username: "",
  userId: "",
  role: null,
  token: "",
};

export const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    setIsAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload.isAuthenticated;
    },
    signIn: (state, action) => {
      state.isAuthenticated = true;
      state.username = action.payload?.username || state.username;
      state.userId = action.payload?.userId || state.userId;
      state.role = action.payload?.role || state.role;
      state.token = action.payload?.token || state.token;
    },
    signOut: (state) => {
      state.isAuthenticated = false;
      state.username = "";
      state.userId = "";
      state.role = null;
      state.token = "";
    },
  },
});

export const isAuthenticatedSelector = (state: RootState) =>
  state.rootReducer.authReducer.isAuthenticated;

export const authUsernameSelector = (state: RootState) =>
  state.rootReducer.authReducer.username;

export const authTokenSelector = (state: RootState) =>
  state.rootReducer.authReducer.token;

export const authRoleSelector = (state: RootState) =>
  state.rootReducer.authReducer.role;

export const authUserIdSelector = (state: RootState) =>
  state.rootReducer.authReducer.userId;

export const { setIsAuthenticated, signIn, signOut } = authSlice.actions;
export const authReducer = authSlice.reducer;
