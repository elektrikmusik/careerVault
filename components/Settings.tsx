import React, { useState, useEffect } from 'react';
import { Save, Database, Trash2, CheckCircle2, AlertCircle, Shield, Terminal, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { isSupabaseConfigured, isSupabaseFromEnv, updateSupabaseConfig, clearSupabaseConfig } from '../services/supabase';

const SETUP_SQL = `-- Run this in your Supabase SQL Editor to setup the database

-- 1. Create Tables
create table if not exists experiences (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists jobs (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists messages (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 2. Enable Row Level Security (RLS)
alter table experiences enable row level security;
alter table jobs enable row level security;
alter table messages enable row level security;

-- 3. Create Public Access Policies
-- We allow public access because this app manages authentication via the API Key/Settings page
-- locally and doesn't use Supabase Auth users.
create policy "Public Access Experiences" on experiences for all using (true) with check (true);
create policy "Public Access Jobs" on jobs for all using (true) with check (true);
create policy "Public Access Messages" on messages for all using (true) with check (true);
`;

const Settings: React.FC = () => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isEnvManaged, setIsEnvManaged] = useState(false);
  
  // SQL Display State
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsConnected(isSupabaseConfigured());
    setIsEnvManaged(isSupabaseFromEnv());
    
    // Load current local values if available
    if (!isSupabaseFromEnv()) {
        const localUrl = window.localStorage.getItem('careerflow_sb_url');
        const localKey = window.localStorage.getItem('careerflow_sb_key');
        if (localUrl) setUrl(localUrl);
        if (localKey) setKey(localKey);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) {
        updateSupabaseConfig(url, key);
    }
  };

  const handleDisconnect = () => {
      if (confirm('Are you sure? This will disconnect Supabase and revert to local storage.')) {
          clearSupabaseConfig();
      }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-2">Configure your cloud storage connection.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
           <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isConnected ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                 <Database className={`w-6 h-6 ${isConnected ? 'text-emerald-600' : 'text-slate-500'}`} />
              </div>
              <div>
                 <h2 className="font-bold text-slate-900">Supabase Connection</h2>
                 <p className="text-sm text-slate-500">
                    {isConnected ? 'Connected to cloud database' : 'Using browser local storage'}
                 </p>
              </div>
           </div>
           {isConnected && (
               <div className="flex items-center text-emerald-600 text-sm font-medium bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                   <CheckCircle2 className="w-4 h-4 mr-1.5" />
                   Active
               </div>
           )}
        </div>
        
        <div className="p-6">
            {isEnvManaged ? (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="text-blue-900 font-medium text-sm">Managed by Environment</h3>
                        <p className="text-blue-700 text-sm mt-1">
                            Your configuration is managed via environment variables (<code>.env</code>). To change settings, update your deployment configuration.
                        </p>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSave} className="space-y-4">
                    {!isConnected && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-start mb-6">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <h3 className="text-amber-900 font-medium text-sm">Configuration Required</h3>
                                <p className="text-amber-700 text-sm mt-1">
                                    To sync your data across devices, enter your Supabase Project URL and Anon Key below. 
                                    If left blank, data will only be saved to this browser.
                                </p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
                        <input 
                            type="url"
                            required
                            placeholder="https://your-project.supabase.co"
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Anon API Key</label>
                        <input 
                            type="password"
                            required
                            placeholder="eyJh..."
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 font-mono text-sm"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">Find this in Supabase Dashboard → Project Settings → API</p>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                        {isConnected ? (
                            <button 
                                type="button"
                                onClick={handleDisconnect}
                                className="flex items-center text-red-600 hover:text-red-700 text-sm font-medium px-4 py-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Disconnect & Clear
                            </button>
                        ) : (
                            <div></div>
                        )}
                        
                        <button 
                            type="submit"
                            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 shadow-sm flex items-center font-medium"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isConnected ? 'Update Configuration' : 'Connect Supabase'}
                        </button>
                    </div>
                </form>
            )}
        </div>
      </div>

      {/* SQL Helper Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setShowSql(!showSql)}
          className="w-full p-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                 <Terminal className="w-5 h-5 text-slate-600" />
             </div>
             <div className="text-left">
                <h2 className="font-bold text-slate-900">Database Setup</h2>
                <p className="text-sm text-slate-500">SQL script to initialize your tables</p>
             </div>
          </div>
          {showSql ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>
        
        {showSql && (
          <div className="p-0 border-t border-slate-200 relative group">
             <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={handleCopySql}
                  className="flex items-center text-xs font-medium bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors shadow-lg"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3 mr-1.5 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1.5" />}
                  {copied ? 'Copied!' : 'Copy SQL'}
                </button>
             </div>
             <pre className="p-6 bg-slate-900 text-slate-300 text-sm overflow-x-auto font-mono leading-relaxed">
               {SETUP_SQL}
             </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;