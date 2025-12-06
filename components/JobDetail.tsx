import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, FileText, Wand2, Loader2, Save, Activity, SearchCheck, List, Globe, Briefcase } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { Job, Experience, FitAnalysisResult, ApplicationStatus } from '../types';
import { calculateFit, generateResume, generateCoverLetter, validateResumeATS } from '../services/matchingService';

interface JobDetailProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  experiences: Experience[];
}

const JobDetail: React.FC<JobDetailProps> = ({ jobs, setJobs, experiences }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const job = jobs.find(j => j.id === id);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isCheckingATS, setIsCheckingATS] = useState(false);
  
  const [editableResume, setEditableResume] = useState('');
  const [editableCover, setEditableCover] = useState('');
  
  // Local state for editing job meta
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobIndustry, setJobIndustry] = useState('');
  const [jobType, setJobType] = useState('');

  // ATS Result
  const [atsResult, setAtsResult] = useState<{ score: number; issues: string[]; suggestions: string[] } | null>(null);

  useEffect(() => {
    if (job) {
      setJobTitle(job.title);
      setJobCompany(job.company);
      setJobIndustry(job.industry || '');
      setJobType(job.jobType || '');
      setEditableResume(job.tailoredResume || '');
      setEditableCover(job.tailoredCoverLetter || '');
    }
  }, [job]);

  if (!job) return <div>Job not found</div>;

  const updateJob = (updates: Partial<Job>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const handleRunFitAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await calculateFit(experiences, job.description);
      updateJob({ fitAnalysis: result });
    } catch (err) {
      alert('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateResume = async () => {
    setIsGeneratingResume(true);
    try {
      const content = await generateResume(experiences, job.description);
      setEditableResume(content);
      updateJob({ tailoredResume: content, status: ApplicationStatus.APPLYING });
      setAtsResult(null); // Reset previous ATS check
    } catch (err) {
      alert('Generation failed');
    } finally {
      setIsGeneratingResume(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    setIsGeneratingCover(true);
    try {
      const content = await generateCoverLetter(experiences, job.description);
      setEditableCover(content);
      updateJob({ tailoredCoverLetter: content });
    } catch (err) {
      alert('Generation failed');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleCheckATS = async () => {
    if (!editableResume) return;
    setIsCheckingATS(true);
    try {
      const result = await validateResumeATS(editableResume);
      setAtsResult(result);
    } catch (err) {
      alert("ATS Check failed");
    } finally {
      setIsCheckingATS(false);
    }
  };

  const scoreData = job.fitAnalysis ? [{ value: job.fitAnalysis.score }] : [{ value: 0 }];

  return (
    <div className="pb-12">
      {/* Header */}
      <button onClick={() => navigate('/jobs')} className="flex items-center text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Applications
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div className="flex-1 w-full space-y-2">
           <input 
             value={jobTitle} 
             onChange={(e) => { setJobTitle(e.target.value); updateJob({ title: e.target.value })}}
             className="text-3xl font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none w-full placeholder-slate-400"
             placeholder="Job Title"
           />
           <input 
             value={jobCompany} 
             onChange={(e) => { setJobCompany(e.target.value); updateJob({ company: e.target.value })}}
             className="text-xl text-slate-500 mt-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none w-full placeholder-slate-400"
             placeholder="Company Name"
           />
           
           <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="relative group">
                 <Globe className="w-4 h-4 absolute left-0 top-2 text-slate-400" />
                 <input 
                   value={jobIndustry}
                   onChange={(e) => { setJobIndustry(e.target.value); updateJob({ industry: e.target.value })}}
                   className="pl-6 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none text-sm text-slate-600 placeholder-slate-400"
                   placeholder="Industry"
                 />
              </div>
              <div className="relative group">
                 <Briefcase className="w-4 h-4 absolute left-0 top-2 text-slate-400" />
                 <input 
                   value={jobType}
                   onChange={(e) => { setJobType(e.target.value); updateJob({ jobType: e.target.value })}}
                   className="pl-6 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none text-sm text-slate-600 placeholder-slate-400"
                   placeholder="Job Type"
                 />
              </div>
           </div>

           <div className="mt-4 flex items-center space-x-3">
             <select 
                value={job.status}
                onChange={(e) => updateJob({ status: e.target.value as ApplicationStatus })}
                className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5 focus:ring-emerald-500 focus:border-emerald-500"
             >
                {Object.values(ApplicationStatus).map(s => <option key={s} value={s}>{s}</option>)}
             </select>
             {job.url && (
               <a href={job.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline text-sm">
                 View Original Post
               </a>
             )}
           </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 w-full md:w-auto">
          {!job.fitAnalysis && (
            <button 
              onClick={handleRunFitAnalysis}
              disabled={isAnalyzing}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center justify-center w-full md:w-auto"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              Analyze Fit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Fit Analysis & Docs */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Match Score Card */}
           {job.fitAnalysis && (
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
               <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-32 h-32 relative flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart innerRadius="80%" outerRadius="100%" barSize={10} data={scoreData} startAngle={90} endAngle={-270}>
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background dataKey="value" fill={job.fitAnalysis.score > 70 ? '#10b981' : '#eab308'} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                       <span className="text-2xl font-bold text-slate-900">{job.fitAnalysis.score}%</span>
                       <span className="text-xs text-slate-500">Match</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                     <p className="text-slate-700">{job.fitAnalysis.summary}</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                           <h4 className="text-green-800 font-semibold text-sm mb-2 flex items-center">
                             <CheckCircle2 className="w-4 h-4 mr-1.5" /> Strengths
                           </h4>
                           <ul className="text-sm text-green-700 space-y-1">
                             {job.fitAnalysis.strengths.slice(0, 3).map((s, i) => <li key={i}>• {s}</li>)}
                           </ul>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                           <h4 className="text-amber-800 font-semibold text-sm mb-2 flex items-center">
                             <AlertCircle className="w-4 h-4 mr-1.5" /> Gaps
                           </h4>
                           <ul className="text-sm text-amber-700 space-y-1">
                             {job.fitAnalysis.gapAnalysis.slice(0, 3).map((s, i) => <li key={i}>• {s}</li>)}
                           </ul>
                        </div>
                     </div>
                     {job.fitAnalysis.recommendedActions && (
                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                           <h4 className="text-emerald-800 font-semibold text-sm mb-2 flex items-center">
                             <Activity className="w-4 h-4 mr-1.5" /> Recommended Actions
                           </h4>
                           <ul className="text-sm text-emerald-700 space-y-1">
                             {job.fitAnalysis.recommendedActions.map((s, i) => <li key={i}>• {s}</li>)}
                           </ul>
                        </div>
                     )}
                  </div>
               </div>
             </div>
           )}

           {/* Resume Generation Section */}
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-900 flex items-center">
                   <FileText className="w-4 h-4 mr-2" /> Tailored Resume
                 </h3>
                 <div className="flex space-x-2">
                   <button 
                      onClick={handleGenerateResume}
                      disabled={isGeneratingResume}
                      className="text-xs bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-md text-slate-700 font-medium transition-colors flex items-center"
                   >
                      {isGeneratingResume && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {editableResume ? 'Regenerate' : 'Generate Draft'}
                   </button>
                   {editableResume && (
                     <>
                        <button 
                           onClick={handleCheckATS}
                           disabled={isCheckingATS}
                           className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-md hover:bg-emerald-100 transition-colors flex items-center"
                        >
                           {isCheckingATS ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <SearchCheck className="w-3 h-3 mr-1" />}
                           Check ATS
                        </button>
                        <button 
                            onClick={() => updateJob({ tailoredResume: editableResume })}
                            className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors flex items-center"
                        >
                            <Save className="w-3 h-3 mr-1" /> Save
                        </button>
                     </>
                   )}
                 </div>
              </div>
              
              {/* ATS Result Panel */}
              {atsResult && (
                <div className="bg-slate-50 p-4 border-b border-slate-200 animate-in slide-in-from-top-2">
                   <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-700 text-sm">ATS Compatibility Score</span>
                      <span className={`text-lg font-bold ${atsResult.score > 80 ? 'text-green-600' : 'text-amber-600'}`}>{atsResult.score}/100</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {atsResult.issues.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-red-500 uppercase">Issues Found</span>
                          <ul className="text-xs text-slate-600 list-disc list-inside mt-1">
                             {atsResult.issues.slice(0,3).map((issue, i) => <li key={i}>{issue}</li>)}
                          </ul>
                        </div>
                      )}
                      {atsResult.suggestions.length > 0 && (
                        <div>
                           <span className="text-xs font-semibold text-blue-500 uppercase">Suggestions</span>
                           <ul className="text-xs text-slate-600 list-disc list-inside mt-1">
                             {atsResult.suggestions.slice(0,3).map((s, i) => <li key={i}>{s}</li>)}
                           </ul>
                        </div>
                      )}
                   </div>
                </div>
              )}

              <div className="p-0">
                {editableResume ? (
                   <textarea 
                     className="w-full h-96 p-6 outline-none resize-y text-sm font-mono text-slate-800"
                     value={editableResume}
                     onChange={(e) => setEditableResume(e.target.value)}
                   />
                ) : (
                  <div className="p-12 text-center">
                     <p className="text-slate-500 text-sm">Generate a resume specifically tailored for this role using your Career Vault data.</p>
                  </div>
                )}
              </div>
           </div>

           {/* Cover Letter Section */}
           {editableResume && (
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                   <h3 className="font-bold text-slate-900 flex items-center">
                     <FileText className="w-4 h-4 mr-2" /> Cover Letter
                   </h3>
                   <div className="flex space-x-2">
                     <button 
                        onClick={handleGenerateCoverLetter}
                        disabled={isGeneratingCover}
                        className="text-xs bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-md text-slate-700 font-medium transition-colors flex items-center"
                     >
                        {isGeneratingCover && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {editableCover ? 'Regenerate' : 'Create Letter'}
                     </button>
                      {editableCover && (
                       <button 
                          onClick={() => updateJob({ tailoredCoverLetter: editableCover })}
                          className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors flex items-center"
                       >
                          <Save className="w-3 h-3 mr-1" /> Save
                       </button>
                     )}
                   </div>
                </div>
                <div className="p-0">
                  {editableCover ? (
                     <textarea 
                       className="w-full h-64 p-6 outline-none resize-y text-sm font-serif text-slate-800 leading-relaxed"
                       value={editableCover}
                       onChange={(e) => setEditableCover(e.target.value)}
                     />
                  ) : (
                    <div className="p-8 text-center">
                       <p className="text-slate-500 text-sm">Create a personalized cover letter matching the job's tone.</p>
                    </div>
                  )}
                </div>
             </div>
           )}

        </div>

        {/* Right Col: Job Info */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Job Details</h3>
              {job.structuredData ? (
                <div className="space-y-4">
                   {job.structuredData.summaryBullets && job.structuredData.summaryBullets.length > 0 && (
                     <div>
                       <span className="text-xs uppercase text-slate-500 font-bold block mb-1 flex items-center">
                          <List className="w-3 h-3 mr-1"/> Key Responsibilities
                       </span>
                       <ul className="list-disc list-outside ml-4 text-xs text-slate-700 space-y-1">
                          {job.structuredData.summaryBullets.map((bullet, i) => (
                             <li key={i}>{bullet}</li>
                          ))}
                       </ul>
                     </div>
                   )}
                   
                   <div>
                     <span className="text-xs uppercase text-slate-500 font-bold block mb-1">Seniority</span>
                     <span className="text-sm text-slate-800 bg-slate-100 px-2 py-1 rounded">{job.structuredData.seniority || 'Not specified'}</span>
                   </div>
                   <div>
                     <span className="text-xs uppercase text-slate-500 font-bold block mb-1">Required Skills</span>
                     <div className="flex flex-wrap gap-1.5">
                       {job.structuredData.skills.map((s, i) => (
                         <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">{s}</span>
                       ))}
                     </div>
                   </div>
                   <div>
                     <span className="text-xs uppercase text-slate-500 font-bold block mb-1">Tools</span>
                     <div className="flex flex-wrap gap-1.5">
                       {job.structuredData.tools.map((s, i) => (
                         <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{s}</span>
                       ))}
                     </div>
                   </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Structured data not available.</p>
              )}
           </div>

           <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
             <h3 className="font-bold text-slate-900 mb-2">Original Description</h3>
             <div className="prose prose-sm max-w-none text-slate-600 max-h-96 overflow-y-auto">
               <ReactMarkdown>{job.description}</ReactMarkdown>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default JobDetail;