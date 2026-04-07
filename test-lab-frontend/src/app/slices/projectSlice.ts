import { IProject } from "@/services";
import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

interface IProjectSlice {
  selectedProject: IProject | null;
}

const initialState: IProjectSlice = {
  selectedProject: null,
};

export const projectSlice = createSlice({
  name: "projectSlice",
  initialState,
  reducers: {
    setSelectedProject: (state, action) => {
      state.selectedProject = action.payload.selectedProject;
    },
  },
});

export const selectedProjectSelector = (state: RootState) =>
  state.rootReducer.projectReducer.selectedProject;

export const { setSelectedProject } = projectSlice.actions;
export const projectReducer = projectSlice.reducer;
