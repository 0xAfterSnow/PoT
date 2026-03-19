import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePoT } from '../context/PoTContext';
import AgreementCard from '../components/AgreementCard';
import './Dashboard.css';

type FilterStatus = 'ALL' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'DISPUTED' | 'RESOLVED';

const Dashboard: React.FC = () => {
  const { agreements, address, isLoading, connected, fetchAllAgreements } = usePoT();
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [search, setSearch] = useState('');

  const filters: FilterStatus[] = ['ALL', 'PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'DISPUTED', 'RESOLVED'];

  const filtered = [...agreements].reverse().filter(a => {
    const matchStatus = filter === 'ALL' || a.status === filter;
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.partyA.toLowerCase().includes(search.toLowerCase()) ||
      a.partyB.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: agreements.length,
    active: agreements.filter(a => a.status === 'ACTIVE').length,
    completed: agreements.filter(a => a.status === 'COMPLETED').length,
    disputed: agreements.filter(a => a.status === 'DISPUTED').length,
  };

  return (
    <div className="dashboard">
      {/* Hero */}
      <div className="dashboard-hero">
        <div className="hero-eyebrow">
          <span className="hero-tag">Bitcoin-Native</span>
          <span className="hero-divider">·</span>
          <span className="hero-tag">Stacks-Powered</span>
          <span className="hero-divider">·</span>
          <span className="hero-tag">On-chain Reputation</span>
        </div>
        <h1 className="hero-title">
          Trust, Staked<br />
          <span className="hero-accent">on Bitcoin.</span>
        </h1>
        <p className="hero-sub">
          Create enforceable agreements backed by stake and anchored to Bitcoin finality. Build reputation from real outcomes.
        </p>
        {connected ? (
          <Link to="/create" className="hero-cta">
            New Agreement
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <p className="hero-connect-hint">Connect your Hiro wallet to get started →</p>
        )}
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <div className="stat-value active-val">{stats.active}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <div className="stat-value completed-val">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <div className="stat-value disputed-val">{stats.disputed}</div>
          <div className="stat-label">Disputed</div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="list-controls">
        <div className="filter-tabs">
          {filters.map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
              {f === 'ALL' && <span className="filter-count">{agreements.length}</span>}
            </button>
          ))}
        </div>

        <div className="search-wrap">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by title or address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Agreement grid */}
      {isLoading ? (
        <div className="agreements-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⬡</div>
          <h3>No agreements found</h3>
          <p>
            {agreements.length === 0
              ? 'Be the first to create a trust agreement on Bitcoin.'
              : 'Try changing your filter or search query.'}
          </p>
          {connected && agreements.length === 0 && (
            <Link to="/create" className="empty-cta">
              Create First Agreement
            </Link>
          )}
        </div>
      ) : (
        <div className="agreements-grid">
          {filtered.map(a => (
            <AgreementCard key={a.id} agreement={a} currentAddress={address} />
          ))}
        </div>
      )}

      {/* Refresh button */}
      <div className="refresh-row">
        <button
          className="refresh-btn"
          onClick={fetchAllAgreements}
          disabled={isLoading}
        >
          <svg className={isLoading ? 'animate-spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
