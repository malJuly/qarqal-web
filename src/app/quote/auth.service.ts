import { Injectable, inject } from '@angular/core';
import { QarqalApi } from '../core/qarqal-api';
import { MY_COUNTRY_CODE } from '../shared/utils/phone.util';

// Mobile OTP login, mapped from the app (AuthController.verifyPhoneNumber / verifyOtp). Malaysia only (+60).
//
// Backend notes for later:
// - send-otp requires fcm_token and saves it on the user. The web has none, so it sends "web", which replaces an
//   existing app user's push token until their app registers it again.
// - On staging the OTP is only pushed to fcm_token (no SMS), so web visitors won't receive it there.

const WEB_FCM_TOKEN = 'web';

interface SendOtpRequest { mobile_no: string; country_code: string; object_type: 1; fcm_token: string; [key: string]: unknown }
interface VerifyOtpRequest { mobile_no: string; otp: string; object_type: 1; [key: string]: unknown }
interface VerifyOtpResponse { status: boolean; message?: string; access_token?: string }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(QarqalApi);

  /** mobile: digits without country code or leading 0 (shared/utils/phone.util normaliseMobile). */
  async sendOtp(mobile: string): Promise<void> {
    const body: SendOtpRequest = { mobile_no: mobile, country_code: MY_COUNTRY_CODE, object_type: 1, fcm_token: WEB_FCM_TOKEN };
    await this.api.post('auth/send-otp', body);
  }

  /** Verifies the code and keeps the access token for the rest of the flow. */
  async verifyOtp(mobile: string, otp: string): Promise<void> {
    const body: VerifyOtpRequest = { mobile_no: mobile, otp, object_type: 1 };
    // PATCH, as the app calls it (backend: authRouter.patch('/verify-otp')).
    const res = await this.api.patch<VerifyOtpResponse>('auth/verify-otp', body);
    if (!res.access_token) throw new Error('No access token');
    this.api.setSession(res.access_token, mobile);
  }

  logout(): void {
    this.api.setSession(null, null);
  }
}
