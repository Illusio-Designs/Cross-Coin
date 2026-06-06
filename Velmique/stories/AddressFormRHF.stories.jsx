import AddressFormRHF from '@/components/account/AddressFormRHF';

/**
 * AddressFormRHF — react-hook-form + Zod address form bound to the
 * shared `addressSchema`. A payload that submits cleanly here passes
 * the backend's shippingAddressBase schema.
 */
export default {
  title: 'Account/AddressFormRHF',
  component: AddressFormRHF,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: 720 }}><Story /></div>],
};

export const Empty = {
  args: { onSubmit: (values) => alert(JSON.stringify(values, null, 2)) },
};

export const Prefilled = {
  args: {
    defaultValues: {
      fullName: 'Alice Sharma',
      phoneNumber: '9876543210',
      address: 'A-203, Maple Heights, Citylight',
      landmark: 'Near VR Mall',
      city: 'Surat',
      state: 'Gujarat',
      postalCode: '395007',
      country: 'India',
    },
    onSubmit: (values) => alert(JSON.stringify(values, null, 2)),
  },
};
