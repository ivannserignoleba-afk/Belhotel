'use client';

import MenuPage from '../../components/MenuPage';

export default function BarPage() {
  return (
    <MenuPage
      active="/bar"
      table="bar_menu"
      heroImage="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1600&q=80"
      eyebrow="Bar Lounge"
      title="Des boissons raffinées dans une ambiance chaleureuse"
      subtitle="Cocktails, boissons fraîches et grands classiques : découvrez notre carte."
      sectionTitle="Notre carte"
      sectionSubtitle="Trois ambiances pour vos soirées."
      itemLabel="boisson"
      categories={[
        {
          key: 'standard',
          title: 'Bar Standard',
          badge: 'Standard',
          text: 'Un espace convivial pour des moments détendus.',
        },
        {
          key: 'vip',
          title: 'Salon VIP',
          badge: 'VIP',
          text: 'Un cadre plus intime avec un service prioritaire.',
        },
        {
          key: 'vvip',
          title: 'Expérience VVIP',
          badge: 'VVIP',
          text: 'Une soirée premium avec une ambiance exclusive.',
        },
      ]}
    />
  );
}
