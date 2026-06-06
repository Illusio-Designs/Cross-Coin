import '../styles/globals.css';

export const parameters = {
  layout: 'centered',
  controls: { expanded: true },
  backgrounds: {
    default: 'ivory',
    values: [
      { name: 'ivory', value: '#f4ead4' },
      { name: 'white', value: '#ffffff' },
      { name: 'dark',  value: '#1c170c' },
    ],
  },
  a11y: { config: { rules: [{ id: 'autocomplete-valid', enabled: false }] } },
  viewport: {
    viewports: {
      mobile: { name: 'Mobile (375)', styles: { width: '375px', height: '667px' } },
      tablet: { name: 'Tablet (768)', styles: { width: '768px', height: '1024px' } },
      desktop: { name: 'Desktop (1440)', styles: { width: '1440px', height: '900px' } },
    },
  },
};

export const tags = ['autodocs'];
