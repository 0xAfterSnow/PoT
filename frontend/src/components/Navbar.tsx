import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePoT } from '../context/PoTContext';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

const BitcoinIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="var(--bitcoin)" opacity="0.15" />
    <path d="M15.5 10.5c.5-.7.5-1.5 0-2.2-.6-.8-1.7-1.3-3-1.3H8v10h4.8c1.4 0 2.7-.6 3.2-1.5.5-.8.5-1.8 0-2.5-.3-.5-.8-.9-1.3-1.1.5-.4.7-.9.8-1.4zm-5.5-2h2.3c.8 0 1.5.5 1.5 1.2 0 .7-.7 1.2-1.5 1.2H10V8.5zm2.8 6H10v-2.5h2.8c.9 0 1.7.6 1.7 1.25 0 .65-.8 1.25-1.7 1.25z" fill="var(--bitcoin)" />
  </svg>
);

const Navbar: React.FC = () => {
  const { connected, address, balance, connectWallet, disconnectWallet, formatAddress, isLoading, networkName } = usePoT();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/create', label: 'Create' },
    { path: '/profile', label: 'Profile' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-text">
            Po<span className="logo-accent">T</span>
          </span>
          <span className="logo-tag">trust layer</span>
        </Link>

        {/* Nav links desktop */}
        <div className="navbar-links">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Wallet area */}
        <div className="navbar-wallet">
          {networkName === 'testnet' && (
            <span className="network-badge">testnet</span>
          )}

          {connected && address ? (
            <div className="wallet-connected">
              {balance !== null && (
                <span className="wallet-balance">
                  {balance.toFixed(2)} <span className="balance-unit">STX</span>
                </span>
              )}
              <button className="wallet-btn wallet-btn--address" onClick={disconnectWallet}>
                <span className="wallet-dot" />
                {formatAddress(address)}
              </button>
            </div>
          ) : (
            <button
              className="wallet-btn wallet-btn--connect"
              onClick={connectWallet}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner" />
              ) : (
                <>
                  <span>Connect Wallet</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          )}
          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              /* Sun icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Moon icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Mobile menu toggle */}
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-nav-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
