// Simplified crypto implementation using only the necessary parts
import { AES, enc } from 'crypto-js/aes';
import { Utf8 } from 'crypto-js/core';

const SECRET_KEY = 'your-secret-key'; // In production, this should come from environment variables

export const encryptPassword = (password: string): string => {
  return AES.encrypt(password, SECRET_KEY).toString();
};

export const decryptPassword = (encryptedPassword: string): string => {
  const bytes = AES.decrypt(encryptedPassword, SECRET_KEY);
  return bytes.toString(Utf8);
};