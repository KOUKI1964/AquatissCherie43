import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Check, MapPin } from 'lucide-react';
import { Address, ShippingAddress, COUNTRIES } from '../types/address';
import { AddressForm } from './AddressForm';
import { supabase } from '../lib/supabase';

interface AddressSelectorProps {
  userId: string;
  selectedAddressId?: string;
  onAddressSelected: (address: ShippingAddress) => void;
}

export function AddressSelector({ userId, selectedAddressId, onAddressSelected }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(selectedAddressId);

  useEffect(() => {
    fetchAddresses();
  }, [userId]);

  useEffect(() => {
    if (selectedAddressId) {
      setSelectedAddress(selectedAddressId);
    }
  }, [selectedAddressId]);

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      if (error) throw error;

      setAddresses(data || []);

      // If there's a default address and no address is selected, select the default
      if (data && data.length > 0 && !selectedAddress) {
        const defaultAddress = data.find(addr => addr.is_default);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress.id);
          onAddressSelected(defaultAddress);
        } else {
          setSelectedAddress(data[0].id);
          onAddressSelected(data[0]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching addresses:', err);
      setError('Erreur lors du chargement des adresses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = async (address: Address) => {
    try {
      setError(null);
      
      // Check if this is the first address (make it default)
      const isDefault = addresses.length === 0;
      
      const newAddress: ShippingAddress = {
        ...address,
        userId,
        isDefault
      };
      
      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: userId,
          street: address.street,
          postal_code: address.postalCode,
          city: address.city,
          country: address.country,
          is_default: isDefault
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Convert from DB format to our format
        const formattedAddress: ShippingAddress = {
          id: data.id,
          street: data.street,
          postalCode: data.postal_code,
          city: data.city,
          country: data.country,
          userId: data.user_id,
          isDefault: data.is_default
        };
        
        setAddresses(prev => [...prev, formattedAddress]);
        setShowAddForm(false);
        
        // Select the new address if it's the first one
        if (isDefault) {
          setSelectedAddress(data.id);
          onAddressSelected(formattedAddress);
        }
      }
    } catch (err: any) {
      console.error('Error adding address:', err);
      setError('Erreur lors de l\'ajout de l\'adresse');
    }
  };

  const handleUpdateAddress = async (address: Address) => {
    if (!editingAddressId) return;
    
    try {
      setError(null);
      
      const { error } = await supabase
        .from('user_addresses')
        .update({
          street: address.street,
          postal_code: address.postalCode,
          city: address.city,
          country: address.country
        })
        .eq('id', editingAddressId);

      if (error) throw error;

      // Update the address in the local state
      setAddresses(prev => 
        prev.map(addr => 
          addr.id === editingAddressId 
            ? {
                ...addr,
                street: address.street,
                postalCode: address.postalCode,
                city: address.city,
                country: address.country
              } 
            : addr
        )
      );
      
      setEditingAddressId(null);
      
      // If the updated address is the selected one, update the selected address
      if (selectedAddress === editingAddressId) {
        const updatedAddress = addresses.find(addr => addr.id === editingAddressId);
        if (updatedAddress) {
          const updated = {
            ...updatedAddress,
            street: address.street,
            postalCode: address.postalCode,
            city: address.city,
            country: address.country
          };
          onAddressSelected(updated);
        }
      }
    } catch (err: any) {
      console.error('Error updating address:', err);
      setError('Erreur lors de la mise à jour de l\'adresse');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      setError(null);
      
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      // Remove the address from the local state
      setAddresses(prev => prev.filter(addr => addr.id !== addressId));
      
      // If the deleted address was the selected one, select another address
      if (selectedAddress === addressId) {
        const remainingAddresses = addresses.filter(addr => addr.id !== addressId);
        if (remainingAddresses.length > 0) {
          const defaultAddress = remainingAddresses.find(addr => addr.isDefault);
          const newSelectedAddress = defaultAddress || remainingAddresses[0];
          setSelectedAddress(newSelectedAddress.id);
          onAddressSelected(newSelectedAddress);
        } else {
          setSelectedAddress(undefined);
        }
      }
    } catch (err: any) {
      console.error('Error deleting address:', err);
      setError('Erreur lors de la suppression de l\'adresse');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      setError(null);
      
      // First, set all addresses to non-default
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
      
      // Then set the selected address as default
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      // Update the addresses in the local state
      setAddresses(prev => 
        prev.map(addr => ({
          ...addr,
          isDefault: addr.id === addressId
        }))
      );
    } catch (err: any) {
      console.error('Error setting default address:', err);
      setError('Erreur lors de la définition de l\'adresse par défaut');
    }
  };

  const handleSelectAddress = (address: ShippingAddress) => {
    setSelectedAddress(address.id);
    onAddressSelected(address);
  };

  if (isLoading) {
    return <div className="py-4 text-center">Chargement des adresses...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {addresses.length > 0 ? (
        <div className="space-y-3">
          {addresses.map(address => (
            <div 
              key={address.id} 
              className={`border rounded-md p-4 ${
                selectedAddress === address.id 
                  ? 'border-[#8B1F38] bg-[#8B1F38]/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {editingAddressId === address.id ? (
                <AddressForm 
                  initialAddress={{
                    street: address.street,
                    postalCode: address.postalCode,
                    city: address.city,
                    country: address.country
                  }}
                  onSubmit={handleUpdateAddress}
                  onCancel={() => setEditingAddressId(null)}
                  buttonText="Mettre à jour"
                />
              ) : (
                <div>
                  <div className="flex justify-between">
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id={`address-${address.id}`}
                        name="selected-address"
                        checked={selectedAddress === address.id}
                        onChange={() => handleSelectAddress(address)}
                        className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 mt-1"
                      />
                      <div className="ml-3">
                        <label htmlFor={`address-${address.id}`} className="block text-sm font-medium text-gray-700">
                          {address.street}
                        </label>
                        <p className="text-sm text-gray-500">
                          {address.postalCode} {address.city}, {
                            COUNTRIES.find(c => c.code === address.country)?.name || address.country
                          }
                        </p>
                        {address.isDefault && (
                          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Adresse par défaut
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {!address.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(address.id!)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Définir comme adresse par défaut"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingAddressId(address.id!)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Modifier l'adresse"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(address.id!)}
                        className="text-gray-400 hover:text-red-600"
                        title="Supprimer l'adresse"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 rounded-md">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Aucune adresse enregistrée</p>
        </div>
      )}

      {showAddForm ? (
        <div className="border border-gray-200 rounded-md p-4 mt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ajouter une nouvelle adresse</h3>
          <AddressForm 
            onSubmit={handleAddAddress}
            onCancel={() => setShowAddForm(false)}
            buttonText="Ajouter"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Ajouter une nouvelle adresse
        </button>
      )}
    </div>
  );
}