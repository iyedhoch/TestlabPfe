import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Templates from './pages/Templates';
import DashboardPage from './pages/dashboard';
import ExportPage from './pages/export';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="app-nav">
          <div className="app-nav__container">
            <h2 className="app-nav__brand">DocGen Back-Office</h2>
            <ul className="app-nav__links">
              <li>
                <NavLink to="/templates" className={({ isActive }) => `app-nav__link ${isActive ? 'active' : ''}`}>
                  📄 Templates
                </NavLink>
              </li>
              <li>
                <NavLink to="/dashboard" className={({ isActive }) => `app-nav__link ${isActive ? 'active' : ''}`}>
                  📊 Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/export" className={({ isActive }) => `app-nav__link ${isActive ? 'active' : ''}`}>
                  📥 Export
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/export" element={<ExportPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
