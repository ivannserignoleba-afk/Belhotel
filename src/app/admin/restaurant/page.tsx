'use client';

import { useEffect, useState } from 'react';
import { PlusCircle, Trash2, Edit2 } from 'lucide-react';
import Modal from '../../../components/Modal';
import { supabase } from '@/lib/supabase';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: 'standard' | 'vip' | 'vvip';
  image_url: string | null;
}

type MenuCategory = 'standard' | 'vip' | 'vvip';

export default function AdminRestaurantPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('standard');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'standard' as MenuCategory,
    image_url: '',
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  async function fetchMenuItems() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_menu')
        .select('*')
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lecture menu:', error.message);
        setItems([]);
      } else {
        setItems(data || []);
      }
    } catch (err: any) {
      console.error('Erreur fetchMenuItems:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('restaurant_menu').insert([
        {
          name: form.name,
          description: form.description || null,
          price: Number(form.price),
          category: form.category,
          image_url: form.image_url || null,
        },
      ]);

      if (error) {
        console.error('Erreur création menu:', error.message);
      } else {
        setForm({
          name: '',
          description: '',
          price: '',
          category: 'standard',
          image_url: '',
        });
        setIsModalOpen(false);
        fetchMenuItems();
      }
    } catch (error: any) {
      console.error('Erreur:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Supprimer ce plat ?')) return;
    setLoading(true);
    const { error } = await supabase
      .from('restaurant_menu')
      .delete()
      .eq('id', itemId);
    if (error) {
      console.error('Erreur suppression:', error.message);
    } else {
      fetchMenuItems();
    }
  };

  const filteredItems = items.filter((item) => item.category === selectedCategory);

  const getCategoryLabel = (category: MenuCategory) => {
    const labels: Record<MenuCategory, string> = {
      standard: 'Menu Standard',
      vip: 'Menu VIP',
      vvip: 'Menu VVIP',
    };
    return labels[category];
  };

  return (
    <div className="page-container">
      <header className="module-header">
        <div>
          <h2>Gestion du Restaurant</h2>
          <p>Gérez les menus standard, VIP et VVIP</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <PlusCircle size={20} /> Ajouter un plat
        </button>
      </header>

      <div className="category-tabs">
        {(['standard', 'vip', 'vvip'] as MenuCategory[]).map((cat) => (
          <button
            key={cat}
            className={`tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      <div className="menu-items-grid">
        {loading ? (
          <div className="empty-state">Chargement...</div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>Aucun plat pour cette catégorie.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="menu-item-card glass-panel">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="item-image" />
              ) : (
                <div className="item-image placeholder">Pas d'image</div>
              )}
              <div className="item-details">
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <p className="item-price">{item.price.toLocaleString()} FCFA</p>
                <div className="item-actions">
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 size={16} /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter un plat"
      >
        <form onSubmit={handleCreateMenuItem}>
          <div className="form-group">
            <label>Catégorie</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as MenuCategory })
              }
            >
              <option value="standard">Menu Standard</option>
              <option value="vip">Menu VIP</option>
              <option value="vvip">Menu VVIP</option>
            </select>
          </div>
          <div className="form-group">
            <label>Nom du plat</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Poulet grillé sauce arachide"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description du plat..."
            />
          </div>
          <div className="form-group">
            <label>Prix (FCFA)</label>
            <input
              type="number"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Ex: 8000"
            />
          </div>
          <div className="form-group">
            <label>URL de l'image</label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Enregistrer le plat
          </button>
        </form>
      </Modal>

      <style jsx>{`
        .category-tabs {
          display: flex;
          gap: 1rem;
          margin: 2rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tab {
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          opacity: 0.6;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .tab:hover {
          opacity: 0.8;
        }

        .tab.active {
          opacity: 1;
          border-bottom-color: var(--primary);
        }

        .menu-items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .menu-item-card {
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .item-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }

        .item-image.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.2);
        }

        .item-details {
          padding: 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .item-details h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
        }

        .item-details p {
          margin: 0.5rem 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .item-price {
          font-weight: 600;
          color: var(--primary);
          margin-top: auto;
          margin-bottom: 1rem;
        }

        .item-actions {
          display: flex;
          gap: 0.5rem;
        }

        select {
          width: 100%;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
        }

        select option {
          background: #0f172a;
          color: white;
        }
      `}</style>
    </div>
  );
}
