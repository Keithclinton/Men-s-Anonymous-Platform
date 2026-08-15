import { useState, type ComponentProps } from 'react';
import { Field } from './Field';

type Props = Omit<ComponentProps<typeof Field>, 'type' | 'trailing'> & {
  autoComplete: 'current-password' | 'new-password';
};

export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className="text-[12px] font-medium uppercase tracking-[0.12em] text-brass hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}
