declare module "@paystack/inline-js" {
  type PaystackLoadResponse = {
    accessCode: string;
    customer?: Record<string, unknown>;
    id: number | string;
  };

  type PaystackSuccessResponse = {
    id?: number | string;
    message?: string;
    reference?: string;
    trxref?: string;
  };

  type PaystackErrorResponse = {
    message?: string;
  };

  type PaystackResumeCallbacks = {
    onCancel?: () => void;
    onError?: (error: PaystackErrorResponse) => void;
    onLoad?: (response: PaystackLoadResponse) => void;
    onSuccess?: (transaction: PaystackSuccessResponse) => void;
  };

  export default class Paystack {
    resumeTransaction(accessCode: string, callbacks?: PaystackResumeCallbacks): unknown;
  }
}
