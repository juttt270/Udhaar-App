'use client';

import React, { useState } from 'react';
import { Droplet, Lock, Mail, User as UserIcon, Building2, Phone, MapPin, Sparkles, LogIn } from 'lucide-react';
import { useToast } from './Toast';

interface AuthModalProps {
  hasAnyAdmin: boolean;
  onSuccess: (user: unknown) => void;
}

export default function AuthModal({ hasAnyAdmin, onSuccess }: AuthModalProps) {
  const [isRegistering, setIsRegistering] = useState(!hasAnyAdmin);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    plantName: 'Aqua Pure Water Plant',
    phone: '',
    address: '',
    defaultRate: 100,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isRegistering ? '/api/auth/signup' : '/api/auth/login';
      const payload = isRegistering
        ? formData
        : { email: formData.email, password: formData.password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      toast.success(isRegistering ? 'Water plant account setup complete!' : 'Welcome back!');
      onSuccess(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 999 }}>
      <div className="modal-content" style={{ maxWidth: 440 }}>
        <div style={{ textAlign: 'center', padding: '24px 20px 10px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(2, 132, 199, 0.25)',
              marginBottom: 12,
            }}
          >
            <Droplet size={30} />
          </div>
          <h2 style={{ fontSize: '1.35rem', marginBottom: 4 }}>
            {isRegistering ? 'Setup Your Water Plant' : 'Plant Owner Login'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            {isRegistering
              ? 'Enter your water plant details to start managing monthly khata'
              : 'Sign in to access your daily deliveries and customer ledger'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 22px 24px' }}>
          {isRegistering && (
            <>
              <div className="form-group">
                <label className="form-label">Water Plant Name *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="plantName"
                    required
                    value={formData.plantName}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. Al-Rehman Pure Water Plant"
                    style={{ paddingLeft: 36 }}
                  />
                  <Building2 size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Owner / Manager Name *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. Muhammad Usman"
                    style={{ paddingLeft: 36 }}
                  />
                  <UserIcon size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="0300-1234567"
                      style={{ paddingLeft: 34 }}
                    />
                    <Phone size={15} style={{ position: 'absolute', left: 10, top: 13, color: '#94a3b8' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Rate / Can (Rs.)</label>
                  <input
                    type="number"
                    name="defaultRate"
                    value={formData.defaultRate}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Plant Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. Main Market, Model Town"
                    style={{ paddingLeft: 34 }}
                  />
                  <MapPin size={15} style={{ position: 'absolute', left: 10, top: 13, color: '#94a3b8' }} />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="plant.owner@example.com"
                style={{ paddingLeft: 36 }}
              />
              <Mail size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
                style={{ paddingLeft: 36 }}
              />
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
            </div>
            <span className="form-hint">Minimum 6 characters</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 12 }}
          >
            {loading ? (
              'Processing...'
            ) : isRegistering ? (
              <>
                <Sparkles size={16} /> Complete Plant Setup
              </>
            ) : (
              <>
                <LogIn size={16} /> Login to Dashboard
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isRegistering
                ? 'Already have an account? Log In'
                : 'Need to register a new plant? Click here'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
