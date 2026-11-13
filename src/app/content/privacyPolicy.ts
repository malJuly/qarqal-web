// QarQal Privacy Policy, copied word for word from https://www.qarqal.com/privacy-policy (20 Oct 2026).
// This is a legal text: change it only with the policy owner's approval, never to "tidy" the wording.
// Each section is a list of blocks: a paragraph (p) or a bullet list (ul).

export type Block = { p: string } | { ul: string[] };
export interface Section { id: string; title: string; blocks: Block[] }

export const heading = 'A LEGAL DISCLAIMER';

export const intro: string[] = [
  'Welcome to QarQal. This Privacy Policy outlines how July Systems Sdn. Bhd. (“July Systems”, “we” or “us”), as the owner and operator of the QarQal mobile application (“QarQal app”) and its related services, collects, uses, discloses, and protects your personal data in accordance with the Personal Data Protection Act 2010 (“PDPA”) of Malaysia.',
  "This Privacy Policy applies to all QarQal services, including those made available via our app, website, customer service channels, and any affiliated platforms, including services delivered in collaboration with July Systems' network of service providers.",
  'Please read this Privacy Policy carefully to understand how your personal data (“Personal Data”) may be collected, used, and protected.',
];

export const sections: Section[] = [
  {
    id: 'definitions', title: '1. Definitions',
    blocks: [{ ul: [
      '"Personal Data" refers to any information that relates directly or indirectly to an identifiable individual. This is including but not limited to customer names, contact information, identification numbers, passport numbers, vehicle registration details, and service usage data.',
      '"Processing" refers to any operation performed on personal data, including but not limited to collecting, recording, storing, using, and/or disclosing any information related to such data, solely for purposes required by July Systems to render its services via the QarQal app.',
    ] }],
  },
  {
    id: 'collection', title: '2. Collection of Personal Data',
    blocks: [
      { p: 'We may collect your personal data through the following means, including but not limited to:' },
      { ul: [
        'When you register for QarQal services or sign up via the QarQal app;',
        'When you contact our support team or communicate with us;',
        'Through cookies or analytics when you use our website or app;',
        'From third parties authorised to share your data with us (e.g. vehicle registration platforms, payment gateways); and',
        'Via service interactions (e.g. roadside assistance, insurance claim support);',
      ] },
      { p: 'The types of personal data collected may include:' },
      { ul: [
        'Name, NRIC/Passport number, gender, nationality;',
        'Contact details such as address, phone number, and email;',
        'Payment and billing details (e.g. credit card, bank info);',
        'Vehicle details (registration number, chassis number);',
        'Geo-location data and driving activity (where consented); and',
        'Photographs, CCTV footage or call recordings where applicable.',
      ] },
      { p: 'The list above is not exhaustive.' },
    ],
  },
  {
    id: 'minors', title: '3. Personal Data of Minors and Corporate Representatives',
    blocks: [{ ul: [
      'If you are under the age of 18, you are required to obtain consent from your parent or legal guardian recognized by law before providing any personal data to QarQal.',
      'If you are submitting personal data on behalf of a firm, corporation, or other entity, please ensure that all relevant individuals such as partners, directors, or shareholders are informed of and have acknowledged this Privacy Policy.',
    ] }],
  },
  {
    id: 'purpose', title: '4. Purpose of Data Collection',
    blocks: [
      { p: 'Your personal data is collected and processed for the following purposes:' },
      { ul: [
        'To register and administer your QarQal membership;',
        'To deliver vehicle and roadside assistance services;',
        'To communicate service alerts, updates and offers;',
        'To process payments and manage subscriptions;',
        'To facilitate claims, refunds or reimbursements;',
        'To detect, prevent or investigate fraud or misuse;',
        'To comply with legal obligations and law enforcement requirements; and',
        'To improve service experience and develop new features;',
      ] },
    ],
  },
  {
    id: 'disclosure', title: '5. Disclosure of Personal Data',
    blocks: [
      { p: 'We may disclose your personal data to:' },
      { ul: [
        'July Systems and its affiliates;',
        'Our service providers (list of which can be located in our website), contractors, and partners;',
        'Payment processors, IT vendors, and hosting providers;',
        'Regulatory bodies, enforcement agencies, and courts when legally required;',
        'Third-party insurers or emergency responders where relevant;',
      ] },
      { p: 'We will not sell your personal data to third parties.' },
    ],
  },
  {
    id: 'obligatory', title: '6. Obligatory Nature and Consequences of Non-Disclosure',
    blocks: [{ ul: [
      'The provision of your personal data is obligatory where indicated, including but not limited to when required for registration, subscription, or to access certain services provided by QarQal. Failure to provide the required personal data may result in QarQal being unable to process your request, deliver the requested services, or comply with its legal obligations. In such cases, QarQal reserves the right to decline to provide services or to discontinue your access to the relevant features or offerings.',
    ] }],
  },
  {
    id: 'transfers', title: '7. Cross-border Data Transfers',
    blocks: [{ ul: [
      'Your personal data may be transferred to service providers located outside Malaysia. We will ensure such transfers are done securely and in compliance with PDPA requirements.',
    ] }],
  },
  {
    id: 'cookies', title: '8. Cookies and Tracking',
    blocks: [
      { p: 'We use cookies and similar technologies to:' },
      { ul: [
        'Enhance app and website functionality;',
        'Track usage patterns to improve services;',
        'Store preferences for a better user experience; or',
        'You may disable cookies via your browser settings, though this may affect functionality.',
      ] },
    ],
  },
  {
    id: 'security', title: '9. Security Measures',
    blocks: [{ ul: [
      'We implement appropriate technical and organisational measures to safeguard your personal data against loss, theft, misuse, unauthorised access, disclosure or alteration.',
      'Only authorised personnel are permitted to access your data on a need-to-know basis.',
    ] }],
  },
  {
    id: 'withdrawal', title: '10. Withdrawal of Consent, Account Deletion, and Data Retention',
    blocks: [{ ul: [
      'You may withdraw your consent to the continued use or processing of your personal data, or discontinue the use of QarQal services by deleting the application or deactivating your account. Upon such withdrawal or termination, July Systems will cease processing your personal data for the purposes for which consent was given.',
      'However, we may retain your personal data, notwithstanding the above, for as long as necessary to fulfil the purposes for which it was collected, or as required by applicable laws, regulations, or our internal policies.',
    ] }],
  },
  {
    id: 'access', title: '11. Access and Correction Rights',
    blocks: [
      { p: 'You have the right to:' },
      { ul: [
        'Request access to the personal data we hold about you;',
        'Request correction of any inaccurate or outdated data;',
        'Withdraw consent (subject to legal or contractual limitations);',
      ] },
      { p: 'All requests may be submitted via enquiry@qarqal.com' },
    ],
  },
  {
    id: 'choices', title: '12. Your Choices',
    blocks: [
      { p: 'You may opt out of marketing messages by:' },
      { ul: [
        'Setting your preferences in the QarQal app; and',
        'Contacting our customer service team via e-mail at enquiry@qarqal.com',
      ] },
      { p: 'Please note that essential service notifications, including but not limited to security updates and updates on regulatory policies or laws, may still be sent.' },
    ],
  },
  {
    id: 'links', title: '13. Link to Other Sites',
    blocks: [{ ul: [
      'A link from this site or application to another site does not imply endorsement of that site by July Systems or the QarQal app. QarQal does not control or manage the content or privacy practices of third-party sites and assumes no responsibility for them. Users are encouraged to review the privacy policies and terms of use of any external sites they visit via links provided on the QarQal app.',
    ] }],
  },
  {
    id: 'changes', title: '14. Changes to this Privacy Policy',
    blocks: [{ ul: [
      'July Systems reserves the right, at any time and at its sole discretion, to revise, amend, alter or update the contents of its website, the terms and conditions of use, and/or this Privacy Policy. Such changes may or may not be notified individually; however, any material updates will be published on our website or app. All revisions shall be made in good faith and for the purpose of enhancing user protection and service delivery.',
    ] }],
  },
  {
    id: 'contact', title: '15. Contact Us',
    blocks: [{ p: 'For any questions, requests, or complaints regarding this Privacy Policy, please contact us at : enquiry@qarqal.com' }],
  },
];

export const contactEmail = 'enquiry@qarqal.com';
