
import { z } from 'zod';

// CPF/CNPJ validation with checksum
export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }
  
  // Calculate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  let digit1 = remainder < 2 ? 0 : remainder;
  
  if (digit1 !== parseInt(cleanCPF.charAt(9))) {
    return false;
  }
  
  // Calculate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  let digit2 = remainder < 2 ? 0 : remainder;
  
  return digit2 === parseInt(cleanCPF.charAt(10));
};

export const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14 || /^(\d)\1{13}$/.test(cleanCNPJ)) {
    return false;
  }
  
  // Calculate first digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit1 !== parseInt(cleanCNPJ.charAt(12))) {
    return false;
  }
  
  // Calculate second digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return digit2 === parseInt(cleanCNPJ.charAt(13));
};

export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validation schemas
export const paymentTokenSchema = z.object({
  card_number: z.string().regex(/^\d{13,19}$/, 'Invalid card number format'),
  verification_value: z.string().regex(/^\d{3,4}$/, 'Invalid CVV format'),
  first_name: z.string().min(1).max(50).regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Invalid first name'),
  last_name: z.string().min(1).max(50).regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Invalid last name'),
  month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Invalid month format'),
  year: z.string().regex(/^\d{4}$/, 'Invalid year format'),
});

export const transactionSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  buyerEmail: z.string().email('Invalid email format'),
  paymentMethod: z.enum(['credit_card', 'pix', 'bank_slip'], {
    errorMap: () => ({ message: 'Invalid payment method' })
  }),
  installments: z.number().int().min(1).max(12),
  amountCents: z.number().int().min(100).max(10000000), // Min R$1, Max R$100k
});

export const productSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  price_cents: z.number().int().min(100).max(10000000),
  product_type: z.enum(['single_payment', 'subscription', 'donation', 'event_tickets']),
  allowed_payment_methods: z.array(z.enum(['credit_card', 'pix', 'bank_slip'])).min(1),
  max_installments_allowed: z.number().int().min(1).max(12),
});

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (key: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
};
