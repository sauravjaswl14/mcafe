export type Role = 'ADMIN' | 'CUSTOMER';
export type BeanForm = 'WHOLE_BEANS' | 'GROUND' | 'PACKAGED';
export type RoastKey = 'LIGHT' | 'MEDIUM' | 'DARK';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Variant {
  id: number;
  productId: number;
  form: BeanForm;
  sizeGrams: number;
  price: number;
  stock: number;
  active: boolean;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  origin: string;
  roast: RoastKey;
  flavors: string[];
  description: string;
  active: boolean;
  variants: Variant[];
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
}

export interface MenuCategory {
  id: number;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'ROOM_SERVICE' | 'ONLINE';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE' | 'ROOM_CHARGE';

export interface OrderItem {
  id: number;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface Sale {
  id: number;
  orderId: number;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
}

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  customerName: string;
  customerPhone: string | null;
  notes: string | null;
  total: number;
  bookingId: number | null;
  createdAt: string;
  items: OrderItem[];
  sale: Sale | null;
  booking: (Booking & { room: Room; guest: Guest }) | null;
}

export interface SaleRow extends Sale {
  order: { id: number; customerName: string; type: OrderType; items: OrderItem[] };
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export type PurchaseStatus = 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrder {
  id: number;
  supplierId: number;
  supplier: Supplier;
  status: PurchaseStatus;
  total: number;
  notes: string | null;
  createdAt: string;
  receivedAt: string | null;
  items: {
    id: number;
    variantId: number;
    quantity: number;
    unitCost: number;
    variant: Variant & { product: { name: string } };
  }[];
}

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE';

export interface Room {
  id: number;
  number: string;
  type: string;
  capacity: number;
  rate: number;
  status: RoomStatus;
}

export interface Guest {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  idNumber: string | null;
}

export type BookingStatus = 'RESERVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';

export interface Booking {
  id: number;
  roomId: number;
  guestId: number;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  nightlyRate: number;
  total: number;
  room?: Room;
  guest?: Guest;
  orders?: { id: number; total: number; status: OrderStatus }[];
}

export interface Stats {
  revenueToday: number;
  salesToday: number;
  revenue30: number;
  sales30: number;
  purchases30: number;
  margin30: number;
  pendingOrders: number;
  activeBookings: number;
  revenueByDay: { date: string; amount: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  roomsByStatus: { status: RoomStatus; count: number }[];
  lowStock: { id: number; name: string; form: BeanForm; sizeGrams: number; stock: number }[];
}
