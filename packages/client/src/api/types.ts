export type DeviceMode =
  | "Cashier"
  | "Scanner"
  | "Inventory"
  | "Public Kiosk"
  | "Owner Dashboard";
export type Role = "Owner" | "Cashier" | "Staff";
export type SessionInfo = {
  token: string;
  deviceId: string;
  user?: { id: string; username: string; role: Role };
  device: {
    id: string;
    mode: DeviceMode;
    kind: "private" | "public-kiosk";
    employeeName?: string;
  };
};
export type ConnectionState =
  | "connecting"
  | "connected"
  | "synchronized"
  | "disconnected"
  | "read-only";
export type ServerEvent = { type: string; [key: string]: unknown };
export type AuthSessionResponse = {
  device: SessionInfo["device"];
  user?: SessionInfo["user"];
};
export type LoginResponse = {
  token: string;
  deviceId: string;
  userId?: string;
  createdAt: number;
};
export type PaymentMethod = "cash" | "QRIS" | "bank-transfer";
export type ChildRecord = {
  id: string;
  name: string;
  phone?: string;
  createdAt: number;
  updatedAt: number;
};
export type MemberRecord = {
  id: string;
  childId: string;
  status: "active" | "deactivated";
  code: string;
  cards: Array<{
    code: string;
    issuedAt: number;
    revokedAt?: number;
    reason?: string;
  }>;
  createdAt: number;
  updatedAt: number;
};
export type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  barcode?: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  archived: boolean;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
};
export type StockMovement = {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  before: number;
  after: number;
  actorId: string;
  reason?: string;
  at: number;
};
export type StockCount = {
  id: string;
  productId: string;
  counted: number;
  variance: number;
  actorId: string;
  status: "pending" | "approved";
  approvedBy?: string;
  at: number;
  approvedAt?: number;
};
export type PackageSnapshot = {
  packageId: string;
  version: number;
  name: string;
  includedMinutes: number | null;
  price: number;
  deposit: number;
  overtimeRate: number;
  overtimeThreshold: number;
  overtimePercentage: number;
  depositPolicy: "return-remainder" | "forfeit-overtime" | "unlimited-cap";
};
export type TicketLineInput = {
  kind?: "ticket";
  childId: string;
  childName?: string;
  packageId: string;
  memberId?: string;
  paymentConfirmed?: boolean;
};
export type ProductLineInput = {
  kind: "product";
  productId: string;
  quantity: number;
  discount?: number;
  memberId?: string;
  outOfStockException?: { reason: string; ownerId: string };
};
export type SaleInput = {
  idempotencyKey: string;
  cashierId: string;
  operatingDate: string;
  lines: Array<TicketLineInput | ProductLineInput>;
  paymentMethod: PaymentMethod;
  locale?: "id" | "en";
};
export type SaleLine =
  | {
      kind: "ticket";
      ticketId: string;
      childId: string;
      packageName: string;
      price: number;
      originalPrice: number;
      membershipDiscount: number;
      memberId?: string;
      deposit: number;
    }
  | {
      kind: "product";
      lineId: string;
      productId: string;
      sku: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      membershipDiscount: number;
      memberId?: string;
      total: number;
    };
export type SaleRecord = {
  id: string;
  idempotencyKey: string;
  cashierId: string;
  operatingDate: string;
  paymentMethod: PaymentMethod;
  paymentConfirmedAt: number;
  status: "completed" | "void";
  tickets: Array<{
    id: string;
    code: string;
    qrToken: string;
    childId: string;
    childName?: string;
    package: PackageSnapshot;
    status: "waiting";
  }>;
  deposits: Array<{ ticketId: string; amount: number; status: "held" }>;
  receipt: {
    id: string;
    number: string;
    saleId: string;
    locale: "id" | "en";
    lines: SaleLine[];
    total: number;
  };
  lines: SaleLine[];
  total: number;
  createdAt: number;
};
export type PlaySession = {
  id: string;
  ticketId: string;
  enteredAt: number;
  exitedAt?: number;
  status: "active" | "completed" | "auto-closed";
  overtimeMinutes: number;
  outstandingCharge: number;
  depositApplied: number;
  depositRefunded: number;
};
export type ScanResult = {
  ok: boolean;
  state: "waiting" | "active" | "completed" | "void" | "expired" | "unknown";
  message: string;
  ticket?: SaleRecord["tickets"][number];
  session?: PlaySession;
};
export type PrintAttempt = {
  id: string;
  saleId: string;
  artifact: "tickets" | "receipt";
  status: "requested" | "unknown" | "failed";
  reprint: boolean;
  actorId: string;
  reason?: string;
  at: number;
};
export type RecoveryResult = {
  ticketId: string;
  code: string;
  qrToken: string;
};
export type PairResponse = {
  device: SessionInfo["device"];
  session?: { token: string; deviceId: string; createdAt: number };
};
export type BootstrapStatus = {
  required: boolean;
  ownerDevice?: SessionInfo["device"] & { id: string };
};
export type BootstrapResponse = {
  device: SessionInfo["device"];
  session: { token: string; deviceId: string; createdAt: number };
};
