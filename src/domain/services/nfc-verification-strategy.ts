export interface NfcVerificationRequest {
  readonly expectedUrl: string;
  readonly observedUrl: string;
  readonly tagSerialNumber: string | null;
}

export interface NfcVerificationResult {
  readonly valid: boolean;
  readonly reason: string | null;
}

export interface NfcVerificationStrategy {
  readonly strategyName: string;
  verify(request: NfcVerificationRequest): Promise<NfcVerificationResult>;
}

export class StaticNdefUrlStrategy implements NfcVerificationStrategy {
  readonly strategyName = "StaticNdefUrlStrategy";

  async verify(
    request: NfcVerificationRequest,
  ): Promise<NfcVerificationResult> {
    return request.expectedUrl === request.observedUrl
      ? { valid: true, reason: null }
      : { valid: false, reason: "The NFC URL does not match this asset." };
  }
}

export interface SecureDynamicMessageVerificationPort {
  verifySecureDynamicMessage(
    request: NfcVerificationRequest,
  ): Promise<NfcVerificationResult>;
}
