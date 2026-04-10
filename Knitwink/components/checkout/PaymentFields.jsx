import { Input } from '@/components/ui/Input';









export function PaymentFields({ register, errors }) {
  const err = (name) => {
    const pd = errors?.paymentDetails;
    if (!pd || typeof pd !== 'object') return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return pd?.[name]?.message;
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Card Number"
        placeholder="1234 5678 9012 3456"
        maxLength={19}
        {...register('paymentDetails.cardNumber')}
        error={err('cardNumber')} />
      
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Expiry Date"
          placeholder="MM / YY"
          maxLength={7}
          {...register('paymentDetails.expiry')}
          error={err('expiry')} />
        
        <Input
          label="CVV"
          placeholder="123"
          maxLength={4}
          type="password"
          {...register('paymentDetails.cvv')}
          error={err('cvv')} />
        
      </div>
      <Input
        label="Name on Card"
        {...register('paymentDetails.nameOnCard')}
        error={err('nameOnCard')} />
      
    </div>);

}