import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { ITestCase, ITestSuite } from "@/services";

interface ITestGenerationSlice {
  selectedTestCase: ITestCase | null;
  selectedTestSuite: ITestSuite | null;
}

const initialState: ITestGenerationSlice = {
  selectedTestCase: null,
  selectedTestSuite: null,
};

export const testGenerationSlice = createSlice({
  name: "testGenerationSlice",
  initialState,
  reducers: {
    setSelectedTestCase: (state, action) => {
      state.selectedTestCase = action.payload.testCase;
    },
    setSelectedTestSuite: (state, action) => {
      state.selectedTestSuite = action.payload.testSuite;
    },
  },
});

export const selectedTestCaseSelector = (state: RootState) =>
  state.rootReducer.testGenerationReducer.selectedTestCase;
export const selectedTestSuiteSelector = (state: RootState) =>
  state.rootReducer.testGenerationReducer.selectedTestSuite;

export const { setSelectedTestCase, setSelectedTestSuite } =
  testGenerationSlice.actions;
export const testGenerationReducer = testGenerationSlice.reducer;
