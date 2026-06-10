'use client';

import { Toaster as Sonner } from 'sonner';

const Toaster = ({ ...props }: React.ComponentProps<typeof Sonner>) => (
  <Sonner
    theme="light"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast: 'group toast !rounded-none !border-[#ebebeb] !bg-white !text-[#121212] !shadow-sm font-[Work_Sans]',
        description: '!text-[#888]',
        actionButton: '!bg-[#121212] !text-white !rounded-none',
        cancelButton: '!bg-[#f5f5f5] !text-[#888] !rounded-none',
      },
    }}
    {...props}
  />
);

export { Toaster };
