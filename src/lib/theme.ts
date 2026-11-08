export const colors = {
  primary: '#E5195E',
  primaryDark: '#B8104A',
  primarySoft: '#FDE7EF',
  ride: '#0F9D58',
  rideSoft: '#E3F5EC',
  text: '#1A1A1A',
  muted: '#6B6B6B',
  border: '#ECECEC',
  bg: '#F7F7F8',
  card: '#FFFFFF',
  warning: '#F59E0B',
  danger: '#DC2626',
};

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

export const peso = (n: number) => `₱${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
