import { Injectable, inject } from '@angular/core';
import { QarqalApi } from '../core/qarqal-api';
import { MY_COUNTRY_CODE } from '../shared/utils/phone.util';

// Policy holder step, mapped from the app (AuthController.updateBeneficiary → POST /policy-holder-profile)
// and the lookups it uses (GET /static/gender-types, /static/marital-status, /static/states).
// Backend validation (routes/policyHolderProfile.route.ts): full_name 3–100, email, dob, gender 1|2,
// marital_status number, nationality string, address_line1 5–255, state name, city, pincode number.

export interface Lookup { id: number; name: string; name_ms?: string }

export interface Lookups { genders: Lookup[]; maritalStatuses: Lookup[]; states: Lookup[] }

/** What the details form collects. */
export interface HolderForm {
  fullName: string;
  idType: number;
  idNumber: string;
  email: string;
  /** Digits without +60 and leading 0. */
  mobile: string;
  /** yyyy-mm-dd */
  dob: string;
  gender: number;
  maritalStatus: number;
  nationality: string;
  address1: string;
  address2: string;
  address3: string;
  city: string;
  /** State name, as the backend expects. */
  state: string;
  postcode: string;
}

interface PolicyHolderRequest {
  full_name: string;
  id_type: number;
  id_number: string;
  email: string;
  mobile_no: string;
  dob: string;
  gender: number;
  marital_status: number;
  nationality: string;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  state: string;
  city: string;
  pincode: number;
  quotation_id: string;
  vehicle_reg_no: string;
  referral_code: string | null;
  inclusiveRoadTax: boolean;
  [key: string]: unknown;
}

export interface PolicyHolderResponse { status: boolean; message?: string; data?: Record<string, unknown> }

@Injectable({ providedIn: 'root' })
export class PolicyHolderService {
  private readonly api = inject(QarqalApi);
  private lookups: Promise<Lookups> | null = null;

  /** Gender, marital status and state lists. Fetched once per visit. */
  getLookups(): Promise<Lookups> {
    this.lookups ??= Promise.all([
      this.api.get<Lookup[]>('static/gender-types'),
      this.api.get<Lookup[]>('static/marital-status'),
      this.api.get<Lookup[]>('static/states'),
    ]).then(([genders, maritalStatuses, states]) => ({ genders, maritalStatuses, states }));
    this.lookups.catch(() => (this.lookups = null)); // allow a retry after a failure
    return this.lookups;
  }

  /** inclusiveRoadTax: the same choice sent with update-quote. */
  submit(form: HolderForm, quotationId: string, plateNo: string, inclusiveRoadTax: boolean): Promise<PolicyHolderResponse> {
    const body: PolicyHolderRequest = {
      full_name: form.fullName.trim(),
      id_type: form.idType,
      id_number: form.idNumber,
      email: form.email.trim(),
      mobile_no: MY_COUNTRY_CODE + form.mobile,
      dob: form.dob,
      gender: form.gender,
      marital_status: form.maritalStatus,
      nationality: form.nationality,
      address_line1: form.address1.trim(),
      address_line2: form.address2.trim(),
      address_line3: form.address3.trim(),
      state: form.state,
      city: form.city.trim(),
      pincode: Number(form.postcode),
      quotation_id: quotationId,
      vehicle_reg_no: plateNo,
      referral_code: null,
      inclusiveRoadTax,
    };
    return this.api.post<PolicyHolderResponse>('policy-holder-profile', body);
  }
}
