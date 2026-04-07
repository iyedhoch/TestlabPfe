import { combineReducers } from "redux";
import { projectReducer } from "./slices/projectSlice";
import { testGenerationReducer } from "./slices/testGenerationSlice";

import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { authReducer } from "./slices/authSlice";

const projectPersistConfig = {
  key: "project",
  storage,
  whitelist: ["selectedProject"],
};

const persistedProjectReducer = persistReducer(
  projectPersistConfig,
  projectReducer
);

const authPersistConfig = {
  key: "auth",
  storage,
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

export const rootReducer = combineReducers({
  projectReducer: persistedProjectReducer,
  authReducer: persistedAuthReducer,
  testGenerationReducer,
});
