import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Vault from './components/Vault';
import JobTracker from './components/JobTracker';
import JobDetail from './components/JobDetail';
import ChatBot from './components/ChatBot';
import Settings from './components/Settings';
import { Experience, Job } from './types';
import { usePersistentData } from './hooks';

const App: React.FC = () => {
  // Global State for Core Data - Synced with Supabase tables 'experiences' and 'jobs'
  const [experiences, setExperiences] = usePersistentData<Experience>('career_experiences', []);
  const [jobs, setJobs] = usePersistentData<Job>('career_jobs', []);

  // Check API Key
  if (!process.env.API_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h2>
          <p className="text-slate-600">
            The <code>API_KEY</code> environment variable is missing. This application requires a valid Google Gemini API key to function.
          </p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/vault" replace />} />
          
          <Route 
            path="/vault" 
            element={
              <Vault 
                experiences={experiences} 
                setExperiences={setExperiences} 
              />
            } 
          />
          
          <Route 
            path="/jobs" 
            element={
              <JobTracker 
                jobs={jobs} 
                setJobs={setJobs} 
              />
            } 
          />
          
          <Route 
            path="/jobs/:id" 
            element={
              <JobDetail 
                jobs={jobs} 
                setJobs={setJobs} 
                experiences={experiences}
              />
            } 
          />
          
          <Route path="/chat" element={<ChatBot />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;