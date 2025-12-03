import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Upload, FileSpreadsheet, Camera, Loader2, Check, Edit3, Maximize2, Table } from 'lucide-react';

export default function NewExperimentModal({ onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [parameters, setParameters] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [newParam, setNewParam] = useState({ name: '', unit: '' });
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showFullTable, setShowFullTable] = useState(false);
  
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const addParameter = () => {
    if (!newParam.name.trim()) return;
    setParameters([...parameters, { ...newParam, id: Date.now() }]);
    setNewParam({ name: '', unit: '' });
  };

  const removeParameter = (id) => {
    setParameters(parameters.filter(p => p.id !== id));
  };

  const addDataRow = () => {
    const newRow = { id: Date.now() };
    parameters.forEach(p => {
      newRow[p.name] = '';
    });
    setDataRows([...dataRows, newRow]);
  };

  const updateDataCell = (rowId, paramName, value) => {
    setDataRows(dataRows.map(row => 
      row.id === rowId ? { ...row, [paramName]: value } : row
    ));
  };

  const removeDataRow = (rowId) => {
    setDataRows(dataRows.filter(row => row.id !== rowId));
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/excel', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to process file');
      }

      const result = await response.json();
      
      if (result.parameters && result.parameters.length > 0) {
        setParameters(result.parameters.map((p, i) => ({
          id: Date.now() + i,
          name: p.name,
          unit: p.unit || ''
        })));
      }

      if (result.data && result.data.length > 0) {
        setDataRows(result.data.map((row, i) => ({
          id: Date.now() + i,
          ...row
        })));
      }

      setUploadSuccess(true);
    } catch (err) {
      setUploadError(err.message || 'Failed to process Excel file. Please check the format.');
      console.error(err);
    } finally {
      setUploadLoading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to process image');
      }

      const result = await response.json();
      
      if (result.parameters && result.parameters.length > 0) {
        setParameters(result.parameters.map((p, i) => ({
          id: Date.now() + i,
          name: p.name,
          unit: p.unit || ''
        })));
      }

      if (result.data && result.data.length > 0) {
        setDataRows(result.data.map((row, i) => ({
          id: Date.now() + i,
          ...row
        })));
      }

      setUploadSuccess(true);
    } catch (err) {
      setUploadError(err.message || 'Failed to process image. Please try a clearer photo.');
      console.error(err);
    } finally {
      setUploadLoading(false);
      // Reset file input
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const goToStep3 = () => {
    if (parameters.length === 0) return;
    if (dataRows.length === 0) {
      const initialRow = { id: Date.now() };
      parameters.forEach(p => {
        initialRow[p.name] = '';
      });
      setDataRows([initialRow]);
    }
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      const formattedParams = parameters.map(p => ({
        name: p.name,
        unit: p.unit
      }));
      
      const formattedData = dataRows.map(row => {
        const rowData = {};
        parameters.forEach(p => {
          rowData[p.name] = row[p.name];
        });
        return rowData;
      });

      await onCreate({
        name,
        parameters: formattedParams,
        data: formattedData,
        result: null
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setParameters([]);
    setDataRows([]);
    setUploadSuccess(false);
    setUploadError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">New Experiment</h2>
            <p className="text-sm text-gray-500">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-5 pt-4">
          <div className="flex gap-2">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className={step >= 1 ? 'text-primary-600 font-medium' : ''}>Basic Info</span>
            <span className={step >= 2 ? 'text-primary-600 font-medium' : ''}>Parameters</span>
            <span className={step >= 3 ? 'text-primary-600 font-medium' : ''}>Enter Data</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experiment Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Temperature Sensitivity Test"
                  className="input"
                  autoFocus
                />
              </div>

              {/* Upload Options */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Quick Import (Optional)
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Upload an Excel file or photo of a data sheet to automatically extract parameters and data
                </p>

                {!uploadSuccess ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadLoading}
                      className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50"
                    >
                      {uploadLoading ? (
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-600">Upload Excel/CSV</span>
                      <span className="text-xs text-gray-400">.xlsx, .xls, .csv</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />

                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadLoading}
                      className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50"
                    >
                      {uploadLoading ? (
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                      ) : (
                        <Camera className="w-8 h-8 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-600">Upload Photo</span>
                      <span className="text-xs text-gray-400">.jpg, .png, .heic</span>
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  /* Upload Success - Clickable Card */
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowFullTable(true)}
                      className="w-full p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-500 rounded-lg">
                            <Table className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              Data Imported Successfully
                            </p>
                            <p className="text-xs text-green-600">
                              {parameters.length} columns × {dataRows.length} rows
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-green-600 group-hover:text-green-800">
                          <span className="text-xs font-medium">View Full Table</span>
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </div>
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={resetUpload}
                        className="flex-1 text-sm text-gray-500 hover:text-gray-700 py-2"
                      >
                        Upload different file
                      </button>
                      <button
                        onClick={() => setStep(3)}
                        className="flex-1 text-sm text-primary-600 hover:text-primary-800 py-2 font-medium flex items-center justify-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit Data
                      </button>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="mt-3 text-sm text-red-500">{uploadError}</p>
                )}
              </div>

              {!uploadSuccess && (
                <p className="text-sm text-gray-500 pt-2">
                  Or continue to manually define your parameters in the next step.
                </p>
              )}
            </div>
          )}

          {/* Step 2: Define Parameters */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Define the parameters you'll be measuring. These become columns in your data table.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newParam.name}
                  onChange={(e) => setNewParam({ ...newParam, name: e.target.value })}
                  placeholder="Parameter name (e.g., Temperature)"
                  className="input flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addParameter()}
                />
                <input
                  type="text"
                  value={newParam.unit}
                  onChange={(e) => setNewParam({ ...newParam, unit: e.target.value })}
                  placeholder="Unit (e.g., °C)"
                  className="input w-28"
                  onKeyDown={(e) => e.key === 'Enter' && addParameter()}
                />
                <button
                  onClick={addParameter}
                  disabled={!newParam.name.trim()}
                  className="btn btn-primary px-4 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {parameters.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-4 font-medium text-gray-600">Parameter</th>
                        <th className="text-left py-2 px-4 font-medium text-gray-600">Unit</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parameters.map((param) => (
                        <tr key={param.id} className="border-t border-gray-100">
                          <td className="py-2 px-4 text-gray-900">{param.name}</td>
                          <td className="py-2 px-4 text-gray-500">{param.unit || '-'}</td>
                          <td className="py-2 px-2">
                            <button
                              onClick={() => removeParameter(param.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-500">No parameters added yet</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Enter Data */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Enter your experimental data. Each row is one measurement.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFullTable(true)}
                    className="btn btn-secondary text-sm flex items-center gap-1"
                  >
                    <Maximize2 className="w-4 h-4" />
                    Expand
                  </button>
                  <button
                    onClick={addDataRow}
                    className="btn btn-primary text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Row
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-600 w-12">#</th>
                        {parameters.map((param) => (
                          <th key={param.id} className="text-left py-2 px-3 font-medium text-gray-600">
                            {param.name}
                            {param.unit && <span className="text-gray-400 font-normal ml-1">({param.unit})</span>}
                          </th>
                        ))}
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataRows.map((row, index) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="py-2 px-3 text-gray-500">{index + 1}</td>
                          {parameters.map((param) => (
                            <td key={param.id} className="py-1 px-2">
                              <input
                                type="text"
                                value={row[param.name] || ''}
                                onChange={(e) => updateDataCell(row.id, param.name, e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                                placeholder="—"
                              />
                            </td>
                          ))}
                          <td className="py-2 px-2">
                            <button
                              onClick={() => removeDataRow(row.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {dataRows.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  Click "Add Row" to start entering data
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-100">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="btn btn-secondary flex items-center gap-1 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => step === 2 ? goToStep3() : setStep(step + 1)}
              disabled={(step === 1 && !name.trim()) || (step === 2 && parameters.length === 0)}
              className="btn btn-primary flex items-center gap-1 disabled:opacity-50"
            >
              {step === 1 && uploadSuccess ? 'Review Data' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || dataRows.length === 0}
              className="btn btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Experiment'}
            </button>
          )}
        </div>
      </div>

      {/* Full Table Viewer Modal */}
      {showFullTable && (
        <FullTableViewer
          parameters={parameters}
          dataRows={dataRows}
          onClose={() => setShowFullTable(false)}
        />
      )}
    </div>
  );
}

function FullTableViewer({ parameters, dataRows, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-xl">
              <Table className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Imported Data</h2>
              <p className="text-sm text-gray-500">
                {parameters.length} columns × {dataRows.length} rows
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-5">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b border-gray-200 w-16">
                    Row
                  </th>
                  {parameters.map((param) => (
                    <th 
                      key={param.id} 
                      className="text-left py-3 px-4 font-semibold text-gray-700 border-b border-gray-200"
                    >
                      {param.name}
                      {param.unit && (
                        <span className="text-gray-400 font-normal ml-1">({param.unit})</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, index) => (
                  <tr 
                    key={row.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="py-3 px-4 text-gray-500 font-medium">{index + 1}</td>
                    {parameters.map((param) => (
                      <td key={param.id} className="py-3 px-4 text-gray-900">
                        {row[param.name] || <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
