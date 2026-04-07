import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

interface IAuthSlice {
  isAuthenticated: boolean;
}

const initialState: IAuthSlice = {
  isAuthenticated: false,
};

export const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    setIsAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload.isAuthenticated;
    },
    signIn: (state) => {
      state.isAuthenticated = true;
    },
    signOut: (state) => {
      state.isAuthenticated = false;
    },
  },
});

export const isAuthenticatedSelector = (state: RootState) =>
  state.rootReducer.authReducer.isAuthenticated;

export const { setIsAuthenticated, signIn, signOut } = authSlice.actions;
export const authReducer = authSlice.reducer;
