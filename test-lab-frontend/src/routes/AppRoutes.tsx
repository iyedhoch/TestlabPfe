import { Suspense } from "react";
import { useSelector } from "react-redux";
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
  DocumentGenerationListPage,
  CahierCreationPage,
  SignInPage,
  FsdCreationPage,
  DocumentPreviewPage,
} from "@/pages";
import { Container } from "@/layout";
import PrivateRoutes from "./PrivateRoutes";
import { isAuthenticatedSelector } from "@/app/slices/authSlice";

export default function AppRoutes() {
  const isAuthenticated = useSelector(isAuthenticatedSelector);

  return (
    <Suspense>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route element={<PrivateRoutes />}>
          <Route path="/" element={<Container />}>
            <Route
              path="/"
              element={
                <Navigate
                  to={isAuthenticated ? "/dashboard" : "/sign-in"}
                  replace
                />
              }
            />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/project-mangement"
              element={<ProjectManagementPage />}
            />
            <Route path="/specs-mangement">
              <Route path="stories" element={<UserStoryCreationPage />} />
            </Route>
            <Route
              path="/document-generation/Metadonnees-et-details/fsd"
              element={<FsdCreationPage />}
            />
            <Route
              path="/document-generation/Metadonnees-et-details/cahier"
              element={<CahierCreationPage />}
            />
            <Route
              path="/document-generation/Metadonnees-et-details"
              element={
                <Navigate
                  to="/document-generation/Metadonnees-et-details/fsd"
                  replace
                />
              }
            />
            <Route
              path="/document-generation/Aperçu-et-modification"
              element={<DocumentPreviewPage />}
            />
            <Route path="/test-generation" element={<TestGenerationPage />} />
            <Route path="/estimation" element={<EstimationPage />} />
            <Route path="/test-link-mcp" element={<TestLinkPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/environment" element={<EnvironmentPage />} />
            <Route
              path="/document-generation"
              element={<DocumentGenerationListPage />}
            />
            <Route
              path="/document-generation/Selection-du-contenu"
              element={<DocumentGenerationPage />}
            />
            <Route
              path="/document-generation/new"
              element={<Navigate to="/document-generation/Selection-du-contenu" replace />}
            />
            <Route
              path="/fsd-creation"
              element={<Navigate to="/document-generation/Metadonnees-et-details/fsd" replace />}
            />
            <Route
              path="/cahier-creation"
              element={<Navigate to="/document-generation/Metadonnees-et-details/cahier" replace />}
            />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route
              path="/*"
              element={
                <Navigate
                  to={isAuthenticated ? "/dashboard" : "/sign-in"}
                  replace
                />
              }
            />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
