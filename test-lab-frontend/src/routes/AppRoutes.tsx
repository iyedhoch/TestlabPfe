import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  AutomationPage,
  DashboardPage,
  ProjectManagementPage,
  UserStoryCreationPage,
  StatisticsPage,
  TestGenerationPage,
  EstimationPage,
  TestLinkPage,
  TrainingPage,
  EnvironmentPage,
  DocumentGenerationPage,
  SignInPage,
} from "@/pages";
import { Container } from "@/layout";
import PrivateRoutes from "./PrivateRoutes";

export default function AppRoutes() {
  return (
    <Suspense>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route element={<PrivateRoutes />}>
          <Route path="/" element={<Container />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/project-mangement"
              element={<ProjectManagementPage />}
            />
            <Route path="/specs-mangement">
              <Route path="stories" element={<UserStoryCreationPage />} />
            </Route>
            <Route path="/test-generation" element={<TestGenerationPage />} />
            <Route path="/estimation" element={<EstimationPage />} />
            <Route path="/test-link-mcp" element={<TestLinkPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/environment" element={<EnvironmentPage />} />
            <Route
              path="/document-generation"
              element={<DocumentGenerationPage />}
            />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
