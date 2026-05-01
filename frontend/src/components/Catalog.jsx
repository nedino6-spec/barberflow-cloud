import React, { useState, useEffect } from 'react';
import { Scissors, Plus, Trash2, Edit3, Image as ImageIcon, Save, X } from 'lucide-react';
import { apiFetch } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Catalog() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', description: '', image_url: '' });

  const fetchServices = async () => {
    try {
      const res = await apiFetch('/api/services');
      const data = await res.json();
      setServices(data);
    } catch (e) {
      toast.error('Erro ao carregar catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingService ? 'PUT' : 'POST';
    const url = editingService ? `/api/services/${editingService.id}` : '/api/services';

    try {
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success(editingService ? 'Serviço atualizado!' : 'Serviço adicionado!');
        setShowModal(false);
        setEditingService(null);
        setFormData({ name: '', price: '', description: '', image_url: '' });
        fetchServices();
      }
    } catch (e) {
      toast.error('Erro ao salvar serviço');
    }
  };

  const openEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      description: service.description || '',
      image_url: service.image_url || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este serviço?')) return;
    try {
      const res = await apiFetch(`/api/services/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Serviço removido');
        fetchServices();
      } else {
        toast.error('Erro ao excluir no servidor');
      }
    } catch (e) {
      toast.error('Erro ao excluir');
      console.error(e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Foto muito grande! Use uma de até 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        const res = await apiFetch('/api/upload', {
          method: 'POST',
          body: JSON.stringify({ image: base64Data })
        });
        const data = await res.json();
        if (data.url) {
          setFormData({ ...formData, image_url: data.url });
          toast.success('Foto carregada!');
        }
      } catch (e) {
        toast.error('Erro ao subir foto');
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="loading">Carregando catálogo...</div>;

  return (
    <main className="main-content">
      <header className="card-header">
        <div>
          <h2 style={{ fontSize: '1.8rem' }}>Catálogo & Galeria</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie seus serviços e fotos do portfólio</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingService(null); setFormData({ name: '', price: '', description: '', image_url: '' }); setShowModal(true); }}>
          <Plus size={20} /> Novo Serviço
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        <AnimatePresence>
          {services.map((s, i) => (
            <motion.div 
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel" 
              style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ height: '200px', background: 'rgba(255,255,255,0.05)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.image_url ? (
                  <img src={s.image_url.startsWith('http') ? s.image_url : `${apiFetch.baseUrl || ''}${s.image_url}`} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={48} style={{ opacity: 0.2 }} />
                )}
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' }}>
                  <button className="btn-icon" style={{ background: 'rgba(0,0,0,0.5)', padding: '8px' }} onClick={() => openEdit(s)}><Edit3 size={16} /></button>
                  <button className="btn-icon" style={{ background: 'rgba(220, 38, 38, 0.5)', padding: '8px' }} onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                </div>
              </div>
              
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{s.name}</h3>
                  <span className="text-gold" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>R$ {s.price.toFixed(2)}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1, marginBottom: '0' }}>
                  {s.description || 'Sem descrição.'}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel" 
            style={{ padding: '32px', maxWidth: '500px', width: '95%' }}
          >
            <div className="card-header" style={{ marginBottom: '24px' }}>
              <h3>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Nome do Serviço</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Corte Degradê"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Preço (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="input-field" 
                    placeholder="0.00"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    required 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Foto do Serviço</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    id="fileInput"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <button 
                    type="button" 
                    className="btn-glass" 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => document.getElementById('fileInput').click()}
                  >
                    <ImageIcon size={18} /> Escolher Foto
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Descrição</label>
                <textarea 
                  className="input-field" 
                  rows="3"
                  placeholder="Descreva o serviço..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn-glass" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Save size={18} /> Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
}
