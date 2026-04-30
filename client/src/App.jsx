import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import { useAuth } from "./context/useAuth";

function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/login"
          element={user ? <Navigate to="/chat" replace /> : <Login />}
        />

        <Route
          path="/register"
          element={user ? <Navigate to="/chat" replace /> : <Register />}
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
