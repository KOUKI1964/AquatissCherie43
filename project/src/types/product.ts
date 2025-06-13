export interface ProductAttribute {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'text' | 'number' | 'boolean' | 'color';
  options?: string[];
  value: string | string[] | number | boolean;
  required: boolean;
  description?: string;
  sortOrder: number;
}

export interface AttributeGroup {
  id: string;
  name: string;
  attributes: ProductAttribute[];
  sortOrder: number;
}

export interface AttributeDefinition {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'text' | 'number' | 'boolean' | 'color';
  options?: string[];
  required: boolean;
  description?: string;
  defaultValue?: any;
  categories: string[]; // Category IDs this attribute applies to
}

export interface CategoryAttributes {
  [categoryId: string]: AttributeDefinition[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  attributes: Record<string, any>;
}

export interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  price: number;
  sale_price?: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  category_id: string;
  supplier_code: string;
  status: 'draft' | 'published' | 'archived';
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  attributeGroups: AttributeGroup[];
  variants: ProductVariant[];
  metadata?: Record<string, any>;
  isVariant?: boolean;
  parentProductId?: string;
  variantSuffix?: string;
}