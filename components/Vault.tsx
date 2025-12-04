import React, { useState, useRef } from 'react';
import { Plus, Wand2, Trash2, Save, Briefcase, Upload, X, Loader2, Tag, Building2, Target } from 'lucide-react';
import { Experience } from '../types';
import { enrichExperience, parseCareerHistory } from '../services/geminiService';

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

  // Tags input component
  const TagsInput = ({ label, field, placeholder }: { label: string, field: keyof Experience, placeholder: string }) => (
    <div className="mb-4">
       <div className="flex justify-between items-center mb-2">
          <label className="text-xs uppercase text-slate-500 font-bold">{label}</label>
          <button onClick={() => addArrayItem(field, placeholder)} className="text-xs text-indigo-600 hover:underline flex items-center">
             <Plus className="w-3 h-3 mr-1" /> Add
          </button>
       </div>
       <div className="flex flex-wrap gap-2">
         {(formData[field] as string[] || []).map((item, idx) => (
           <div key={idx} className="flex items-center bg-white border border-slate-300 rounded-full px-3 py-1 text-sm">
              <input
                 value={item}
                 onChange={(e) => handleArrayChange(field, idx, e.target.value)}
                 className="outline-none bg-transparent min-w-[60px]"
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all"
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
               <button onClick={handleCreateNew} className="text-indigo-600 font-medium hover:underline">
                 Add your first role
               </button>
               <span className="text-slate-300">|</span>
               <button onClick={() => triggerUpload('create')} className="text-indigo-600 font-medium hover:underline">
                 Import from file
               </button>
            </div>
          </div>
        )}
        
        {isImporting && experiences.length === 0 && (
           <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-slate-500">Analyzing document and extracting roles...</p>
           </div>
        )}

        {experiences.map((exp) => (
          <div key={exp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {editingId === exp.id ? (
              <div className="p-6 space-y-6 animate-in fade-in duration-200">
                {/* Header Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Job Title"
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-lg"
                        value={formData.title || ''}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Company"
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        value={formData.company || ''}
                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                      />
                  </div>
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                            <input
                              type="date"
                              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                              value={formData.startDate || ''}
                              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                            <input
                              type="date"
                              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm disabled:bg-slate-100 disabled:text-slate-400"
                              value={formData.endDate === 'Present' ? '' : (formData.endDate || '')}
                              disabled={formData.endDate === 'Present'}
                              onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                            <div className="flex items-center mt-2">
                                <input
                                    type="checkbox"
                                    id="currentRole"
                                    checked={formData.endDate === 'Present'}
                                    onChange={(e) => {
                                        setFormData({ 
                                            ...formData, 
                                            endDate: e.target.checked ? 'Present' : '' 
                                        });
                                    }}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="currentRole" className="ml-2 text-xs text-slate-600 font-medium cursor-pointer select-none">Current Role</label>
                            </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Industry (e.g. Fintech)"
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                          value={formData.industry || ''}
                          onChange={e => setFormData({ ...formData, industry: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="Sector (e.g. SaaS)"
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                          value={formData.sector || ''}
                          onChange={e => setFormData({ ...formData, sector: e.target.value })}
                        />
                      </div>
                  </div>
                </div>
                
                {/* Raw Input */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-500 uppercase">
                      Raw Description (Source Material)
                    </label>
                    <button onClick={() => triggerUpload('append')} className="text-xs text-indigo-600 hover:underline">
                      Append from file
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="# Experience at Company... "
                    className="w-full p-3 border border-slate-700 bg-slate-900 text-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-xs"
                    value={formData.rawDescription || ''}
                    onChange={e => setFormData({ ...formData, rawDescription: e.target.value })}
                  />
                </div>

                {/* AI Structured Fields */}
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center">
                       <Wand2 className="w-4 h-4 mr-2 text-indigo-500"/> AI Structured Data
                    </h4>

                    {/* About Company */}
                    <div className="mb-4">
                       <label className="text-xs uppercase text-slate-500 font-bold block mb-2">About Company</label>
                       <textarea
                         rows={2}
                         className="w-full p-2 border border-slate-300 rounded-lg text-sm"
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
                           <button onClick={() => addArrayItem('starBullets', 'New bullet')} className="text-xs text-indigo-600 hover:underline flex items-center">
                              <Plus className="w-3 h-3 mr-1" /> Add Bullet
                           </button>
                        </div>
                        <div className="space-y-2">
                           {(formData.starBullets || []).map((bullet, idx) => (
                               <div key={idx} className="flex gap-2 items-start group">
                                  <textarea
                                      value={bullet}
                                      onChange={(e) => handleArrayChange('starBullets', idx, e.target.value)}
                                      rows={2}
                                      className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                  />
                                  <button 
                                      onClick={() => removeArrayItem('starBullets', idx)}
                                      className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                      <X className="w-4 h-4" />
                                  </button>
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
                    className="flex items-center text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
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
                       <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full flex items-center">
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