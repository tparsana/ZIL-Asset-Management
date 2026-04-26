'use client';

import { useId } from 'react';
import { Input } from '@/components/ui/input';
import type { AppUser } from '@/lib/types';

interface StaffNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  users: AppUser[];
  placeholder?: string;
}

export function StaffNameField({
  value,
  onChange,
  users,
  placeholder = 'Select or enter staff name',
}: StaffNameFieldProps) {
  const listId = useId();

  return (
    <>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list={listId}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {users.map((user) => (
          <option key={user.id} value={user.name} />
        ))}
      </datalist>
    </>
  );
}
