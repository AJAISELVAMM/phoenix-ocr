import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Languages, 
  Download, 
  Sparkles, 
  Trash2, 
  Loader2, 
  Edit3, 
  Copy, 
  Globe,
  Type,
  CheckCircle2,
  ChevronRight,
  Columns,
  Maximize2,
  Image as ImageIcon,
  Zap,
  Search,
  UserCheck,
  FileCheck,
  Briefcase,
  CreditCard,
  Stethoscope,
  GraduationCap,
  FileText as FileTextIcon,
  Newspaper,
  Scroll
} from 'lucide-react';

import { callGemini, detectDocumentType } from './services/gemini';


// Custom Phoenix Logo Component
const PhoenixLogo = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#B91C1C" stroke="#D4AF37" strokeWidth="1" />
    <path 
      d="M50 82C50 82 38 72 44 55C41 58 37 60 33 58C28 55 22 43 38 33C28 36 22 28 32 18C37 28 47 33 50 33C53 33 63 28 68 18C78 28 72 36 62 33C78 43 72 55 67 58C63 60 59 58 56 55C62 72 50 82 50 82Z" 
      fill="white"
    />
    <path 
      d="M50 75C50 75 42 68 46 55C44 57 41 58 38 57C34 55 30 46 41 39C34 41 30 35 37 28C41 35 48 38 50 38C52 38 59 35 63 28C70 35 66 41 59 39C70 46 66 55 62 57C59 58 56 57 54 55C58 68 50 75 50 75Z" 
      fill="#F59E0B"
    />
  </svg>
);

const App = () => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [ocrResult, setOcrResult] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false); 
  const [aiStatus, setAiStatus] = useState(null); 
  const [status, setStatus] = useState('idle');
  const [detectedLang, setDetectedLang] = useState('');
  const [activeTab, setActiveTab] = useState('editor');
  const [targetLanguage, setTargetLanguage] = useState("Tamil");
const [jsPdfLoaded, setJsPdfLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [documentType, setDocumentType] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const supportedLanguages = [
    "Tamil", "English", "Hindi", "Malayalam", "Telugu", "Kannada", "Sanskrit", "Marathi", "Gujarati", "Bengali", "Punjabi",
    "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Japanese", "Chinese", "Korean", "Arabic", "Hebrew",
    "Dutch", "Greek", "Turkish", "Vietnamese", "Thai", "Indonesian", "Malay", "Polish", "Swedish", "Norwegian", "Danish"
  ].sort();

  const filteredLanguages = supportedLanguages.filter(lang => 
    lang.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.async = true;
    script.onload = () => setJsPdfLoaded(true);
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (status === 'success' && ocrResult && displayText.length < ocrResult.length) {
      setIsPrinting(true);
      const timer = setTimeout(() => {
        setDisplayText(ocrResult.slice(0, displayText.length + 8));
      }, 15);
      return () => clearTimeout(timer);
    } else if (status === 'success' && ocrResult && displayText.length >= ocrResult.length) {
      setIsPrinting(false); 
    }
  }, [ocrResult, displayText, status]);

  const handleFile = (selectedFile) => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) return;
    setFile(selectedFile);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setOcrResult('');
    setDisplayText('');
    setTranslatedText('');
    setStatus('idle');
    setDetectedLang('');
    setIsPrinting(false);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

const processImage = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatus('processing');
    setDisplayText('');
    setDocumentType(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        
        // Run OCR and language detection in parallel
        const [transcription, langResponse] = await Promise.all([
          callGemini(
            "Accurately transcribe ONLY the text from this image. Do not include notes, comments, or extra words. Preserve formatting as it appears.",
            "You are a professional OCR engine designed to output raw text only.",
            base64
          ),
          callGemini(
            `Identify the primary language of the following text and return ONLY the language name (e.g., 'English', 'Tamil', 'Spanish'): ${""}`,
            "You are a language identification specialist."
          )
        ]);

        setOcrResult(transcription.trim());
        setDetectedLang(langResponse.trim().replace(/[^a-zA-Z\s]/g, ''));
        
        // Detect document type after OCR
        setIsDetecting(true);
        try {
          const docType = await detectDocumentType(base64);
          setDocumentType(docType);
        } catch (err) {
          console.error("Document detection failed:", err);
          setDocumentType({ documentType: "Other" });
        }
        setIsDetecting(false);
        
        setStatus('success');
        setIsProcessing(false);
      };
    } catch (err) {
      console.error(err);
      setStatus('error');
      setIsProcessing(false);
    }
  };

  const handleTranslate = async (langOverride = null) => {
    const target = langOverride || targetLanguage;
    if (!ocrResult || aiStatus) return;
    setAiStatus('translating');
    try {
      const translation = await callGemini(
        `Translate this text to ${target}. Ensure natural flow. Output ONLY translation: ${ocrResult}`,
        `You are a professional linguist specializing in ${target}.`
      );
      setTranslatedText(translation.trim());
      setTargetLanguage(target);
    } catch (err) { console.error(err); } 
    finally { setAiStatus(null); }
  };

  const exportAsPDF = () => {
    if (!window.jspdf || !jsPdfLoaded) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 25;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    let y = 30;

    // Red Header Bar
    doc.setFillColor(185, 28, 28);
    doc.rect(0, 0, pageWidth, 4, 'F');
    
    // Document Title
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("PHOENIX DATA EXTRACTION REPORT", margin, y);
    
    y += 12;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Technical Context Information
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.text(`DETECTED LANGUAGE: ${detectedLang.toUpperCase() || 'UNDETERMINED'}`, margin + 5, y + 7.5);
    
    y += 22;

    // --- CONTENT SECTION ---
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.setFont("helvetica", "bold");
    doc.text("RAW DIGITAL TRANSCRIPTION", margin, y);
    
    y += 8;
    doc.setDrawColor(185, 28, 28);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 40, y);
    
    y += 10;

    // Main Body Text with Justification
    doc.setFont("helvetica", "normal"); 
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    
    // Split text into lines based on page width
    const rawLines = doc.splitTextToSize(ocrResult || "No text was detected during processing.", contentWidth);
    
    rawLines.forEach((line) => {
      // Check if we need a new page
      if (y > 275) { 
        // Footer before adding page
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`CONFIDENTIAL - PHOENIX VISUAL SYSTEMS`, pageWidth / 2, 288, { align: "center" });
        
        doc.addPage(); 
        y = 30; 
        
        // Re-apply styles on new page
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
      }
      
      // Use "justify" alignment for neat layout
      doc.text(line, margin, y, {
        maxWidth: contentWidth,
        align: "justify"
      });
      
      y += 6.5; // Professional line spacing
    });

    // Final Footer with Page Numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`PAGE ${i} OF ${pageCount} | SECURE DOCUMENT EXTRACTION`, pageWidth / 2, 288, { align: "center" });
        
        // Decorative corner mark
        doc.setDrawColor(203, 213, 225);
        doc.line(pageWidth - 15, 285, pageWidth - 10, 285);
        doc.line(pageWidth - 10, 285, pageWidth - 10, 280);
    }

    doc.save(`PHOENIX_RAW_EXTRACT.pdf`);
  };

  const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;800&display=swap');
        .scan-beam { height: 3px; background: #ef4444; box-shadow: 0 0 10px #ef4444; position: absolute; width: 100%; left: 0; z-index: 20; animation: scan 2s ease-in-out infinite; }
        @keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      {/* --- SIDEBAR --- */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <PhoenixLogo className="w-12 h-12" />
            <div className="flex flex-col">
              <span className="text-white font-black text-xl tracking-wider leading-none">PHOENIX</span>
              <span className="text-amber-500 text-[10px] font-bold tracking-[0.2em] mt-1 uppercase">AI Systems</span>
            </div>
          </div>
        </div>
        
        <div className="px-4 mt-4">
          <div className="relative bg-white/5 rounded-xl border border-white/10 px-3 py-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Search engines..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 outline-none pl-7"
            />
          </div>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar space-y-1 mt-6">
          <p className="px-3 pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Neural Engines</p>
          {filteredLanguages.map(lang => (
            <button 
              key={lang}
              onClick={() => handleTranslate(lang)}
              disabled={!ocrResult || !!aiStatus || isPrinting}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all disabled:opacity-30 group ${targetLanguage === lang ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <span className="flex items-center gap-3"><Globe size={14} />{lang}</span>
              <ChevronRight size={14} className={targetLanguage === lang ? 'opacity-100' : 'opacity-0'} />
            </button>
          ))}
        </nav>

        <div className="p-4 bg-amber-500/5 m-4 rounded-2xl border border-amber-500/10">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-xs mb-1">
            <Zap size={14} fill="currentColor" /> Neural Core Active
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Global Processor Ready</p>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
             <div className="flex items-center">
               <PhoenixLogo className="w-11 h-11" />
               <div className="flex flex-col ml-3">
                  <h1 className="font-black text-slate-900 tracking-tight text-2xl uppercase leading-none">Phoenix</h1>
                  <span className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase mt-1">Visual Intelligence</span>
               </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-slate-100 rounded-xl px-4 py-2 border border-slate-200">
              <Languages size={14} className="text-slate-400 mr-2" />
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 outline-none"
              >
                {supportedLanguages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <button 
              disabled={!ocrResult || !!aiStatus || isPrinting}
              onClick={() => handleTranslate()}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {aiStatus ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />} 
              Translate View
            </button>
            <button 
              disabled={!ocrResult || !jsPdfLoaded || isPrinting || !!aiStatus}
              onClick={exportAsPDF}
              className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              <Download size={16} /> Export Raw PDF
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden bg-slate-50">
          {/* Source Section */}
          <div className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-500 ease-in-out ${file ? 'w-1/3 min-w-[380px]' : 'w-full flex-1'}`}>
            {!file ? (
              <div 
                className={`flex-1 m-8 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-200 relative ${isDragging ? 'border-amber-500 bg-amber-50 scale-[1.02]' : 'border-slate-200 bg-slate-50 hover:border-amber-400'}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => document.getElementById('f-up').click()}
              >
                <div className="w-20 h-20 bg-white shadow-xl rounded-3xl flex items-center justify-center mb-6 overflow-hidden pointer-events-none">
                  <PhoenixLogo className="w-full h-full" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 pointer-events-none">
                  {isDragging ? 'Drop Image Here' : 'Drop Document'}
                </h3>
                <p className="text-slate-400 text-sm mt-2 pointer-events-none">Upload image for neural extraction</p>
                <input type="file" className="hidden" id="f-up" accept="image/*" onChange={(e) => handleFile(e.target.files[0])} />
                <button className="mt-8 px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold pointer-events-none">Select Image</button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={14}/> Source</span>
                  <button onClick={() => setFile(null)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
                <div className="flex-1 p-8 flex items-center justify-center overflow-auto bg-slate-100 relative">
                  <div className="relative">
                    {previewUrl && <img src={previewUrl} alt="Source" className="max-w-full h-auto rounded-lg shadow-2xl" />}
                    {isProcessing && <div className="scan-beam" />}
                  </div>
                </div>
                {!status.includes('success') && !isProcessing && (
                  <div className="p-6 bg-white border-t border-slate-200">
                    <button onClick={processImage} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-3">
                      <Sparkles size={18} /> Start Processing
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className={`flex-1 flex flex-col transition-all duration-500 ${ocrResult || isProcessing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="h-14 px-6 flex items-center justify-between bg-white border-b border-slate-200">
              <div className="flex gap-8 h-full">
                <button onClick={() => setActiveTab('editor')} className={`text-[10px] font-black uppercase tracking-[0.2em] h-full border-b-2 transition-all ${activeTab === 'editor' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-300'}`}>Digital Text</button>
                <button onClick={() => setActiveTab('preview')} className={`text-[10px] font-black uppercase tracking-[0.2em] h-full border-b-2 transition-all ${activeTab === 'preview' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-300'}`}>Manuscript</button>
              </div>
              
              {status === 'success' && !isPrinting && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-tighter animate-in fade-in zoom-in duration-300">
                  <CheckCircle2 size={12} /> Extraction Complete
                </div>
              )}
              {isPrinting && (
                 <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-tighter">
                   <Loader2 size={12} className="animate-spin" /> Generating Output...
                 </div>
              )}
            </div>

            <div className="flex-1 relative bg-white flex flex-col lg:flex-row overflow-hidden">
              {isProcessing && (
                <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
                  <PhoenixLogo className="w-20 h-20 animate-bounce mb-4" />
                  <h4 className="text-xl font-black text-slate-900">Phoenix Intelligence</h4>
                  <p className="text-slate-400 text-sm mt-1">Analyzing Visual Patterns...</p>
                </div>
              )}
              <div className="flex-1 flex flex-col border-r border-slate-100">
                <div className="h-10 px-6 flex items-center justify-between bg-slate-50/50 border-b border-slate-100 shrink-0">
                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Transcript ({detectedLang})</span>
                   <button onClick={() => copyToClipboard(ocrResult)} disabled={isPrinting} className="text-slate-300 hover:text-slate-900 disabled:opacity-20"><Copy size={14} /></button>
                </div>
                <textarea 
                  className={`flex-1 p-10 outline-none resize-none transition-all ${activeTab === 'preview' ? 'italic text-slate-600' : 'font-mono text-slate-800'}`}
                  style={activeTab === 'preview' ? {fontFamily: "'Dancing Script', cursive", fontSize: '2rem'} : {fontFamily: "'JetBrains Mono', monospace", fontSize: '1rem'}}
                  value={displayText}
                  onChange={(e) => setOcrResult(e.target.value)}
                  readOnly={isPrinting}
                />
              </div>
              <div className="flex-1 flex flex-col bg-slate-50/30">
                <div className="h-10 px-6 flex items-center justify-between bg-amber-50/30 border-b border-amber-100 shrink-0">
                   <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Translation View: {targetLanguage}</span>
                   </div>
                   <button onClick={() => copyToClipboard(translatedText)} className="text-amber-300 hover:text-amber-600"><Copy size={14} /></button>
                </div>
                <textarea 
                  className={`flex-1 p-10 outline-none resize-none transition-all leading-relaxed ${activeTab === 'preview' ? 'italic text-slate-800' : 'font-sans text-slate-900 font-semibold'}`}
                  style={activeTab === 'preview' ? {fontFamily: "'Dancing Script', cursive", fontSize: '2rem'} : {fontFamily: "'Inter', sans-serif", fontSize: '1.05rem'}}
                  value={translatedText}
                  readOnly
                  placeholder="Translation View... (Export PDF will only include Raw Extraction for clarity)"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;