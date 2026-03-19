import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePoT } from '../context/PoTContext';
import AgreementCard from '../components/AgreementCard';
import './Profile.css';

const ScoreMeter: React.FC<{ score: number }> = ({ score }) => {
  const clamped = Math.min(Math.max(score, -200), 300);
  const pct = ((clamped + 200) / 500) * 100;
  const color = score >= 0 ? 'var(--success)' : 'var(--danger)';

  return (
    <div className="score-meter">
      <div className="score-track">
        <div
          className="score-fill"
          style={{ width: `${pct}%`, background: color }}
        />
        <div className="score-center-line" />
      </div>
      <div className="score-labels">
        <span>-200</span>
        <span>0</span>
        <span>+300</span>
      </div>
    </div>
  );
};

const Profile: React.FC = () => {
  const {
    connected,
    address,
    balance,
    formatAddress,
    connectWallet,
    userAgreements,
    userReputation,
    fetchUserAgreements,
    fetchUserReputation,
    isLoading,
    networkName,
  } = usePoT();

  useEffect(() => {
    if (connected) {
      fetchUserAgreements();
      fetchUserReputation();
    }
  }, [connected]);

  if (!connected) {
    return (
      <div className="profile-page">
        <div className="not-connected-card card">
          <div className="nc-icon">👤</div>
          <h2>Connect Wallet</h2>
          <p>Connect your Hiro wallet to view your profile and reputation score.</p>
          <button className="btn-primary" onClick={connectWallet}>Connect Wallet</button>
        </div>
      </div>
    );
  }

  const rep = userReputation;
  const totalAgreements = rep?.totalAgreements ?? 0;
  const winRate = totalAgreements > 0
    ? Math.round(((rep?.successfulAgreements ?? 0) / totalAgreements) * 100)
    : 0;

  const myActive = userAgreements.filter(a => a.status === 'ACTIVE');
  const myPending = userAgreements.filter(a => a.status === 'PENDING');
  const myCompleted = userAgreements.filter(a => ['COMPLETED', 'RESOLVED'].includes(a.status));

  return (
    <div className="profile-page">
      {/* Profile header */}
      <div className="profile-header card">
        <div className="profile-avatar">
          <div className="avatar-inner">
            {address?.slice(2, 4).toUpperCase()}
          </div>
          <div className="avatar-ring animate-glow" />
        </div>
        <div className="profile-info">
          <div className="profile-address mono">{address}</div>
          <div className="profile-meta">
            {balance !== null && (
              <span className="meta-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="var(--bitcoin)" opacity="0.2"/>
                  <path d="M9 8h4.5c1 0 1.5.5 1.5 1.2 0 .7-.5 1.2-1.5 1.2H9V8zm0 4h5c1.1 0 1.7.5 1.7 1.3 0 .8-.6 1.3-1.7 1.3H9V12z" fill="var(--bitcoin)"/>
                </svg>
                {balance.toFixed(2)} STX
              </span>
            )}
            <span className="meta-chip network">
              {networkName}
            </span>
          </div>
        </div>
      </div>

      {/* Reputation score */}
      <div className="rep-card card">
        <div className="rep-header">
          <h2 className="rep-title">Reputation Score</h2>
          <div className={`rep-score ${(rep?.score ?? 0) >= 0 ? 'positive' : 'negative'}`}>
            {(rep?.score ?? 0) >= 0 ? '+' : ''}{rep?.score ?? 0}
          </div>
        </div>

        <ScoreMeter score={rep?.score ?? 0} />

        <div className="rep-formula">
          <span className="formula-label">Formula:</span>
          <span className="formula mono">
            (success × 10) − (failed × 15) + (disputes won × 5)
          </span>
        </div>

        <div className="rep-stats-grid">
          <div className="rep-stat">
            <div className="rep-stat-value">{rep?.totalAgreements ?? 0}</div>
            <div className="rep-stat-label">Total</div>
          </div>
          <div className="rep-stat success">
            <div className="rep-stat-value">{rep?.successfulAgreements ?? 0}</div>
            <div className="rep-stat-label">Success</div>
          </div>
          <div className="rep-stat danger">
            <div className="rep-stat-value">{rep?.failedAgreements ?? 0}</div>
            <div className="rep-stat-label">Failed</div>
          </div>
          <div className="rep-stat warn">
            <div className="rep-stat-value">{rep?.disputesWon ?? 0}</div>
            <div className="rep-stat-label">Disputes Won</div>
          </div>
          <div className="rep-stat muted">
            <div className="rep-stat-value">{rep?.disputesLost ?? 0}</div>
            <div className="rep-stat-label">Disputes Lost</div>
          </div>
          <div className="rep-stat bitcoin">
            <div className="rep-stat-value">{winRate}%</div>
            <div className="rep-stat-label">Win Rate</div>
          </div>
        </div>
      </div>

      {/* Active & Pending */}
      {(myActive.length > 0 || myPending.length > 0) && (
        <div className="profile-section">
          <h3 className="section-heading">Active & Pending</h3>
          <div className="agreements-grid">
            {[...myPending, ...myActive].map(a => (
              <AgreementCard key={a.id} agreement={a} currentAddress={address} />
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {myCompleted.length > 0 && (
        <div className="profile-section">
          <h3 className="section-heading">History</h3>
          <div className="agreements-grid">
            {myCompleted.map(a => (
              <AgreementCard key={a.id} agreement={a} currentAddress={address} />
            ))}
          </div>
        </div>
      )}

      {userAgreements.length === 0 && !isLoading && (
        <div className="profile-empty">
          <p>You haven't participated in any agreements yet.</p>
          <Link to="/create" className="btn-primary">Create Your First Agreement</Link>
        </div>
      )}
    </div>
  );
};

export default Profile;
