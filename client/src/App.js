import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import EditorPage from './components/EditorPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/editor/:roomId" element={<EditorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
