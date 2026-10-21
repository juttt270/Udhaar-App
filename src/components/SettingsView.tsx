'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Building2, Phone, MapPin, DollarSign, Lock, Save, LogOut } from 'lucide-react';
import { useToast } from './Toast';

interface SettingsViewProps {
  onLogout: () => void;
  onUpdatePlantName: (name: string) => void;
}

export default function SettingsView({ onLogout, onUpdatePlantName }: SettingsViewProps) {
  const [formData, setFormData] = useState({
    plantName: '',
    phone: '',
    address: '',
    currency: 'Rs.',
    defaultRate: 100,
    newPassword: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (res.ok && data.settings) {
          setFormData({
            plantName: data.settings.plantName || '',
            phone: data.settings.phone || '',
            address: data.settings.address || '',
            currency: data.settings.currency || 'Rs.',
            defaultRate: data.settings.defaultRate || 100,
            newPassword: '',
          });
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');

      toast.success('Plant settings updated successfully!');
      onUpdatePlantName(formData.plantName);
      setFormData((prev) => ({ ...prev, newPassword: '' }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={24} color="var(--primary)" /> Water Plant Settings
        </h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Update plant name, phone number, default rate, and login credentials
        </p>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading plant settings...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Water Plant Name *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={formData.plantName}
                  onChange={(e) => setFormData({ ...formData, plantName: e.target.value })}
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                />
                <Building2 size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
              </div>
              <span className="form-hint">This name is printed on PDF bills and receipts</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Plant Phone / Contact</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input"
                    placeholder="0300-1234567"
                    style={{ paddingLeft: 36 }}
                  />
                  <Phone size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Default Bottle Price (Rs.)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={formData.defaultRate}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultRate: Number(e.target.value) || 0 })
                    }
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                  />
                  <DollarSign size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Plant Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="form-input"
                  placeholder="Main road, sector, city"
                  style={{ paddingLeft: 36 }}
                />
                <MapPin size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.98rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={16} color="var(--primary)" /> Change Password
              </h4>
              <div className="form-group">
                <label className="form-label">New Password (Leave empty to keep current password)</label>
                <input
                  type="password"
                  minLength={6}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="form-input"
                  placeholder="Enter at least 6 characters"
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={onLogout}
                className="btn btn-secondary"
                style={{ color: 'var(--danger)' }}
              >
                <LogOut size={16} /> Sign Out
              </button>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-lg"
              >
                <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}