'use client';

import MenuPage from '../../components/MenuPage';

export default function RestaurantPage() {
  return (
    <MenuPage
      active="/restaurant"
      table="restaurant_menu"
      heroImage="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80"
      eyebrow="Restaurant"
      title="Une cuisine savoureuse au cœur du complexe"
      subtitle="Découvrez nos cartes Standard, VIP et VVIP, préparées avec des produits de qualité."
      sectionTitle="Nos cartes"
      sectionSubtitle="Trois expériences culinaires selon vos envies."
      itemLabel="plat"
      categories={[
        {
          key: 'standard',
          title: 'Menu Standard',
          badge: 'Standard',
          text: 'Des plats équilibrés et généreux pour un moment de détente.',
        },
        {
          key: 'vip',
          title: 'Menu VIP',
          badge: 'VIP',
          text: 'Une sélection plus exclusive avec un service personnalisé.',
        },
        {
          key: 'vvip',
          title: 'Menu VVIP',
          badge: 'VVIP',
          text: 'L’expérience gastronomique haut de gamme et privée.',
        },
      ]}
    />
  );
}
