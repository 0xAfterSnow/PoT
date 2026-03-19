import React from 'react';
import { Link } from 'react-router-dom';
import type { Agreement } from '../context/PoTContext';
import './AgreementCard.css';

interface Props {
  agreement: Agreement;
  currentAddress?: string | null;
}

const STATUS_DOT: Record<string, string> = {
  PENDING: '#ffd32a',
  ACTIVE: '#00d9a3',
  COMPLETED: '#4a9eff',
  FAILED: '#ff4757',
  DISPUTED: '#ffd32a',
  RESOLVED: '#f7931a',
};

const AgreementCard: React.FC<Props> = ({ agreement, currentAddress }) => {
  const isPartyA = currentAddress === agreement.partyA;
  const isPartyB = currentAddress === agreement.partyB;
  const isInvolved = isPartyA || isPartyB;

  const formatAddr = (addr: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

  const statusClass = `status-${agreement.status.toLowerCase()}`;

  return (
    <Link to={`/agreement/${agreement.id}`} className="agreement-card card card-interactive">
      <div className="agreement-card-header">
        <div className="agreement-id mono">#{String(agreement.id).padStart(4, '0')}</div>
        <div className={`status-badge ${statusClass}`}>
          <span
            className="status-dot"
            style={{ background: STATUS_DOT[agreement.status] }}
          />
          {agreement.status}
        </div>
      </div>

      <h3 className="agreement-title">{agreement.title}</h3>

      <p className="agreement-description">{agreement.description || 'No description provided.'}</p>

      <div className="agreement-meta">
        <div className="meta-row">
          <div className="meta-item">
            <span className="meta-label">Stake</span>
            <span className="meta-value stake-value">{agreement.stake} STX</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Deadline</span>
            <span className="meta-value mono">Block {agreement.deadline.toLocaleString()}</span>
          </div>
        </div>

        <div className="parties">
          <div className="party-tag">
            <span className="party-role">A</span>
            <span className="party-addr mono">{formatAddr(agreement.partyA)}</span>
            {isPartyA && <span className="you-badge">you</span>}
          </div>
          <div className="party-arrow">⇄</div>
          <div className="party-tag">
            <span className="party-role">B</span>
            <span className="party-addr mono">{formatAddr(agreement.partyB)}</span>
            {isPartyB && <span className="you-badge">you</span>}
          </div>
        </div>
      </div>

      {agreement.resolver && (
        <div className="resolver-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
          <span className="resolver-label">Resolver:</span>
          <span className="resolver-addr mono">{formatAddr(agreement.resolver)}</span>
        </div>
      )}
    </Link>
  );
};

export default AgreementCard;
