'use client';

import React, { useState } from 'react';
import { Droplet, Lock, Mail, User as UserIcon, Building2, Phone, MapPin, ArrowRight, LogIn } from 'lucide-react';
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
    plantName: 'AB Water Filter',
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
        throw new Error(data.error || 'Login failed');
      }

      toast.success(isRegistering ? 'Water plant created successfully!' : 'Welcome back!');
      onSuccess(data.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 999 }}>
      <div className="modal-content" style={{ maxWidth: 430 }}>
        <div style={{ textAlign: 'center', padding: '24px 20px 8px' }}>
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
              boxShadow: '0 6px 16px rgba(2, 132, 199, 0.25)',
              marginBottom: 10,
            }}
          >
            <Droplet size={30} />
          </div>
          <h2 style={{ fontSize: '1.35rem', marginBottom: 4 }}>
            {isRegistering ? 'Setup Your Water Plant' : 'Welcome Back'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            {isRegistering
              ? 'Enter your plant details once to start tracking customer accounts'
              : 'Sign in to access your daily deliveries and customer bills'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 22px 24px' }}>
          {isRegistering && (
            <>
              <div className="form-group">
                <label className="form-label">Plant Name *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="plantName"
                    required
                    value={formData.plantName}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. AB Water Filter"
                    style={{ paddingLeft: 36 }}
                  />
                  <Building2 size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Owner Name *</label>
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
                  <label className="form-label">Phone</label>
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
                  <label className="form-label">Bottle Price (Rs.)</label>
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
                <label className="form-label">Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. Main Bazar, City"
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
                placeholder="owner@example.com"
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
                placeholder="At least 6 characters"
                style={{ paddingLeft: 36 }}
              />
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 12 }}
          >
            {loading ? (
              'Please wait...'
            ) : isRegistering ? (
              <>
                Create Plant Account <ArrowRight size={17} />
              </>
            ) : (
              <>
                <LogIn size={17} /> Sign In
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: 14 }}>
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
                ? 'Already have an account? Sign In'
                : 'Need to create a new water plant? Click here'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
