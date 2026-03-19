import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePoT, Agreement } from '../context/PoTContext';
import './AgreementDetail.css';

const AgreementDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    address,
    connected,
    connectWallet,
    getAgreement,
    acceptAgreement,
    stakeFunds,
    resolveSuccess,
    resolveFailure,
    raiseDispute,
    resolveDispute,
  } = usePoT();

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [txSent, setTxSent] = useState('');
  const [disputeWinner, setDisputeWinner] = useState('');

  const agreementId = parseInt(id || '0');

  useEffect(() => {
    loadAgreement();
  }, [id]);

  const loadAgreement = async () => {
    setIsLoading(true);
    try {
      const a = await getAgreement(agreementId);
      setAgreement(a);
    } catch {
      setError('Failed to load agreement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setActionLoading(action);
    setError('');
    setTxSent('');
    try {
      await fn();
      setTxSent(`${action} transaction broadcast successfully! Waiting for confirmation…`);
      setTimeout(loadAgreement, 8000);
    } catch (err: any) {
      if (!err?.message?.includes('cancelled')) {
        setError(err?.message || 'Transaction failed');
      }
    } finally {
      setActionLoading('');
    }
  };

  if (isLoading) {
    return (
      <div className="detail-page">
        <div className="skeleton" style={{ height: 48, width: 200, marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="detail-page">
        <div className="not-found card">
          <h2>Agreement Not Found</h2>
          <p>Agreement #{agreementId} does not exist.</p>
          <Link to="/" className="btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const isPartyA = address === agreement.partyA;
  const isPartyB = address === agreement.partyB;
  const isResolver = address === agreement.resolver;
  const isParty = isPartyA || isPartyB;

  const myStaked = isPartyA ? agreement.partyAStaked : isPartyB ? agreement.partyBStaked : false;
  const otherStaked = isPartyA ? agreement.partyBStaked : isPartyB ? agreement.partyAStaked : false;
  const bothStaked = agreement.partyAStaked && agreement.partyBStaked;

  const statusClass = `status-${agreement.status.toLowerCase()}`;
  const formatAddr = (addr: string) => `${addr.slice(0, 10)}…${addr.slice(-6)}`;

  return (
    <div className="detail-page">
      {/* Header */}
      <div className="detail-header">
        <Link to="/" className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Dashboard
        </Link>
        <div className="detail-id-row">
          <span className="detail-id mono">Agreement #{String(agreement.id).padStart(4, '0')}</span>
          <div className={`status-badge ${statusClass}`}>
            <span className="status-dot-sm" />
            {agreement.status}
          </div>
        </div>
        <h1 className="detail-title">{agreement.title}</h1>
        {agreement.description && (
          <p className="detail-desc">{agreement.description}</p>
        )}
      </div>

      <div className="detail-grid">
        {/* Main info */}
        <div className="detail-main">
          {/* Parties */}
          <div className="info-card card">
            <h3 className="info-card-title">Parties</h3>
            <div className="parties-detail">
              <div className={`party-detail-row ${isPartyA ? 'is-you' : ''}`}>
                <div className="party-badge-large">A</div>
                <div className="party-info">
                  <span className="party-role-label">Party A {isPartyA && <span className="you-tag">you</span>}</span>
                  <span className="party-addr-full mono">{formatAddr(agreement.partyA)}</span>
                </div>
                <div className="stake-status">
                  {agreement.partyAStaked ? (
                    <span className="staked-badge">✓ Staked</span>
                  ) : agreement.status === 'PENDING' ? (
                    <span className="not-staked-badge pending">Pending Acceptance</span>
                  ) : (
                    <span className="not-staked-badge">Awaiting Stake</span>
                  )}
                </div>
              </div>

              <div className="parties-divider">⇄</div>

              <div className={`party-detail-row ${isPartyB ? 'is-you' : ''}`}>
                <div className="party-badge-large">B</div>
                <div className="party-info">
                  <span className="party-role-label">Party B {isPartyB && <span className="you-tag">you</span>}</span>
                  <span className="party-addr-full mono">{formatAddr(agreement.partyB)}</span>
                </div>
                <div className="stake-status">
                  {agreement.partyBStaked ? (
                    <span className="staked-badge">✓ Staked</span>
                  ) : agreement.status === 'PENDING' ? (
                    <span className="not-staked-badge pending">Pending Acceptance</span>
                  ) : (
                    <span className="not-staked-badge">Awaiting Stake</span>
                  )}
                </div>
              </div>
            </div>

            {agreement.resolver && (
              <div className="resolver-detail">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                </svg>
                <div>
                  <span className="resolver-label-sm">Resolver {isResolver && <span className="you-tag">you</span>}</span>
                  <span className="resolver-addr-full mono">{formatAddr(agreement.resolver)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="info-card card">
            <h3 className="info-card-title">Terms</h3>
            <div className="terms-grid">
              <div className="term-item">
                <span className="term-label">Stake per Party</span>
                <span className="term-value bitcoin">{agreement.stake} STX</span>
              </div>
              <div className="term-item">
                <span className="term-label">Total Locked</span>
                <span className="term-value">{bothStaked ? (agreement.stake * 2).toFixed(2) : '—'} STX</span>
              </div>
              <div className="term-item">
                <span className="term-label">Deadline Block</span>
                <span className="term-value mono">{agreement.deadline.toLocaleString()}</span>
              </div>
              <div className="term-item">
                <span className="term-label">Created at Block</span>
                <span className="term-value mono">{agreement.createdAt.toLocaleString()}</span>
              </div>
              {agreement.resolvedAt && (
                <div className="term-item">
                  <span className="term-label">Resolved at Block</span>
                  <span className="term-value mono">{agreement.resolvedAt.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stake progress */}
          {agreement.status === 'ACTIVE' && (
            <div className="info-card card">
              <h3 className="info-card-title">Stake Progress</h3>
              <div className="stake-progress">
                <div className={`stake-step ${agreement.partyAStaked ? 'done' : 'pending'}`}>
                  <div className="stake-step-dot" />
                  <span>Party A staked</span>
                </div>
                <div className="stake-step-line" />
                <div className={`stake-step ${agreement.partyBStaked ? 'done' : 'pending'}`}>
                  <div className="stake-step-dot" />
                  <span>Party B staked</span>
                </div>
                <div className="stake-step-line" />
                <div className={`stake-step ${bothStaked ? 'done' : 'pending'}`}>
                  <div className="stake-step-dot" />
                  <span>Fully funded</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <div className="detail-sidebar">
          <div className="actions-card card">
            <h3 className="actions-title">Actions</h3>

            {!connected ? (
              <div className="action-connect">
                <p>Connect wallet to interact with this agreement.</p>
                <button className="btn-action" onClick={connectWallet}>Connect Wallet</button>
              </div>
            ) : !isParty && !isResolver ? (
              <p className="observer-note">You are not a party to this agreement.</p>
            ) : (
              <div className="actions-list">
                {/* Accept (Party B, PENDING) */}
                {isPartyB && agreement.status === 'PENDING' && (
                  <div className="action-item">
                    <div className="action-info">
                      <span className="action-label">Accept Agreement</span>
                      <span className="action-desc">Confirm your participation to activate this agreement.</span>
                    </div>
                    <button
                      className="btn-action success"
                      onClick={() => handleAction('Accept', () => acceptAgreement(agreement.id))}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'Accept' ? <><span className="spinner-sm" />Confirming…</> : '✓ Accept'}
                    </button>
                  </div>
                )}

                {/* Stake (ACTIVE, not yet staked) */}
                {isParty && agreement.status === 'ACTIVE' && !myStaked && (
                  <div className="action-item">
                    <div className="action-info">
                      <span className="action-label">Lock Your Stake</span>
                      <span className="action-desc">Deposit {agreement.stake} STX to fund the agreement.</span>
                    </div>
                    <button
                      className="btn-action bitcoin"
                      onClick={() => handleAction('Stake', () => stakeFunds(agreement.id))}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'Stake' ? <><span className="spinner-sm" />Signing…</> : `Stake ${agreement.stake} STX`}
                    </button>
                  </div>
                )}

                {/* Resolve Success (ACTIVE, both staked) */}
                {isParty && agreement.status === 'ACTIVE' && bothStaked && (
                  <div className="action-item">
                    <div className="action-info">
                      <span className="action-label">Mark as Success</span>
                      <span className="action-desc">Both parties fulfilled the agreement. Stakes returned.</span>
                    </div>
                    <button
                      className="btn-action success"
                      onClick={() => handleAction('Success', () => resolveSuccess(agreement.id))}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'Success' ? <><span className="spinner-sm" />…</> : '✓ Resolve Success'}
                    </button>
                  </div>
                )}

                {/* Resolve Failure (ACTIVE, both staked) */}
                {isParty && agreement.status === 'ACTIVE' && bothStaked && (
                  <div className="action-item">
                    <div className="action-info">
                      <span className="action-label">Declare Failure</span>
                      <span className="action-desc">You failed the agreement. Stake slashed to counterparty.</span>
                    </div>
                    <button
                      className="btn-action danger"
                      onClick={() => handleAction('Failure', () => resolveFailure(agreement.id))}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'Failure' ? <><span className="spinner-sm" />…</> : '✗ Declare Failure'}
                    </button>
                  </div>
                )}

                {/* Raise Dispute (ACTIVE, both staked, has resolver) */}
                {isParty && agreement.status === 'ACTIVE' && bothStaked && agreement.resolver && (
                  <div className="action-item">
                    <div className="action-info">
                      <span className="action-label">Raise Dispute</span>
                      <span className="action-desc">Escalate to the resolver for a decision.</span>
                    </div>
                    <button
                      className="btn-action warn"
                      onClick={() => handleAction('Dispute', () => raiseDispute(agreement.id))}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'Dispute' ? <><span className="spinner-sm" />…</> : '⚠ Raise Dispute'}
                    </button>
                  </div>
                )}

                {/* Resolver actions */}
                {isResolver && agreement.status === 'DISPUTED' && (
                  <div className="action-item resolver-action">
                    <div className="action-info">
                      <span className="action-label">Resolve Dispute</span>
                      <span className="action-desc">Select the winning party. Winner receives both stakes.</span>
                    </div>
                    <div className="resolver-select">
                      <select
                        value={disputeWinner}
                        onChange={e => setDisputeWinner(e.target.value)}
                      >
                        <option value="">— Select winner —</option>
                        <option value={agreement.partyA}>Party A: {formatAddr(agreement.partyA)}</option>
                        <option value={agreement.partyB}>Party B: {formatAddr(agreement.partyB)}</option>
                      </select>
                      <button
                        className="btn-action bitcoin"
                        onClick={() => disputeWinner && handleAction('ResolveDispute', () => resolveDispute(agreement.id, disputeWinner))}
                        disabled={!!actionLoading || !disputeWinner}
                      >
                        {actionLoading === 'ResolveDispute' ? <><span className="spinner-sm" />…</> : 'Confirm Decision'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Terminal states */}
                {['COMPLETED', 'FAILED', 'RESOLVED'].includes(agreement.status) && (
                  <div className="terminal-state">
                    <div className={`terminal-icon ${agreement.status.toLowerCase()}`}>
                      {agreement.status === 'COMPLETED' ? '✓' : agreement.status === 'FAILED' ? '✗' : '⚖'}
                    </div>
                    <span>
                      Agreement {agreement.status.toLowerCase()}.
                      {agreement.resolvedAt && ` Block #${agreement.resolvedAt.toLocaleString()}`}
                    </span>
                  </div>
                )}

                {/* Pending — waiting for party B */}
                {agreement.status === 'PENDING' && isPartyA && (
                  <div className="waiting-state">
                    <div className="animate-pulse">⏳</div>
                    <span>Waiting for Party B to accept…</span>
                  </div>
                )}

                {/* Disputed — waiting for resolver (party view) */}
                {agreement.status === 'DISPUTED' && isParty && !isResolver && (
                  <div className="disputed-waiting-state">
                    <div className="disputed-icon">⚖</div>
                    <div className="disputed-text">
                      <strong>Dispute in progress</strong>
                      <span>The resolver ({agreement.resolver ? `${agreement.resolver.slice(0, 10)}…${agreement.resolver.slice(-6)}` : ''}) has been notified and will issue a decision. No further action needed from you.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Feedback messages */}
          {txSent && (
            <div className="tx-banner success-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
              </svg>
              {txSent}
            </div>
          )}
          {error && (
            <div className="tx-banner error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgreementDetail;
