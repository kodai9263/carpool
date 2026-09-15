import type { SettlementCalculationResult } from "@/utils/settlementCalculation";

export type SettlementStatus =
  | "draft"
  | "pending"
  | "completed"
  | "voiding"
  | "voided";

export type SettlementExpenseCategory = "toll" | "parking" | "fuel" | "other";

export type SettlementChildSourceStatus =
  | "assigned"
  | "selfDriving"
  | "absent"
  | "unassigned";

export type SettlementDraftExpense = {
  id: string;
  category: SettlementExpenseCategory;
  description: string;
  amount: number;
  /** null はチーム会計による立替を表す */
  payerMemberId: number | null;
};

export type SettlementDraftChild = {
  childId: number;
  childName: string;
  isSelected: boolean;
  sourceStatus: SettlementChildSourceStatus;
};

export type SettlementDraftFamily = {
  memberId: number;
  memberName: string;
  isIncluded: boolean;
  children: SettlementDraftChild[];
};

export type SettlementDraft = {
  allocationMethod: "equal" | "byChildCount";
  expenses: SettlementDraftExpense[];
  families: SettlementDraftFamily[];
  sourceFingerprint: string;
};

export type SettlementSnapshot = SettlementDraft & {
  source: {
    rideId: number | null;
    date: string;
    destination: string;
  };
  calculation: SettlementCalculationResult;
};

export type SettlementRevision = {
  revision: number;
  snapshot: SettlementSnapshot;
  totalAmount: number;
  correctionReason: string | null;
  createdAt: string;
};

export type SettlementMovement = {
  id: number;
  memberIdSnapshot: number;
  memberNameSnapshot: string;
  signedAmount: number;
  note: string | null;
  reversesMovementId: number | null;
  createdAt: string;
};

export type SettlementDetail = {
  id: number;
  teamId: number;
  rideId: number | null;
  sourceDate: string;
  sourceDestination: string;
  status: SettlementStatus;
  version: number;
  currentRevisionNumber: number | null;
  voidReason: string | null;
  sourceChanged: boolean;
  draft: SettlementDraft | null;
  currentRevision: SettlementRevision | null;
  revisions: SettlementRevision[];
  movements: SettlementMovement[];
  calculation: SettlementCalculationResult | null;
  access: {
    state: "free_trial" | "subscription_required" | "subscribed" | "history";
    canEdit: boolean;
    freeTrialSettlementId: number | null;
    freeTrialConsumed: boolean;
    monthlyPrice: number;
    subscriptionStatus?: string | null;
  };
};

export type SettlementAccessErrorResponse = {
  status: number;
  code: "SETTLEMENT_SUBSCRIPTION_REQUIRED";
  reason: "trial_in_use" | "trial_used";
  freeTrialSettlementId: number | null;
  monthlyPrice: number;
  message: string;
};

export type SettlementDetailResponse = {
  status: "OK";
  settlement: SettlementDetail;
};

export type SettlementBillingCheckoutResponse = {
  status: "OK";
  url: string;
  destination: "checkout" | "portal";
  active?: boolean;
};

export type SettlementBillingVerificationResponse = {
  status: "OK";
  state: "pending" | "active" | "expired";
  active: boolean;
  checkoutStatus: string | null;
  paymentStatus: string | null;
  subscriptionStatus: string | null;
};

export type SettlementCreateResponse = SettlementDetailResponse & {
  created: boolean;
};

export type SettlementListItem = {
  id: number;
  rideId: number | null;
  sourceDate: string;
  sourceDestination: string;
  status: SettlementStatus;
  version: number;
  currentRevisionNumber: number | null;
  totalAmount: number | null;
};

export type SettlementListResponse = {
  status: "OK";
  settlements: SettlementListItem[];
};
