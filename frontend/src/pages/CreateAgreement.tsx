import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePoT } from '../context/PoTContext';
import './CreateAgreement.css';

const CreateAgreement: React.FC = () => {
  const { connected, connectWallet, createAgreement, MIN_STAKE, address } = usePoT();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    partyB: '',
    stakeAmount: '',
    deadlineBlocks: '1440', // ~10 days default
    resolver: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [txSuccess, setTxSuccess] = useState(false);

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validate = () => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.partyB.trim()) return 'Counterparty address is required';
    if (form.partyB === address) return 'Counterparty cannot be your own address';
    if (!form.stakeAmount || parseFloat(form.stakeAmount) < MIN_STAKE)
      return `Minimum stake is ${MIN_STAKE} STX`;
    if (!form.deadlineBlocks || parseInt(form.deadlineBlocks) < 1)
      return 'Deadline must be at least 1 block';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setIsSubmitting(true);
    setError('');
    try {
      await createAgreement({
        title: form.title,
        description: form.description,
        partyB: form.partyB,
        stakeAmount: parseFloat(form.stakeAmount),
        deadlineBlocks: parseInt(form.deadlineBlocks),
        resolver: form.resolver || undefined,
      });
      setTxSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="create-page">
        <div className="not-connected-card card">
          <div className="nc-icon">🔒</div>
          <h2>Wallet Required</h2>
          <p>Connect your Hiro wallet to create trust agreements.</p>
          <button className="btn-primary" onClick={connectWallet}>Connect Wallet</button>
        </div>
      </div>
    );
  }

  if (txSuccess) {
    return (
      <div className="create-page">
        <div className="success-card card">
          <div className="success-icon">✓</div>
          <h2>Agreement Submitted</h2>
          <p>Your transaction has been broadcast to the Stacks network. It will be confirmed in the next block.</p>
          <div className="success-actions">
            <Link to="/" className="btn-primary">View Dashboard</Link>
            <button
              className="btn-secondary"
              onClick={() => { setTxSuccess(false); setForm({ title: '', description: '', partyB: '', stakeAmount: '', deadlineBlocks: '1440', resolver: '' }); }}
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const estimatedDays = Math.round((parseInt(form.deadlineBlocks) * 10) / 60 / 24);

  return (
    <div className="create-page">
      {/* Header */}
      <div className="create-header">
        <Link to="/" className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </Link>
        <h1>New Agreement</h1>
        <p className="create-subtitle">
          Define terms, set stakes, and create an enforceable trust agreement on Bitcoin.
        </p>
      </div>

      {/* Step indicator */}
      <div className="step-indicator">
        <div className="step active">
          <div className="step-num">1</div>
          <div className="step-label">Create</div>
        </div>
        <div className="step-line" />
        <div className="step">
          <div className="step-num">2</div>
          <div className="step-label">Accept</div>
        </div>
        <div className="step-line" />
        <div className="step">
          <div className="step-num">3</div>
          <div className="step-label">Resolve</div>
        </div>
      </div>

      <form className="create-form" onSubmit={handleSubmit}>
        {/* Agreement details */}
        <div className="form-section card">
          <div className="section-header">
            <h3>Agreement Details</h3>
            <span className="section-tag">Required</span>
          </div>

          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              placeholder="e.g. Website Development Contract"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              maxLength={100}
            />
            <span className="input-hint">{form.title.length}/100</span>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              placeholder="Describe the terms of this agreement…"
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={4}
              maxLength={500}
            />
            <span className="input-hint">{form.description.length}/500</span>
          </div>
        </div>

        {/* Parties */}
        <div className="form-section card">
          <div className="section-header">
            <h3>Parties</h3>
          </div>

          <div className="form-group">
            <label>Party A (You)</label>
            <div className="address-display mono">{address}</div>
          </div>

          <div className="form-group">
            <label htmlFor="partyB">Party B — Counterparty Address</label>
            <input
              id="partyB"
              type="text"
              placeholder="SP... or ST..."
              value={form.partyB}
              onChange={e => update('partyB', e.target.value)}
            />
            <span className="input-hint">The wallet address of the other party</span>
          </div>
        </div>

        {/* Stake & Deadline */}
        <div className="form-section card">
          <div className="section-header">
            <h3>Stake & Deadline</h3>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="stakeAmount">Stake Amount (STX)</label>
              <div className="input-with-unit">
                <input
                  id="stakeAmount"
                  type="number"
                  step="0.1"
                  min={MIN_STAKE}
                  placeholder={`Min ${MIN_STAKE}`}
                  value={form.stakeAmount}
                  onChange={e => update('stakeAmount', e.target.value)}
                />
                <span className="unit-label">STX</span>
              </div>
              <span className="input-hint">Each party stakes this amount. Winner keeps both.</span>
            </div>

            <div className="form-group">
              <label htmlFor="deadlineBlocks">Deadline (Blocks)</label>
              <input
                id="deadlineBlocks"
                type="number"
                min="1"
                placeholder="1440"
                value={form.deadlineBlocks}
                onChange={e => update('deadlineBlocks', e.target.value)}
              />
              {form.deadlineBlocks && (
                <span className="input-hint">≈ {estimatedDays} day{estimatedDays !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>

        {/* Optional: Resolver */}
        <div className="form-section card">
          <div className="section-header">
            <h3>Resolver</h3>
            <span className="section-tag optional">Optional</span>
          </div>
          <p className="section-desc">A trusted third-party who can settle disputes. Leave blank for mutual resolution only.</p>
          <div className="form-group">
            <label htmlFor="resolver">Resolver Address</label>
            <input
              id="resolver"
              type="text"
              placeholder="SP... (optional)"
              value={form.resolver}
              onChange={e => update('resolver', e.target.value)}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {/* Preview */}
        {form.stakeAmount && form.title && (
          <div className="preview-banner">
            <div className="preview-row">
              <span className="preview-label">Agreement</span>
              <span className="preview-val">{form.title}</span>
            </div>
            <div className="preview-row">
              <span className="preview-label">Total Locked</span>
              <span className="preview-val bitcoin">
                {(parseFloat(form.stakeAmount || '0') * 2).toFixed(2)} STX
              </span>
            </div>
          </div>
        )}

        <button type="submit" className="btn-submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner" />
              Awaiting Signature…
            </>
          ) : (
            <>
              Create Agreement
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default CreateAgreement;
