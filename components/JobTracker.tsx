import React, { useState } from 'react';
import { Plus, Search, MapPin, Building, ChevronRight, Loader2, Briefcase, Filter, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Job, ApplicationStatus } from '../types';
import { analyzeJobDescription } from '../services/jobService';

interface JobTrackerProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
}

const JobTracker: React.FC<JobTrackerProps> = ({ jobs, setJobs }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newJobUrl, setNewJobUrl] = useState('');
  const [newJobText, setNewJobText] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');

  const statusColors = {
    [ApplicationStatus.BOOKMARKED]: 'bg-slate-100 text-slate-700',
    [ApplicationStatus.APPLYING]: 'bg-blue-100 text-blue-700',
    [ApplicationStatus.APPLIED]: 'bg-emerald-100 text-emerald-700',
    [ApplicationStatus.INTERVIEWING]: 'bg-amber-100 text-amber-700',
    [ApplicationStatus.NEGOTIATING]: 'bg-purple-100 text-purple-700',
    [ApplicationStatus.ACCEPTED]: 'bg-green-100 text-green-700',
    [ApplicationStatus.REJECTED]: 'bg-red-100 text-red-700',
  };

  const industries = ['All', ...Array.from(new Set(jobs.map(j => j.industry).filter(Boolean)))];

  const filteredJobs = jobs.filter(job => {
    if (selectedIndustry === 'All') return true;
    return job.industry === selectedIndustry;
  });

  const handleAddJob = async () => {
    if (!newJobText && !newJobUrl) return;

    setIsAnalyzing(true);
    try {
      // 1. Analyze description first
      const analysis = await analyzeJobDescription(newJobText, newJobUrl);
      
      // 2. Create Job Object
      const newJob: Job = {
        id: Date.now().toString(),
        title: 'New Opportunity', // analysis often misses exact title if not explicit, can edit later
        company: 'Unknown Company',
        url: newJobUrl,
        description: newJobText,
        status: ApplicationStatus.BOOKMARKED,
        structuredData: analysis,
        createdAt: Date.now(),
        industry: analysis.industry,
        jobType: analysis.jobType
      };

      // Attempt to refine Title/Company from analysis if available (heuristic)
      // Since our schema doesn't strictly force it, we rely on the structured data extraction
      // or user manual edit. For now, let's keep it simple.
      
      setJobs(prev => [newJob, ...prev]);
      setIsAdding(false);
      setNewJobUrl('');
      setNewJobText('');
      setSelectedIndustry('All'); // Reset filter to show new job
    } catch (error) {
      alert('Failed to analyze job. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Applications</h1>
          <p className="text-slate-500 mt-2">Track and optimize your job search.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Job
        </button>
      </div>

      {/* Categories Filter */}
      {industries.length > 1 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <Filter className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
          {industries.map((industry) => (
             <button
               key={industry as string}
               onClick={() => setSelectedIndustry(industry as string)}
               className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                 selectedIndustry === industry 
                 ? 'bg-slate-800 text-white border-slate-800' 
                 : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
               }`}
             >
               {industry as string}
             </button>
          ))}
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-lg mb-8 animate-in slide-in-from-top-4">
           <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Opportunity</h3>
           <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Link (Optional)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="url" 
                    className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="https://linkedin.com/jobs/..."
                    value={newJobUrl}
                    onChange={(e) => setNewJobUrl(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Description</label>
                <textarea 
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none min-h-[150px]"
                  placeholder="Paste the full job description here..."
                  value={newJobText}
                  onChange={(e) => setNewJobText(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddJob}
                  disabled={isAnalyzing || (!newJobText && !newJobUrl)}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center"
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isAnalyzing ? 'Analyzing...' : 'Add & Analyze'}
                </button>
              </div>
           </div>
        </div>
      )}

      <div className="grid gap-4">
        {jobs.length === 0 && !isAdding && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
            <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No applications tracked yet.</p>
          </div>
        )}

        {jobs.length > 0 && filteredJobs.length === 0 && (
           <div className="text-center py-12">
              <p className="text-slate-500">No jobs found in this category.</p>
           </div>
        )}
        
        {filteredJobs.map((job) => (
          <Link 
            key={job.id} 
            to={`/jobs/${job.id}`}
            className="block bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
          >
             <div className="flex justify-between items-start">
               <div>
                  <div className="flex items-center space-x-3 mb-1">
                     <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                       {job.title}
                     </h3>
                     <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status]}`}>
                       {job.status}
                     </span>
                  </div>
                  <div className="flex items-center text-slate-500 text-sm mb-3">
                    <Building className="w-4 h-4 mr-1.5" />
                    {job.company}
                    {job.structuredData?.seniority && (
                       <>
                        <span className="mx-2">•</span>
                        <span>{job.structuredData.seniority}</span>
                       </>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 mb-4">
                     {job.industry && (
                        <span className="flex items-center text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                           <Globe className="w-3 h-3 mr-1 text-slate-400" /> {job.industry}
                        </span>
                     )}
                     {job.jobType && (
                        <span className="flex items-center text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                           <Briefcase className="w-3 h-3 mr-1 text-slate-400" /> {job.jobType}
                        </span>
                     )}
                  </div>
                  
                  {job.structuredData && (
                    <div className="flex flex-wrap gap-2">
                       {job.structuredData.skills.slice(0, 4).map((s, i) => (
                         <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                           {s}
                         </span>
                       ))}
                    </div>
                  )}
               </div>
               
               <div className="flex flex-col items-end space-y-2">
                 <div className="p-2 bg-slate-50 rounded-full group-hover:bg-emerald-50 transition-colors">
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                 </div>
                 {job.fitAnalysis && (
                   <div className="text-right">
                      <span className="text-2xl font-bold text-emerald-600">{job.fitAnalysis.score}%</span>
                      <p className="text-xs text-slate-400">Match</p>
                   </div>
                 )}
               </div>
             </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default JobTracker;