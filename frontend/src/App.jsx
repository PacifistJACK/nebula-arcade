import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import GameSelect from './pages/GameSelect';
import AuthPage from './pages/AuthPage';
import Leaderboard from './pages/Leaderboard';
import SupabaseDebug from './pages/SupabaseDebug';

import SnakeGame from './games/SnakeGame';
import BreakerGame from './games/BreakerGame';
import GeoDashGame from './games/GeoDashGame';
import FlappyNeon from './games/FlappyNeon';
import NeonShooter from './games/NeonShooter';
import NeonRacer from './games/NeonRacer';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="games" element={<GameSelect />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="games/snake" element={<SnakeGame />} />
            <Route path="games/breaker" element={<BreakerGame />} />
            <Route path="games/geodash" element={<GeoDashGame />} />
            <Route path="games/flappy" element={<FlappyNeon />} />
            <Route path="games/shooter" element={<NeonShooter />} />
            <Route path="games/racer" element={<NeonRacer />} />
            <Route path="debug" element={<SupabaseDebug />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
