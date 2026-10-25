import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Archive, 
  Trash2, 
  FileText, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  CheckSquare, 
  Square, 
  Eye, 
  FileCheck, 
  Plus, 
  X,
  Layers,
  Stamp,
  GitCompare,
  MessageSquareWarning,
  ShieldAlert,
  Info
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { 
  getVaultRecords, 
  deleteVaultRecord, 
  clearAllVaultRecords, 
  saveVaultRecord 
} from '../utils/vaultStorage';
import { calculateCreatorSafetyScore } from '../utils/safetyScoreCalculator';
import { generateIncidentPdf } from '../utils/pdfGenerator';

export default function VaultScreen() {
  const navigate = useNavigate();
  const { t } = useI18n();

  // Records state
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'report'
  const [typeFilter, setTypeFilter] = useState('all');

  // Report Form state
  const [platform, setPlatform] = useState('instagram');
  const [incidentType, setIncidentType] = useState('harassment');
  const [incidentDateTime, setIncidentDateTime] = useState(() => new Date().toISOString().substring(0, 16));
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [attachedRecordIds, setAttachedRecordIds] = useState([]);
  const [formError, setFormError] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Load records
  const loadRecords = async () => {
    try {
      const data = await getVaultRecords();
      setRecords(data);
    } catch (err) {
      console.error('Error fetching vault records:', err);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Record Deletion
  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    try {
      await deleteVaultRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      if (selectedRecord?.id === id) setSelectedRecord(null);
      setFeedbackMsg(t('vault.deletedSuccess'));
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  // Clear All Records
  const handleClearAll = async () => {
    if (!window.confirm(t('vault.clearConfirm'))) return;
    try {
      await clearAllVaultRecords();
      setRecords([]);
      setSelectedRecord(null);
      setAttachedRecordIds([]);
      setFeedbackMsg(t('vault.clearedSuccess'));
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err) {
      console.error('Failed to clear records:', err);
    }
  };

  // Toggle attached record in report form
  const toggleAttachRecord = (id) => {
    if (attachedRecordIds.includes(id)) {
      setAttachedRecordIds(prev => prev.filter(i => i !== id));
    } else {
      setAttachedRecordIds(prev => [...prev, id]);
    }
  };

  // Generate Official PDF
  const handleGeneratePdf = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!description.trim()) {
      setFormError(t('vault.reportForm.validationError'));
      return;
    }

    try {
      setIsGeneratingPdf(true);

      // Attached objects
      const attachedRecords = records.filter(r => attachedRecordIds.includes(r.id));
      const scoreMetrics = calculateCreatorSafetyScore(records);

      // Best preview image if available
      const previewRecord = attachedRecords.find(r => r.previewDataUrl);

      const incidentId = `INC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const reportPayload = {
        id: incidentId,
        platform,
        incidentType,
        dateTime: incidentDateTime,
        description,
        notes,
        attachedRecords,
        safetyScore: scoreMetrics.score,
        safetyBand: scoreMetrics.band,
        previewImage: previewRecord?.previewDataUrl || null,
      };

      // 1. Generate & download PDF
      await generateIncidentPdf(reportPayload, t);

      // 2. Save incident report to Vault
      await saveVaultRecord({
        id: incidentId,
        type: 'incident',
        title: `Incident Report: ${incidentType.toUpperCase()} on ${platform.toUpperCase()}`,
        platform,
        incidentType,
        dateTime: incidentDateTime,
        description,
        attachedCount: attachedRecords.length,
        summary: `Filed report for ${incidentType} on ${platform}. Attached ${attachedRecords.length} evidence artifact(s).`,
      });

      await loadRecords();
      setFeedbackMsg('Report compiled and PDF downloaded successfully.');
      setActiveTab('records');
      setDescription('');
      setNotes('');
      setAttachedRecordIds([]);
    } catch (err) {
      console.error('PDF generation error:', err);
      setFormError('Failed to generate PDF. Check console for details.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Filter records
  const filteredRecords = typeFilter === 'all'
    ? records
    : records.filter(r => r.type === typeFilter);

  const getRecordIcon = (type) => {
    switch (type) {
      case 'watermark':
        return Stamp;
      case 'comparison':
        return GitCompare;
      case 'comments':
        return MessageSquareWarning;
      case 'casting':
        return ShieldAlert;
      case 'incident':
      default:
        return FileText;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/50 rounded-lg transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('nav.back')}</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <Archive className="w-7 h-7 text-purple-400" />
            <span>{t('vault.title')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('vault.subtitle')}
          </p>
        </div>

        {/* Tab Switcher & Actions */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            <button
              onClick={() => setActiveTab('records')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'records'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('vault.recordsTitle')} ({records.length})
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'report'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('vault.createReportTab')}</span>
            </button>
          </div>

          {records.length > 0 && activeTab === 'records' && (
            <button
              onClick={handleClearAll}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs transition-colors cursor-pointer"
              title={t('vault.clearAll')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckSquare className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* VIEW TAB 1: EVIDENCE RECORDS LIST */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-mono">Filter Type:</span>
            {[
              { id: 'all', label: 'All Records' },
              { id: 'watermark', label: t('vault.recordTypes.watermark') },
              { id: 'comparison', label: t('vault.recordTypes.comparison') },
              { id: 'comments', label: t('vault.recordTypes.comments') },
              { id: 'casting', label: t('vault.recordTypes.casting') },
              { id: 'incident', label: t('vault.recordTypes.incident') },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                  typeFilter === f.id
                    ? 'bg-purple-950/60 border-purple-500 text-purple-300 font-bold'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredRecords.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 space-y-4">
              <Archive className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-slate-300">
                {t('vault.recordsTitle')} Empty
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {t('vault.emptyState')}
              </p>
              <button
                onClick={() => setActiveTab('report')}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>File New Incident Report</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRecords.map((record) => {
                const Icon = getRecordIcon(record.type);
                return (
                  <div
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {record.id.substring(0, 14)}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-200 group-hover:text-purple-300 transition-colors mb-1 truncate">
                        {record.title || record.id}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {record.summary || record.description || 'Recorded verification signal'}
                      </p>

                      {record.originalHash && (
                        <div className="text-[10px] font-mono bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-400 space-y-0.5 mb-2">
                          <span className="block truncate">Orig: {record.originalHash}</span>
                          <span className="block truncate text-cyan-400">Prot: {record.protectedHash}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(record.timestamp).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(record.id, e)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          title={t('vault.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-purple-400 font-semibold group-hover:underline">
                          {t('vault.details')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW TAB 2: COMPILE & EXPORT INCIDENT REPORT */}
      {activeTab === 'report' && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 max-w-4xl mx-auto space-y-6">
          <div className="pb-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              <span>{t('vault.reportForm.title')}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Assemble a verified incident dossier with attached cryptographic hashes, metrics, and statements for legal counsel or cyber crime reporting.
            </p>
          </div>

          <form onSubmit={handleGeneratePdf} className="space-y-6">
            
            {/* Platform & Classification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Platform */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('vault.reportForm.platform')}
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="instagram">{t('vault.reportForm.platforms.instagram')}</option>
                  <option value="youtube">{t('vault.reportForm.platforms.youtube')}</option>
                  <option value="whatsapp">{t('vault.reportForm.platforms.whatsapp')}</option>
                  <option value="facebook">{t('vault.reportForm.platforms.facebook')}</option>
                  <option value="x">{t('vault.reportForm.platforms.x')}</option>
                  <option value="email">{t('vault.reportForm.platforms.email')}</option>
                  <option value="other">{t('vault.reportForm.platforms.other')}</option>
                </select>
              </div>

              {/* Incident Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('vault.reportForm.incidentType')}
                </label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="harassment">{t('vault.reportForm.incidentTypes.harassment')}</option>
                  <option value="threat">{t('vault.reportForm.incidentTypes.threat')}</option>
                  <option value="imageMisuse">{t('vault.reportForm.incidentTypes.imageMisuse')}</option>
                  <option value="castingCoercion">{t('vault.reportForm.incidentTypes.castingCoercion')}</option>
                  <option value="piiExposure">{t('vault.reportForm.incidentTypes.piiExposure')}</option>
                  <option value="other">{t('vault.reportForm.incidentTypes.other')}</option>
                </select>
              </div>
            </div>

            {/* Date and Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('vault.reportForm.dateTime')}
              </label>
              <input
                type="datetime-local"
                value={incidentDateTime}
                onChange={(e) => setIncidentDateTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Comprehensive Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('vault.reportForm.description')}
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('vault.reportForm.descriptionPlaceholder')}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 leading-relaxed"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('vault.reportForm.notes')}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('vault.reportForm.notesPlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Attach Preserved Vault Records */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                {t('vault.reportForm.attachEvidence')} ({attachedRecordIds.length} Selected)
              </label>
              
              {records.length === 0 ? (
                <p className="text-xs text-slate-500 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  No module records saved in Vault yet. You can still file the incident statement.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                  {records.filter(r => r.type !== 'incident').map((rec) => {
                    const isAttached = attachedRecordIds.includes(rec.id);
                    return (
                      <div
                        key={rec.id}
                        onClick={() => toggleAttachRecord(rec.id)}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isAttached
                            ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          {isAttached ? (
                            <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span className="font-semibold capitalize truncate">{rec.type}: {rec.title || rec.id}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {new Date(rec.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Submit & Generate PDF Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isGeneratingPdf}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <>
                    <Download className="w-4 h-4 animate-bounce" />
                    <span>{t('vault.reportForm.generatingPdf')}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{t('vault.reportForm.downloadPdf')}</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl max-w-2xl w-full border border-slate-700 p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-100 truncate max-w-md">
                  {selectedRecord.title || selectedRecord.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono">
                <div>Type: <strong className="text-slate-200 capitalize">{selectedRecord.type}</strong></div>
                <div>Recorded: <strong className="text-slate-200">{new Date(selectedRecord.timestamp).toLocaleString()}</strong></div>
              </div>

              {selectedRecord.originalHash && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
                  <span className="text-slate-400 block">Original SHA-256:</span>
                  <code className="text-cyan-400 break-all select-all block">{selectedRecord.originalHash}</code>
                  <span className="text-slate-400 block mt-2">Protected SHA-256:</span>
                  <code className="text-purple-400 break-all select-all block">{selectedRecord.protectedHash}</code>
                </div>
              )}

              {selectedRecord.previewDataUrl && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Preserved Artifact Preview:</span>
                  <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 max-h-60 flex items-center justify-center">
                    <img src={selectedRecord.previewDataUrl} alt="Vault Artifact" className="max-h-60 w-auto object-contain" />
                  </div>
                </div>
              )}

              {selectedRecord.description && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Full Statement / Description:</span>
                  <p className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-slate-200 leading-relaxed">
                    {selectedRecord.description}
                  </p>
                </div>
              )}

              {selectedRecord.matchedSignals && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Warning Signals:</span>
                  <div className="space-y-1">
                    {selectedRecord.matchedSignals.map((s, i) => (
                      <div key={i} className="p-2 rounded bg-rose-950/40 border border-rose-900 text-rose-300">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between">
              <button
                type="button"
                onClick={(e) => handleDelete(selectedRecord.id, e)}
                className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold hover:bg-rose-900/60 transition-colors cursor-pointer"
              >
                Delete Record
              </button>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Storage Privacy Advisory */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-purple-300">IndexedDB Sovereign Storage:</span> All evidence records are stored in your local browser sandbox. They are never transmitted or retained on remote servers unless you export your verifiable PDF dossier.
        </p>
      </div>

    </div>
  );
}
