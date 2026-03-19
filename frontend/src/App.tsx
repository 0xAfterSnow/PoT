import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CreateAgreement from './pages/CreateAgreement';
import AgreementDetail from './pages/AgreementDetail';
import Profile from './pages/Profile';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreateAgreement />} />
          <Route path="/agreement/:id" element={<AgreementDetail />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
