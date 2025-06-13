import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Address } from '../types/address';
import { AddressForm } from './AddressForm';

interface ShippingAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (address: Address) => void;
  initialAddress?: Partial<Address>;
}

export function ShippingAddressModal({
  isOpen,
  onClose,
  onSubmit,
  initialAddress = {}
}: ShippingAddressModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (address: Address) => {
    onSubmit(address);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Adresse de livraison
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <AddressForm 
          initialAddress={initialAddress}
          onSubmit={handleSubmit}
          onCancel={onClose}
          buttonText="Valider cette adresse"
        />
      </div>
    </div>
  );
}