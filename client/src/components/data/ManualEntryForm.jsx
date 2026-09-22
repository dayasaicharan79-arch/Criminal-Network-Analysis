/**
 * CONSTELLATION — Manual Data Entry Workflow Component
 *
 * Progressive Workflow:
 * SELECT DATA TYPE -> ENTER INFORMATION -> VALIDATE (DRY-RUN) -> REVIEW -> CREATE RECORD -> UPDATE INVESTIGATION
 */
import React, { useState } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import { api } from '../../api/client.js';
import { ENTITY_TYPES, ENTITY_TYPE_LABELS, ENTITY_CATEGORIES } from '@constellation/shared/constants.js';
import {
  User,
  ShieldAlert,
  Building,
  Phone,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export function ManualEntryForm() {
  const { activeCaseId, refreshInvestigationData, selectEntity } = useInvestigationStore();

  const [step, setStep] = useState(1); // 1: Select Type, 2: Enter Details, 3: Validate & Review
  const [selectedType, setSelectedType] = useState(ENTITY_TYPES.PERSON);

  // Form Fields
  const [formData, setFormData] = useState({
    label: '',
    subType: '',
    confidence: 0.95,
    // Person / Suspect
    alias: '',
    nationality: 'Indian',
    riskLevel: 'MEDIUM',
    // Phone / Device
    phoneNumber: '',
    imei: '',
    // Vehicle
    plate: '',
    model: '',
    // Location
    address: '',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.6139,
    longitude: 77.2090,
    // Event
    eventTitle: '',
    eventType: 'CASE_EVENT',
    timestamp: new Date().toISOString().substring(0, 16),
    // Transaction
    amount: '',
    currency: 'INR',
    transactionType: 'HAWALA_MIRROR',
    transactionRef: '',
    sender: '',
    receiver: '',
    // Evidence
    evidenceType: 'DOCUMENT',
    hash: '',
    // Organization
    registrationNo: '',
    jurisdiction: '',
    keyPersons: '',
    legalStatus: 'ACTIVE',
    // FIR
    firNumber: '',
    policeStation: '',
    sectionsOfLaw: '',
    investigatingOfficer: '',
    filingDate: new Date().toISOString().substring(0, 10),
  });

  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setStep(1);
    setValidationResult(null);
    setStatusMessage(null);
    setFormData({
      label: '',
      subType: '',
      confidence: 0.95,
      alias: '',
      nationality: 'Indian',
      riskLevel: 'MEDIUM',
      phoneNumber: '',
      imei: '',
      plate: '',
      model: '',
      address: '',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
      eventTitle: '',
      eventType: 'CASE_EVENT',
      timestamp: new Date().toISOString().substring(0, 16),
      amount: '',
      currency: 'INR',
      transactionType: 'HAWALA_MIRROR',
      transactionRef: '',
      sender: '',
      receiver: '',
      evidenceType: 'DOCUMENT',
      hash: '',
      registrationNo: '',
      jurisdiction: '',
      keyPersons: '',
      legalStatus: 'ACTIVE',
      firNumber: '',
      policeStation: '',
      sectionsOfLaw: '',
      investigatingOfficer: '',
      filingDate: new Date().toISOString().substring(0, 10),
    });
  };

  // Prepare payload based on selected type
  const preparePayload = () => {
    const isLocation = selectedType === ENTITY_TYPES.LOCATION;
    const isEvent = selectedType === ENTITY_TYPES.EVENT || selectedType === ENTITY_TYPES.TIMELINE_EVENT;
    const isEvidence = selectedType === ENTITY_TYPES.EVIDENCE;

    if (isLocation) {
      return {
        source: 'manual',
        caseId: activeCaseId,
        locations: [{
          id: `LOC-MANUAL-${Date.now()}`,
          name: formData.label || `${formData.city} Site`,
          city: formData.city,
          state: formData.state,
          address: formData.address,
          latitude: parseFloat(formData.latitude) || 28.6139,
          longitude: parseFloat(formData.longitude) || 77.2090,
          confidence: parseFloat(formData.confidence) || 1.0,
          source: 'MANUAL_INVESTIGATION_ENTRY',
        }],
      };
    }

    if (isEvent) {
      return {
        source: 'manual',
        caseId: activeCaseId,
        events: [{
          id: `EVT-MANUAL-${Date.now()}`,
          title: formData.eventTitle || formData.label || 'Investigation Event',
          eventType: formData.eventType,
          timestamp: new Date(formData.timestamp).toISOString(),
          severity: formData.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
        }],
      };
    }

    if (isEvidence) {
      return {
        source: 'manual',
        caseId: activeCaseId,
        evidence: [{
          id: `EVI-MANUAL-${Date.now()}`,
          title: formData.label || 'Recovered Evidence Item',
          evidenceType: formData.evidenceType,
          hash: formData.hash || undefined,
          confidence: parseFloat(formData.confidence) || 1.0,
          source: 'MANUAL_INVESTIGATION_ENTRY',
        }],
      };
    }

    // Default: Entity
    const attrs = {
      isManualEntry: true,
    };
    if (formData.alias) attrs.alias = formData.alias;
    if (formData.phoneNumber) attrs.phoneNumber = formData.phoneNumber;
    if (formData.imei) attrs.imei = formData.imei;
    if (formData.plate) attrs.plate = formData.plate;
    if (formData.riskLevel) attrs.riskLevel = formData.riskLevel;

    // Organization attributes
    if (selectedType === ENTITY_TYPES.ORGANIZATION) {
      if (formData.registrationNo) attrs.registrationNo = formData.registrationNo;
      if (formData.jurisdiction) attrs.jurisdiction = formData.jurisdiction;
      if (formData.keyPersons) attrs.keyPersons = formData.keyPersons;
      if (formData.legalStatus) attrs.legalStatus = formData.legalStatus;
    }

    // Transaction attributes
    if (selectedType === ENTITY_TYPES.TRANSACTION) {
      if (formData.amount) attrs.amount = formData.amount;
      if (formData.currency) attrs.currency = formData.currency;
      if (formData.transactionType) attrs.transactionType = formData.transactionType;
      if (formData.transactionRef) attrs.transactionRef = formData.transactionRef;
      if (formData.sender) attrs.sender = formData.sender;
      if (formData.receiver) attrs.receiver = formData.receiver;
    }

    // FIR attributes
    if (selectedType === ENTITY_TYPES.FIR) {
      if (formData.firNumber) attrs.firNumber = formData.firNumber;
      if (formData.policeStation) attrs.policeStation = formData.policeStation;
      if (formData.sectionsOfLaw) attrs.sectionsOfLaw = formData.sectionsOfLaw;
      if (formData.investigatingOfficer) attrs.investigatingOfficer = formData.investigatingOfficer;
      if (formData.filingDate) attrs.filingDate = formData.filingDate;
    }

    return {
      source: 'manual',
      caseId: activeCaseId,
      entities: [{
        id: `${selectedType.substring(0, 3).toUpperCase()}-MANUAL-${Date.now()}`,
        type: selectedType,
        label: formData.label.trim(),
        subType: formData.subType.trim() || undefined,
        caseIds: [activeCaseId],
        confidence: parseFloat(formData.confidence) || 1.0,
        attributes: attrs,
        source: 'MANUAL_INVESTIGATION_ENTRY',
      }],
    };
  };

  // Step 2 -> Step 3: Run Validation Dry-Run
  const handleValidate = async () => {
    if (!formData.label && selectedType !== ENTITY_TYPES.EVENT) {
      setStatusMessage({ type: 'error', text: 'Label / Name is required' });
      return;
    }

    setValidating(true);
    setStatusMessage(null);

    try {
      const payload = preparePayload();
      const res = await api.validateIngest(payload);

      setValidationResult(res.data);
      if (res.data.summary.rejected > 0) {
        setStatusMessage({
          type: 'error',
          text: `Validation found ${res.data.rejections.length} error(s). Please review below.`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: 'Record successfully validated by backend pipeline! Ready to commit.',
        });
        setStep(3);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Validation request failed' });
    } finally {
      setValidating(false);
    }
  };

  // Step 3 -> Commit to Datastore
  const handleCommit = async () => {
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = preparePayload();
      const res = await api.ingest(payload);

      if (res.data.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully ingested record into ${activeCaseId}! Refreshed investigation state.`,
        });

        // Trigger targeted refresh of all views
        await refreshInvestigationData();

        // If an entity was created, select it
        if (res.data.summary.entitiesCreated > 0 && payload.entities?.[0]?.id) {
          selectEntity(payload.entities[0].id);
        }

        // Reset to Step 1 after brief delay
        setTimeout(() => {
          handleReset();
        }, 1800);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Ingestion failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Progress Wizard Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
          }}>
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              background: step === 1 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
              color: step === 1 ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
            }}>
              1. SELECT TYPE
            </span>
            <ArrowRight size={12} color="var(--text-muted)" />
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              background: step === 2 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
              color: step === 2 ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
            }}>
              2. ENTER DATA
            </span>
            <ArrowRight size={12} color="var(--text-muted)" />
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              background: step === 3 ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.1)',
              color: step === 3 ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
            }}>
              3. VALIDATE & COMMIT
            </span>
          </div>
        </div>

        <button onClick={handleReset} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {statusMessage && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          border: `1px solid ${statusMessage.type === 'error' ? 'var(--accent-crimson)' : 'var(--accent-emerald)'}`,
          color: statusMessage.type === 'error' ? '#fca5a5' : '#86efac',
        }}>
          {statusMessage.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* STEP 1: Select Type */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
            Select Investigation Entity Type
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '8px',
          }}>
            {Object.entries(ENTITY_TYPES).map(([key, typeVal]) => {
              const label = ENTITY_TYPE_LABELS[typeVal] || typeVal;
              const isSelected = selectedType === typeVal;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedType(typeVal);
                    setStep(2);
                  }}
                  className={`btn ${isSelected ? 'btn-active' : 'btn-ghost'}`}
                  style={{
                    padding: '10px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {typeVal}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: Context-Sensitive Form */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '8px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
              Configuring: {ENTITY_TYPE_LABELS[selectedType] || selectedType} ({selectedType})
            </div>
            <button
              onClick={() => setStep(1)}
              className="btn btn-ghost"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              Change Type
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Common: Label */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {selectedType === ENTITY_TYPES.LOCATION ? 'Location Name / Landmark *' :
                 selectedType === ENTITY_TYPES.PHONE ? 'Phone Number or User Label *' :
                 selectedType === ENTITY_TYPES.VEHICLE ? 'Vehicle Registration / Plate *' :
                 'Primary Name / Label *'}
              </label>
              <input
                type="text"
                placeholder="e.g. Tariq 'Sultan' Mansoor or +91 98765 43210"
                value={formData.label}
                onChange={e => handleFieldChange('label', e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* SubType */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Role / SubType / Specialization
              </label>
              <input
                type="text"
                placeholder="e.g. Courier, Hawaladar, Burner"
                value={formData.subType}
                onChange={e => handleFieldChange('subType', e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Confidence */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Confidence Score (0.0 to 1.0): {formData.confidence}
              </label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.01"
                value={formData.confidence}
                onChange={e => handleFieldChange('confidence', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
              />
            </div>

            {/* Specific to Person / Suspect */}
            {(selectedType === ENTITY_TYPES.PERSON || selectedType === ENTITY_TYPES.SUSPECT || selectedType === ENTITY_TYPES.CRIMINAL) && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Alias / Street Nickname
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Blade / Vicky"
                    value={formData.alias}
                    onChange={e => handleFieldChange('alias', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Risk Level
                  </label>
                  <select
                    value={formData.riskLevel}
                    onChange={e => handleFieldChange('riskLevel', e.target.value)}
                    style={{
                      width: '100%',
                      background: '#07090e',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </>
            )}

            {/* Specific to Phone / Device */}
            {(selectedType === ENTITY_TYPES.PHONE || selectedType === ENTITY_TYPES.DEVICE) && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Phone Number (E.164 or Indian 10-digit)
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phoneNumber}
                    onChange={e => handleFieldChange('phoneNumber', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Hardware IMEI (15 Digits)
                  </label>
                  <input
                    type="text"
                    placeholder="864209040112340"
                    value={formData.imei}
                    onChange={e => handleFieldChange('imei', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </>
            )}

            {/* Specific to Vehicle */}
            {selectedType === ENTITY_TYPES.VEHICLE && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Vehicle Plate Number
                  </label>
                  <input
                    type="text"
                    placeholder="DL-10-CA-4491"
                    value={formData.plate}
                    onChange={e => handleFieldChange('plate', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Make & Model
                  </label>
                  <input
                    type="text"
                    placeholder="Toyota Fortuner / Scorpio"
                    value={formData.model}
                    onChange={e => handleFieldChange('model', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </>
            )}

            {/* Specific to Location */}
            {selectedType === ENTITY_TYPES.LOCATION && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="New Delhi"
                    value={formData.city}
                    onChange={e => handleFieldChange('city', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    State / Region
                  </label>
                  <input
                    type="text"
                    placeholder="Delhi"
                    value={formData.state}
                    onChange={e => handleFieldChange('state', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Latitude (-90 to 90)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={e => handleFieldChange('latitude', parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Longitude (-180 to 180)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={e => handleFieldChange('longitude', parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="Plot 42, Okhla Phase III, Industrial Area"
                    value={formData.address}
                    onChange={e => handleFieldChange('address', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </>
            )}

            {/* Specific to Organization */}
            {selectedType === ENTITY_TYPES.ORGANIZATION && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Registration No / CIN / Trade License
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. U74999DL2018PTC123456 or DMCC-98214"
                    value={formData.registrationNo}
                    onChange={e => handleFieldChange('registrationNo', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Jurisdiction / Incorporation Authority
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MCA Delhi / DMCC Dubai, UAE"
                    value={formData.jurisdiction}
                    onChange={e => handleFieldChange('jurisdiction', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Key Persons / Directors / Signatories
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tariq Mansoor (Managing Director)"
                    value={formData.keyPersons}
                    onChange={e => handleFieldChange('keyPersons', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Corporate / Operational Status
                  </label>
                  <select
                    value={formData.legalStatus}
                    onChange={e => handleFieldChange('legalStatus', e.target.value)}
                    style={{
                      width: '100%',
                      background: '#07090e',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  >
                    <option value="ACTIVE">ACTIVE / OPERATING</option>
                    <option value="SUSPECTED_SHELL">SUSPECTED SHELL COMPANY</option>
                    <option value="HAWALA_FRONT">IDENTIFIED HAWALA FRONT</option>
                    <option value="UNDER_AUDIT">UNDER REGULATORY AUDIT</option>
                    <option value="DEREGISTERED">DEREGISTERED / STRUCK OFF</option>
                  </select>
                </div>
              </>
            )}

            {/* Specific to Transaction */}
            {selectedType === ENTITY_TYPES.TRANSACTION && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Transaction Amount
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 14,50,00,000 or 500,000"
                    value={formData.amount}
                    onChange={e => handleFieldChange('amount', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Currency & Channel Mode
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={formData.currency}
                      onChange={e => handleFieldChange('currency', e.target.value)}
                      style={{
                        width: '90px',
                        background: '#07090e',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="AED">AED (د.إ)</option>
                      <option value="USD">USD ($)</option>
                      <option value="USDT">USDT</option>
                    </select>
                    <select
                      value={formData.transactionType}
                      onChange={e => handleFieldChange('transactionType', e.target.value)}
                      style={{
                        flex: 1,
                        background: '#07090e',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    >
                      <option value="HAWALA_MIRROR">HAWALA MIRROR / CHIT</option>
                      <option value="BANK_WIRE">NEFT / RTGS / WIRE</option>
                      <option value="CRYPTO_USDT">CRYPTO OTC / TRC-20</option>
                      <option value="CASH_HAUL">PHYSICAL CASH CONSIGNMENT</option>
                      <option value="TRADE_ESCROW">TRADE INVOICE / ESCROW</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Reference Number (UTR / TxHash / Chit Code)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-HDFC-9921448 or CHIT-VORTEX-77"
                    value={formData.transactionRef}
                    onChange={e => handleFieldChange('transactionRef', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Originator / Counterparty Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dubai Bullion Escrow ➔ Mumbai Zaveri Bazaar"
                    value={formData.sender}
                    onChange={e => handleFieldChange('sender', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </>
            )}

            {/* Specific to FIR */}
            {selectedType === ENTITY_TYPES.FIR && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    FIR Number & Year *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FIR No. 104/2024"
                    value={formData.firNumber}
                    onChange={e => handleFieldChange('firNumber', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Police Station / Jurisdictional Unit *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special Cell PS, Lodhi Colony"
                    value={formData.policeStation}
                    onChange={e => handleFieldChange('policeStation', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Sections of Law Invoked
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 120B, 420 IPC, 3/4 PMLA, 25 Arms Act"
                    value={formData.sectionsOfLaw}
                    onChange={e => handleFieldChange('sectionsOfLaw', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Investigating Officer (IO) & Filing Date
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="IO Name & Rank"
                      value={formData.investigatingOfficer}
                      onChange={e => handleFieldChange('investigatingOfficer', e.target.value)}
                      style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    />
                    <input
                      type="date"
                      value={formData.filingDate}
                      onChange={e => handleFieldChange('filingDate', e.target.value)}
                      style={{
                        width: '130px',
                        background: '#07090e',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '12px' }}
            >
              {validating ? 'Validating...' : 'Validate Record & Preview'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Commit */}
      {step === 3 && validationResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            padding: '12px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-medium)',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '8px' }}>
              Validation Review Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <div>Submitted: <strong>{validationResult.summary.submitted}</strong></div>
              <div>Accepted: <strong style={{ color: 'var(--accent-emerald)' }}>{validationResult.summary.accepted}</strong></div>
              <div>Rejected: <strong style={{ color: validationResult.summary.rejected > 0 ? 'var(--accent-crimson)' : 'var(--text-muted)' }}>{validationResult.summary.rejected}</strong></div>
            </div>

            {/* Deduplication & Entity Resolution Feedback */}
            {validationResult.resolutionLog?.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Resolution Action: <span className="badge badge-cyan">{validationResult.resolutionLog[0].action}</span>
                {validationResult.resolutionLog[0].matchType && (
                  <span style={{ marginLeft: '6px' }}>Matched on: {validationResult.resolutionLog[0].matchType}</span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              Edit Details
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={submitting}
              className="btn btn-primary"
              style={{
                padding: '8px 20px',
                fontSize: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              }}
            >
              {submitting ? 'Committing...' : 'Confirm & Ingest Record'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManualEntryForm;
