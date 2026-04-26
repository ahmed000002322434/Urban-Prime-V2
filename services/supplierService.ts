import type { DropshipCatalogFilters, SupplierProduct } from '../types';
import commerceService from './commerceService';

export const supplierService = {
  async getProducts(filters: DropshipCatalogFilters = {}): Promise<SupplierProduct[]> {
    return commerceService.getDropshipCatalog(filters);
  },

  async getProductById(id: string): Promise<SupplierProduct | undefined> {
    try {
      return await commerceService.getDropshipCatalogProduct(id);
    } catch {
      return undefined;
    }
  }
};

export default supplierService;
