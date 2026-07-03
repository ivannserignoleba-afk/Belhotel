'use client';

import { useState } from 'react';
import { Menu, Wine } from 'lucide-react';
import Modal from '@/components/Modal';

type MenuType = 'standard' | 'vip' | 'vvip' | null;

export default function RestaurantPage() {
  const [selectedMenu, setSelectedMenu] = useState<MenuType>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMenuClick = (menuType: MenuType) => {
    setSelectedMenu(menuType);
    setIsModalOpen(true);
  };

  return (
    <div className="page-container">
      <header className="module-header">
        <div>
          <h2>Restaurant</h2>
          <p>Consultez les menus de notre restaurant</p>
        </div>
      </header>

      <div className="menu-buttons-grid">
        <button
          className="menu-button glass-panel"
          onClick={() => handleMenuClick('standard')}
        >
          <Menu size={32} />
          <h3>Menu Standard</h3>
          <p>Notre sélection classique de plats savoureux</p>
        </button>

        <button
          className="menu-button glass-panel"
          onClick={() => handleMenuClick('vip')}
        >
          <Wine size={32} />
          <h3>Menu VIP</h3>
          <p>Une expérience culinaire premium</p>
        </button>

        <button
          className="menu-button glass-panel"
          onClick={() => handleMenuClick('vvip')}
        >
          <Wine size={32} />
          <h3>Menu VVIP</h3>
          <p>L'excellence gastronomique</p>
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMenu(null);
        }}
        title={
          selectedMenu === 'standard'
            ? 'Menu Standard'
            : selectedMenu === 'vip'
            ? 'Menu VIP'
            : 'Menu VVIP'
        }
      >
        <div className="menu-content">
          {selectedMenu === 'standard' && (
            <div>
              <h4>Menu Standard</h4>
              <p>
                Découvrez nos plats traditionnels préparés avec des ingrédients
                frais et de qualité.
              </p>
              <ul>
                <li>Entrées variées</li>
                <li>Plats principaux assortis</li>
                <li>Desserts maison</li>
                <li>Boissons (eau, sodas, jus)</li>
              </ul>
              <p className="menu-price">À partir de 15 000 FCFA par personne</p>
            </div>
          )}

          {selectedMenu === 'vip' && (
            <div>
              <h4>Menu VIP</h4>
              <p>
                Profitez d'une sélection gastronomique raffinée, avec service
                personnalisé et présentation soignée.
              </p>
              <ul>
                <li>Entrées sophistiquées</li>
                <li>Plats signatures du chef</li>
                <li>Sélection de vins</li>
                <li>Desserts gourmet</li>
              </ul>
              <p className="menu-price">À partir de 35 000 FCFA par personne</p>
            </div>
          )}

          {selectedMenu === 'vvip' && (
            <div>
              <h4>Menu VVIP</h4>
              <p>
                L'expérience ultime : menu personnalisé, service haut de gamme,
                et présentation d'exception.
              </p>
              <ul>
                <li>Menu entièrement personnalisable</li>
                <li>Créations culinaires exclusives du chef</li>
                <li>Accords mets-vins premium</li>
                <li>Service blanc et maître de maison</li>
                <li>Ambiance privée disponible</li>
              </ul>
              <p className="menu-price">À partir de 75 000 FCFA par personne</p>
            </div>
          )}
        </div>
      </Modal>

      <style jsx>{`
        .menu-buttons-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .menu-button {
          padding: 2rem;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .menu-button:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .menu-button h3 {
          font-size: 1.5rem;
          margin: 0;
          font-weight: 600;
        }

        .menu-button p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
          text-align: center;
        }

        .menu-content {
          padding: 1.5rem 0;
        }

        .menu-content h4 {
          font-size: 1.3rem;
          margin-bottom: 1rem;
          color: var(--primary, #3b82f6);
        }

        .menu-content ul {
          list-style: none;
          padding: 0;
          margin: 1rem 0;
        }

        .menu-content li {
          padding: 0.5rem 0;
          padding-left: 1.5rem;
          position: relative;
        }

        .menu-content li:before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--primary, #3b82f6);
          font-weight: bold;
        }

        .menu-price {
          margin-top: 1.5rem;
          font-weight: 600;
          color: var(--primary, #3b82f6);
          font-size: 1.1rem;
        }
      `}</style>
    </div>
  );
}
