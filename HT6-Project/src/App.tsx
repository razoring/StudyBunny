import { type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { HomeScreen } from './components/HomeScreen';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { PlanDevelopment } from './components/PlanDevelopment';
import { StudyRoom } from './components/StudyRoom';

type ProtectedRouteProps = {
  children: ReactNode;
  isAuthenticated: boolean;
};

function ProtectedRoute({ children, isAuthenticated }: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-primary)' }}>
        <div className="pixel-panel" style={{ fontFamily: 'var(--font-retro)', fontSize: '2rem' }}>
          Loading secure workspace...
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? '/home' : '/login'} replace />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/home" replace /> : <SignUpPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <HomeScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plan/:documentId"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PlanDevelopment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/study/:documentId"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <StudyRoom />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/home' : '/login'} replace />} />
      </Routes>
    </Router>
  );
}

export default App;

