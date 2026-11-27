/**
 * Inventory API Service
 *
 * `GET /partner/inventory` returns kit dispatches, not a stock ledger — each
 * row is a consignment the depot sent, carrying the item and the quantity.
 * The screen aggregates them into a per-item balance, because a partner
 * thinks in "how many bottles do I have", not "which consignment".
 */

import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';

export interface KitItem {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
}

export interface KitDispatch {
  id: string;
  partnerId: string;
  kitItemId: string;
  /** Quantity the depot sent out. */
  quantity: number;
  /** Quantity the partner confirmed receiving; null until they acknowledge. */
  receivedQty?: number | null;
  condition?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  KitItem?: KitItem | null;
}

export const getInventory = async (): Promise<KitDispatch[]> => {
  const response = await apiClient.get<ApiResponse<KitDispatch[]>>(
    API_ENDPOINTS.INVENTORY,
  );
  const data = response.data.data;
  return Array.isArray(data) ? data : [];
};
