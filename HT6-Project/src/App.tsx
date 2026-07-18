import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomeScreen } from './components/HomeScreen';
import { PlanDevelopment } from './components/PlanDevelopment';
import { StudyRoom } from './components/StudyRoom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/plan/:documentId" element={<PlanDevelopment />} />
        <Route path="/study/:documentId" element={<StudyRoom />} />
      </Routes>
    </Router>
  );
}

export default App;

