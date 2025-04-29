import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './signin';
import Signup from './signup';

import Dashboard from './dashboard';
import ProtectedRoute from './protectedroute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected Route Example */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes to /dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
