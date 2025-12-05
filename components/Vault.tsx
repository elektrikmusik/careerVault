import React, { useState, useRef } from 'react';
import { Plus, Wand2, Trash2, Save, Briefcase, Upload, X, Loader2, Tag, Building2, Target, Settings2 } from 'lucide-react';
import { Experience } from '../types';
import { enrichExperience, parseCareerHistory, refineBulletPoint } from '../services/geminiService';

interface VaultProps {
  experiences: Experience[];
  setExperiences: React.Dispatch<React.SetStateAction<Experience[]>>;
}

const Vault: React.FC<VaultProps> = ({ experiences, setExperiences }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<'create' | 'append'>('create');
  const [refiningBullets, setRefiningBullets] = useState<number[]>([]);
  
  // New State for Refine Menu
  const [activeRefineMenu, setActiveRefineMenu] = useState<number | null>(null);
  const [refineOptions, setRefineOptions] = useState({ tone: 'Professional', length: 'Concise' });

  // New Experience Form State
  const [formData, setFormData] = useState<Partial<Experience>>({});

  const handleCreateNew = () => {
    const newId = Date.now().toString();
    const newExp: Experience = {
      id: newId,
      title: 'New Role',
      company: 'Company Name',
      startDate: '',
      endDate: '',
      rawDescription: '',
    };
    setExperiences([newExp, ...experiences]);
    setEditingId(newId);
    setFormData(newExp);
  };

  const handleSave = (id: string) => {
    setExperiences(prev => prev.map(exp => exp.id === id ? { ...exp, ...formData } as Experience : exp));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setExperiences(prev => prev.filter(exp => exp.id !== id));
  };

  const handleAIProcess = async (id: string) => {
    const exp = experiences.find(e => e.id === id);
    if (!exp) return;
    
    // Use current form data if we are editing this one
    const dataToProcess = editingId === id ? (formData as Experience) : exp;
    
    if (!dataToProcess.rawDescription) return;

    setIsProcessing(true);
    try {
      const enriched = await enrichExperience(dataToProcess.rawDescription);

      const updatedExp: Experience = {
        ...(dataToProcess as Experience),
        ...enriched
      };

      setExperiences(prev => prev.map(e => e.id === id ? updatedExp : e));
      if (editingId === id) {
        setFormData(updatedExp);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process with AI');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerUpload = (mode: 'create' | 'append') => {
    setUploadMode(mode);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain" || file.name.endsWith('.md')) {
      const text = await file.text();

      if (uploadMode === 'append' && editingId) {
        setFormData(prev => ({ ...prev, rawDescription: (prev.rawDescription ? prev.rawDescription + '\n\n' : '') + text }));
      } else {
        setIsImporting(true);
        try {
          const parsedExperiences = await parseCareerHistory(text);
          
          if (parsedExperiences.length > 0) {
            const newExperiences: Experience[] = parsedExperiences.map((parsed, index) => ({
              id: (Date.now() + index).toString(),
              title: parsed.title || 'Imported Role',
              company: parsed.company || 'Unknown',
              startDate: parsed.startDate || '',
              endDate: parsed.endDate || '',
              rawDescription: parsed.rawDescription || '',
            }));

            setExperiences(prev => [...newExperiences, ...prev]);
            
            if (newExperiences.length === 1) {
               setEditingId(newExperiences[0].id);
               setFormData(newExperiences[0]);
            }
          } else {
             const newId = Date.now().toString();
             const newExp: Experience = {
                id: newId,
                title: 'Imported Role',
                company: 'Unknown',
                startDate: '',
                endDate: '',
                rawDescription: text,
             };
             setExperiences(prev => [newExp, ...prev]);
             setEditingId(newId);
             setFormData(newExp);
          }
        } catch (error) {
          console.error("Import failed", error);
          alert("Import failed. Please try again.");
        } finally {
          setIsImporting(false);
        }
      }
    } else {
      alert("Currently only .txt and .md files are supported for direct browser upload.");
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper for arrays (bullets, products, skills)
  const handleArrayChange = (field: keyof Experience, index: number, val: string) => {
    const currentArray = (formData[field] as string[]) || [];
    const newArray = [...currentArray];
    newArray[index] = val;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field: keyof Experience, placeholder: string = "New Item") => {
    const currentArray = (formData[field] as string[]) || [];
    setFormData({ ...formData, [field]: [...currentArray, placeholder] });
  };

  const removeArrayItem = (field: keyof Experience, index: number) => {
    const currentArray = (formData[field] as string[]) || [];
    const newArray = currentArray.filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray });
  };

  const handleRefineSingleBullet = async (index: number) => {
      const bullets = formData.starBullets || [];
      const bulletToRefine = bullets[index];
      if (!bulletToRefine) return;

      // Close menu
      setActiveRefineMenu(null);

      setRefiningBullets(prev => [...prev, index]);
      try {
        const refined = await refineBulletPoint(bulletToRefine, refineOptions);
        if (refined) {
            handleArrayChange('starBullets', index, refined);
        }
      } catch (error) {
          console.error("Failed to refine bullet", error);
      } finally {
          setRefiningBullets(prev => prev.filter(i => i !== index));
      }
  };

  // Tags input component
  const TagsInput = ({ label, field, placeholder }: { label: string, field: keyof Experience, placeholder: string }) => (
    <div className="mb-4">
       <div className="flex justify-between items-center mb-2">
          <label className="text-xs uppercase text-slate-500 font-bold">{label}</label>
          <button onClick={() => addArrayItem(field, placeholder)} className="text-xs text-emerald-600 hover:underline flex items-center">
             <Plus className="w-3 h-3 mr-1" /> Add
          </button>
       </div>
       <div className="flex flex-wrap gap-2">
         {(formData[field] as string[] || []).map((item, idx) => (
           <div key={idx} className="flex items-center bg-white border border-slate-300 rounded-full px-3 py-1 text-sm">
              <input
                 value={item}
                 onChange={(e) => handleArrayChange(field, idx, e.target.value)}
                 className="outline-none bg-transparent min-w-[60px] text-slate-700"
              />
              <button 
                 onClick={() => removeArrayItem(field, idx)} 
                 className="ml-2 text-slate-400 hover:text-red-500"
              >
                 <X className="w-3 h-3" />
              </button>
           </div>
         ))}
         {(!formData[field] || (formData[field] as string[]).length === 0) && (
            <span className="text-sm text-slate-400 italic">No {label.toLowerCase()} added.</span>
         )}
       </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Career Vault</h1>
          <p className="text-slate-500 mt-2">Manage your professional history and let AI refine it.</p>
        </div>
        <div className="flex space-x-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".txt,.md"
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => triggerUpload('create')}
            disabled={isImporting}
            className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Upload className="w-5 h-5 mr-2" />}
            {isImporting ? 'Parsing...' : 'Import File'}
          </button>
          <button 
            onClick={handleCreateNew}
            disabled={isImporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Experience
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {experiences.length === 0 && !isImporting && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No experiences added yet.</p>
            <div className="mt-4 space-x-4">
               <button onClick={handleCreateNew} className="text-emerald-600 font-medium hover:underline">
                 Add your first role
               </button>
               <span className="text-slate-300">|</span>
               <button onClick={() => triggerUpload('create')} className="text-emerald-600 font-medium hover:underline">
                 Import from file
               </button>
            </div>
          </div>
        )}
        
        {isImporting && experiences.length === 0 && (
           <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
              <p className="text-slate-500">Analyzing document and extracting roles...</p>
           </div>
        )}

        {experiences.map((exp) => (
          <div key={exp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {editingId === exp.id ? (
              <div className="p-6 space-y-6 animate-in fade-in duration-200">
                
                {/* Header Inputs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Row 1: Title & Company */}
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Job Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Product Manager"
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-lg bg-white text-slate-900"
                        value={formData.title || ''}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Company</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Corp"
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-lg bg-white text-slate-900"
                        value={formData.company || ''}
                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                      />
                  </div>

                  {/* Row 2: Dates */}
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                      <input
                        type="date"
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white text-slate-900"
                        value={formData.startDate || ''}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">End Date</label>
                      <div className="flex items-center gap-3">
                          <input
                            type="date"
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm disabled:bg-slate-100 disabled:text-slate-400 bg-white text-slate-900"
                            value={formData.endDate === 'Present' ? '' : (formData.endDate || '')}
                            disabled={formData.endDate === 'Present'}
                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                          />
                          <div className="flex items-center shrink-0">
                              <input
                                  type="checkbox"
                                  id={`currentRole-${exp.id}`}
                                  checked={formData.endDate === 'Present'}
                                  onChange={(e) => {
                                      setFormData({ 
                                          ...formData, 
                                          endDate: e.target.checked ? 'Present' : '' 
                                      });
                                  }}
                                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                              />
                              <label htmlFor={`currentRole-${exp.id}`} className="ml-2 text-xs text-slate-600 font-medium cursor-pointer select-none">Current</label>
                          </div>
                      </div>
                  </div>

                  {/* Row 3: Industry & Sector */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Industry</label>
                    <input
                      type="text"
                      placeholder="e.g. Fintech"
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white text-slate-900"
                      value={formData.industry || ''}
                      onChange={e => setFormData({ ...formData, industry: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Sector</label>
                    <input
                      type="text"
                      placeholder="e.g. SaaS"
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white text-slate-900"
                      value={formData.sector || ''}
                      onChange={e => setFormData({ ...formData, sector: e.target.value })}
                    />
                  </div>
                </div>
                
                {/* Raw Input */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-500 uppercase">
                      Raw Description (Source Material)
                    </label>
                    <button onClick={() => triggerUpload('append')} className="text-xs text-emerald-600 hover:underline">
                      Append from file
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="# Experience at Company... "
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-xs text-slate-900 bg-white"
                    value={formData.rawDescription || ''}
                    onChange={e => setFormData({ ...formData, rawDescription: e.target.value })}
                  />
                </div>

                {/* AI Structured Fields */}
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center">
                       <Wand2 className="w-4 h-4 mr-2 text-emerald-500"/> AI Structured Data
                    </h4>

                    {/* About Company */}
                    <div className="mb-4">
                       <label className="text-xs uppercase text-slate-500 font-bold block mb-2">About Company</label>
                       <textarea
                         rows={2}
                         className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                         value={formData.aboutCompany || ''}
                         onChange={e => setFormData({ ...formData, aboutCompany: e.target.value })}
                         placeholder="Brief company description..."
                       />
                    </div>

                    {/* Tags Rows */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-4">
                          <TagsInput label="Products / Services" field="products" placeholder="Product Name" />
                          <TagsInput label="Hard Skills" field="hardSkills" placeholder="Skill" />
                       </div>
                       <div className="space-y-4">
                          <TagsInput label="Soft Skills" field="softSkills" placeholder="Skill" />
                       </div>
                    </div>

                    {/* STAR Bullets */}
                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-2">
                           <label className="text-xs uppercase text-slate-500 font-bold">STAR Bullets (Synthetic)</label>
                           <button onClick={() => addArrayItem('starBullets', 'New bullet')} className="text-xs text-emerald-600 hover:underline flex items-center">
                              <Plus className="w-3 h-3 mr-1" /> Add Bullet
                           </button>
                        </div>
                        <div className="space-y-2">
                           {(formData.starBullets || []).map((bullet, idx) => (
                               <div key={idx} className="flex gap-2 items-start group relative">
                                  <textarea
                                      value={bullet}
                                      onChange={(e) => handleArrayChange('starBullets', idx, e.target.value)}
                                      rows={2}
                                      className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none resize-none bg-white text-slate-900"
                                  />
                                  
                                  {/* Refine Trigger */}
                                  <button
                                      onClick={() => setActiveRefineMenu(activeRefineMenu === idx ? null : idx)}
                                      className={`p-2 text-emerald-600 hover:bg-emerald-50 rounded ${activeRefineMenu === idx ? 'bg-emerald-50' : ''}`}
                                      disabled={refiningBullets.includes(idx)}
                                      title="Refine Options"
                                  >
                                      <Wand2 className={`w-4 h-4 ${refiningBullets.includes(idx) ? 'animate-spin' : ''}`} />
                                  </button>
                                  
                                  <button 
                                      onClick={() => removeArrayItem('starBullets', idx)}
                                      className="p-2 text-slate-400 hover:text-red-500"
                                      title="Remove bullet"
                                  >
                                      <X className="w-4 h-4" />
                                  </button>

                                  {/* Refinement Context Menu */}
                                  {activeRefineMenu === idx && (
                                      <div className="absolute right-0 top-10 z-20 bg-white border border-slate-200 shadow-xl rounded-lg p-4 w-64 animate-in fade-in zoom-in-95">
                                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center">
                                              <Settings2 className="w-3 h-3 mr-1.5"/> Refine Options
                                          </h4>
                                          
                                          <div className="space-y-3">
                                              <div>
                                                  <label className="text-xs font-medium text-slate-700 block mb-1">Tone</label>
                                                  <select 
                                                      value={refineOptions.tone}
                                                      onChange={(e) => setRefineOptions({...refineOptions, tone: e.target.value})}
                                                      className="w-full text-xs p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 bg-white text-slate-900"
                                                  >
                                                      <option value="Professional">Professional (Default)</option>
                                                      <option value="Executive">Executive</option>
                                                      <option value="Confident">Confident</option>
                                                      <option value="Technical">Technical</option>
                                                  </select>
                                              </div>
                                              
                                              <div>
                                                  <label className="text-xs font-medium text-slate-700 block mb-1">Length</label>
                                                  <select 
                                                      value={refineOptions.length}
                                                      onChange={(e) => setRefineOptions({...refineOptions, length: e.target.value})}
                                                      className="w-full text-xs p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 bg-white text-slate-900"
                                                  >
                                                      <option value="Concise">Concise (1 sentence)</option>
                                                      <option value="Standard">Standard (2 sentences)</option>
                                                      <option value="Detailed">Detailed</option>
                                                  </select>
                                              </div>

                                              <button 
                                                  onClick={() => handleRefineSingleBullet(idx)}
                                                  className="w-full bg-emerald-600 text-white text-xs font-bold py-2 rounded hover:bg-emerald-700 flex items-center justify-center"
                                              >
                                                  <Wand2 className="w-3 h-3 mr-1.5" />
                                                  Apply Refinement
                                              </button>
                                          </div>
                                      </div>
                                  )}
                               </div>
                           ))}
                           {(!formData.starBullets || formData.starBullets.length === 0) && (
                              <p className="text-sm text-slate-400 italic">No bullets generated yet.</p>
                           )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                   <button
                    onClick={() => handleAIProcess(exp.id)}
                    disabled={isProcessing}
                    className="flex items-center text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Wand2 className={`w-4 h-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                    {isProcessing ? 'Refining...' : 'AI Refine & Extract'}
                  </button>
                  <button 
                    onClick={() => handleSave(exp.id)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 group">
                 <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{exp.title}</h3>
                      <p className="text-slate-600 font-medium text-lg">{exp.company}</p>
                      <div className="flex items-center space-x-3 text-sm text-slate-500 mt-1">
                          <span>{exp.startDate} - {exp.endDate}</span>
                          {exp.industry && (
                            <>
                              <span>•</span>
                              <span>{exp.industry}</span>
                            </>
                          )}
                      </div>
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingId(exp.id);
                          setFormData(exp);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
                        title="Edit"
                      >
                         <Briefcase className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(exp.id)}
                        className="p-2 hover:bg-red-50 rounded-full text-red-500"
                        title="Delete"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                 </div>
                 
                 {/* Quick Tags View */}
                 <div className="mt-3 flex flex-wrap gap-2">
                    {exp.products?.slice(0,3).map((p, i) => (
                       <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full flex items-center">
                          <Target className="w-3 h-3 mr-1"/> {p}
                       </span>
                    ))}
                 </div>
                 
                 <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-4">
                    <div>
                      <h4 className="text-xs uppercase text-slate-400 font-bold mb-2">Key Achievements (STAR)</h4>
                      {exp.starBullets ? (
                          <ul className="text-sm text-slate-700 list-disc list-outside ml-4 space-y-2">
                              {exp.starBullets.slice(0, 3).map((bullet, i) => (
                                  <li key={i}>{bullet}</li>
                              ))}
                              {exp.starBullets.length > 3 && <li className="text-slate-400 italic">+{exp.starBullets.length - 3} more...</li>}
                          </ul>
                      ) : (
                        <p className="text-slate-500 italic text-sm">No structured bullets available.</p>
                      )}
                    </div>
                    
                    <div>
                         {exp.aboutCompany && (
                           <div className="mb-4">
                              <h4 className="text-xs uppercase text-slate-400 font-bold mb-1">About Company</h4>
                              <p className="text-xs text-slate-600 line-clamp-2">{exp.aboutCompany}</p>
                           </div>
                         )}

                         <h4 className="text-xs uppercase text-slate-400 font-bold mb-2">Top Skills</h4>
                         <div className="flex flex-wrap gap-1.5">
                           {(exp.hardSkills || []).slice(0, 5).map((s, i) => (
                             <span key={i} className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded">
                               {s}
                             </span>
                           ))}
                         </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Vault;