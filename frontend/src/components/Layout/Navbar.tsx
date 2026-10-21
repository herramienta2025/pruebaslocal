import React from 'react';
import { Coins, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-logo">
            <Coins className="icon-emerald" size={24} />
          </div>
          <div className="brand-title-group">
            <span className="brand-name">Centavo</span>
            <span className="brand-tag">Finanzas Personales</span>
          </div>
        </div>

        <div className="navbar-actions">
          {user && (
            <div className="user-profile">
              <div className="user-avatar">
                <UserIcon size={16} />
              </div>
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="btn-ghost logout-btn"
            title="Cerrar sesión"
            type="button"
          >
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
