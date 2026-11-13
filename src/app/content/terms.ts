// QarQal Terms & Conditions, copied word for word from https://www.qarqal.com/terms-and-conditions (21 Oct 2026).
// This is a legal text: change it only with the owner's approval, never to "tidy" the wording (the heading
// "DEFINITONS" is spelled as on the live page). Clauses keep their own numbers: 7, 7.1, a) …

export interface Clause { n: string; text: string; sub?: Clause[] }
export interface TermsSection { id: string; title: string; clauses: Clause[] }

export const heading = "A LEGAL DISCLAIMER";

export const sections: TermsSection[] = [
  {
    "id": "definitons",
    "title": "DEFINITONS",
    "clauses": [
      {
        "n": "1",
        "text": "These Terms and Conditions (“Terms”) govern your access to and use of the QarQal mobile application (“QarQal app”) and the services provided through it (collectively, the “Services”), which are owned and operated by July Systems Sdn. Bhd. (“July Systems”, “we”, “us” or “our”). The QarQal app is developed and maintained by July Systems, a digital innovation company specializing in mobility solutions, platform development, and analytics. By accessing or using the QarQal app, you agree to be legally bound by these Terms. If you do not agree to these Terms, you must not access or use the Services."
      },
      {
        "n": "2",
        "text": "By clicking the “Yes” button or otherwise indicating your acceptance, you consent to these Terms in full, and acknowledge that your right to dispute or challenge these Terms is irrevocably waived."
      },
      {
        "n": "3",
        "text": "References to \"you\" in these Terms of Service means you, your duly authorized representatives and any entity you may represent in connection with your use of the Services. Any reference made in these Terms shall be deemed to refer to July Systems, the owner and operator of the QarQal app, including its subsidiaries, affiliates, successors, and assigns, as applicable."
      },
      {
        "n": "4",
        "text": "Not all Services described on this QarQal app are available in all states within Malaysia, and you may not be eligible for certain Services. July Systems reserves the right to determine eligibility at its sole discretion. By accessing or using our Services, you acknowledge and agree to be bound by these Terms and our Privacy Policy. If you do not accept these Terms, you are not authorized to access or use the Services."
      },
      {
        "n": "5",
        "text": "We reserve the right, at our sole discretion, to amend or update these Terms at any time. Any such modifications shall become effective immediately upon posting on our QarQal app. We encourage you to review the Terms periodically. Your continued use of the QarQal app or the Services after the posting of any changes constitutes your acceptance of those changes."
      }
    ]
  },
  {
    "id": "eligibility",
    "title": "ELIGIBILITY",
    "clauses": [
      {
        "n": "6",
        "text": "The Services are only available to users aged 18 years or older. If we become aware that a user is under the age of 18, access will be terminated. If you are using the Services on behalf of a company or other legal entity, you represent and warrant that you are authorised to bind such entity to these Terms, and your acceptance of these Terms shall be deemed an acceptance by that entity."
      }
    ]
  },
  {
    "id": "disclosure",
    "title": "DISCLOSURE",
    "clauses": [
      {
        "n": "7",
        "text": "We reserve the right to access, read, preserve and disclose any information as we reasonably believe is necessary to:",
        "sub": [
          {
            "n": "7.1",
            "text": "Satisfy any applicable law, regulation, legal process, subpoena or governmental request;"
          },
          {
            "n": "7.2",
            "text": "Enforce these Terms, including investigation of potential violations of it;"
          },
          {
            "n": "7.3",
            "text": "Detect, prevent, or otherwise address fraud, security or technical issues;"
          },
          {
            "n": "7.4",
            "text": "Cooperate with law enforcement authorities;"
          },
          {
            "n": "7.5",
            "text": "Respond to user support requests; and"
          },
          {
            "n": "7.6",
            "text": "Protect our, our users or the public's rights, property or safety."
          }
        ]
      }
    ]
  },
  {
    "id": "limitation-of-liability",
    "title": "LIMITATION OF LIABILITY",
    "clauses": [
      {
        "n": "8",
        "text": "To the maximum extent permitted by law, the Service is provided on an \"as is\" and \"as available\" basis. You expressly understand and agree that:",
        "sub": [
          {
            "n": "8.1",
            "text": "Your use of the Services is entirely at your own risk. July Systems expressly disclaims, to the fullest extent permitted by law, all warranties and conditions of any kind, whether express or implied, including but not limited to, implied warranties or conditions of merchantability, fitness for a particular purpose, and non-infringement."
          },
          {
            "n": "8.2",
            "text": "July Systems makes no warranty that:",
            "sub": [
              {
                "n": "a)",
                "text": "the service will meet all of your requirements;"
              },
              {
                "n": "b)",
                "text": "the Service will be uninterrupted, timely, secure, or error-free; or"
              },
              {
                "n": "c)",
                "text": "any errors in the Service or software will be corrected."
              }
            ]
          }
        ]
      },
      {
        "n": "9",
        "text": "Any material downloaded or otherwise obtained through the use of the service is done at your own discretion and risk and you are solely responsible for any damage to your computer or other device or loss of data resulting from the download or use of any such material."
      },
      {
        "n": "10",
        "text": "No information, whether oral or written, obtained by you from July Systems shall create any warranty not expressly stated in these Terms. You expressly understand and agree that July Systems, its subsidiaries, affiliates and licensors, and our and their respective officers, employees, agents and successors shall not be liable to you for any direct, indirect, incidental, special, consequential, punitive or exemplary damages, including but not limited to, damages for loss of profits, goodwill, use, data, cover or other intangible losses (even if July Systems has been advised of the possibility of such damages) resulting from:",
        "sub": [
          {
            "n": "10.1",
            "text": "the use or the inability to use the Service;"
          },
          {
            "n": "10.2",
            "text": "unauthorized access to or the loss, corruption or alteration of your transmissions, content or data;"
          },
          {
            "n": "10.3",
            "text": "statements or conduct of any third party on or using the Service, or providing any services related to the operation of the Service;"
          },
          {
            "n": "10.4",
            "text": "July Systems actions or omissions in reliance upon your account information and any changes thereto or notices received therefrom:",
            "sub": [
              {
                "n": "a)",
                "text": "the acts or omissions of any third party using or integrating with the Service;"
              },
              {
                "n": "b)",
                "text": "reliance on the information contained in the QarQal app,"
              },
              {
                "n": "c)",
                "text": "any technical, hardware or software failure of any kind or any interruption, error, omission, delay in operation, computer viruses, or otherwise; or"
              },
              {
                "n": "d)",
                "text": "any other matter relating to the Service; unless caused by our wilful default or fraud."
              }
            ]
          },
          {
            "n": "10.5",
            "text": "To the extent permitted by law, July Systems will not be responsible for loss of profits, revenues, or data, financial losses or indirect, special, consequential, exemplary or punitive damages."
          },
          {
            "n": "10.6",
            "text": "To the extent permitted by law, the total liability of July Systems for any claim under these terms, including for any implied warranties, is limited to the amount you paid us to use the Services for which the claim relates to (or, if we choose, to supply you the Services again)."
          }
        ]
      }
    ]
  },
  {
    "id": "use-of-services",
    "title": "USE OF SERVICES",
    "clauses": [
      {
        "n": "11",
        "text": "You may not use the Services for any unauthorised commercial purpose or exploit any part of the Services without July Systems’s prior written consent."
      },
      {
        "n": "12",
        "text": "Any reliance on or use of third-party services accessed through the July Systems platform is at your own risk. July Systems shall not be liable for any acts, omissions, negligence, or misconduct of any third-party service provider."
      },
      {
        "n": "13",
        "text": "July Systems, its affiliates, officers, employees or agents shall not be liable to you for any indirect, incidental, special, consequential, or exemplary damages, including but not limited to loss of profits, goodwill, data, or other intangible losses, arising from:",
        "sub": [
          {
            "n": "13.1",
            "text": "your use or inability to use the Services;"
          },
          {
            "n": "13.2",
            "text": "any agreement between you and such service providers. Where applicable, liability for any acts, omissions, or failure to perform on the part of third-party service providers shall vest with the respective service providers;"
          },
          {
            "n": "13.3",
            "text": "unauthorized access, alteration, or loss of your data; and"
          },
          {
            "n": "13.4",
            "text": "any other matter incidental to the Services."
          }
        ]
      },
      {
        "n": "14",
        "text": "Without prejudice to the above, July Systems’s total cumulative liability to you in respect of any claim arising out of or in connection with the Services shall not exceed the total amount paid by you for the Service that gave rise to the claim."
      }
    ]
  },
  {
    "id": "unauthorized-use",
    "title": "UNAUTHORIZED USE",
    "clauses": [
      {
        "n": "15",
        "text": "You agree not to use the Service or any aspect or feature thereof for any unlawful purpose or in any way that might harm, damage, or disparage any other party."
      },
      {
        "n": "16",
        "text": "Without limiting the sentence above, you agree that you will:",
        "sub": [
          {
            "n": "16.1",
            "text": "comply with all applicable laws, including, without limitation, privacy laws, intellectual property laws, export control laws, tax laws, and regulatory requirements;"
          },
          {
            "n": "16.2",
            "text": "provide accurate information to us and update it as necessary; and"
          },
          {
            "n": "16.3",
            "text": "act honestly and in good faith."
          }
        ]
      },
      {
        "n": "17",
        "text": "By using the Services you agree NOT to:",
        "sub": [
          {
            "n": "17.1",
            "text": "defame, stalk, bully, abuse, threaten, harass, abuse, intimidate, harm another person or engage in any other predatory behaviour, including sending unwelcomed communications to others or engage in any other predatory behaviour, or incite others to commit violent acts."
          },
          {
            "n": "17.2",
            "text": "use or attempt to create a false identity;"
          },
          {
            "n": "17.3",
            "text": "duplicate, license, sublicense, publish, broadcast, transmit, distribute, perform, display, sell, rebrand, or otherwise transfer information found in the Services, except as permitted in these Terms, or as expressly authorized by us;"
          },
          {
            "n": "17.4",
            "text": "utilize or copy information, content or any data you view on or obtain from the Services to provide any service that is competitive, in our sole discretion, with the Services;"
          },
          {
            "n": "17.5",
            "text": "adapt, modify or create derivative works based on the Services or technology underlying the Services, in whole or part;"
          },
          {
            "n": "17.6",
            "text": "sell, sponsor, or otherwise monetize any service or functionality in the Services, without our express written consent;"
          },
          {
            "n": "17.7",
            "text": "remove, cover or otherwise obscure any form of advertisement included in the Services;"
          },
          {
            "n": "17.8",
            "text": "collect, harvest, use, copy, or transfer any information, including, but not limited to, personally identifiable information obtained from the Services (excluding your User Content, and except if the owner of such information has expressly permitted the same);"
          },
          {
            "n": "17.9",
            "text": "share other users' or third party's information or their User Content without their express consent;"
          },
          {
            "n": "17.10",
            "text": "engage in any action that directly or indirectly interferes with the proper working of or places an unreasonable load on the Service's infrastructure, including, but not limited to, sending unsolicited communications to other users or our personnel, attempting to gain unauthorized access to the Services, or transmitting or activating computer viruses, Trojan horses, worms, time bombs or any other harmful or deleterious software programs through or on the Services; and/or"
          },
          {
            "n": "17.11",
            "text": "interfere or disrupt or game the Services, including, but not limited to any servers or networks connected to the Services, or the underlying software."
          }
        ]
      }
    ]
  },
  {
    "id": "indemnity",
    "title": "INDEMNITY",
    "clauses": [
      {
        "n": "18",
        "text": "You agree to defend, indemnify July Systems, its affiliates, and their respective owners, directors, officers, employees, agents, and licensors from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses (including but not limited to legal fees) arising from or in connection with:",
        "sub": [
          {
            "n": "18.1",
            "text": "your use or misuse of the Services;"
          },
          {
            "n": "18.2",
            "text": "your breach of these Terms;"
          },
          {
            "n": "18.3",
            "text": "your violation of any rights of a third party, including but not limited to intellectual property, proprietary, publicity, or privacy rights; and"
          },
          {
            "n": "18.4",
            "text": "any acts, omissions, or negligence committed by you or any person using your account, with or without your knowledge or consent."
          }
        ]
      }
    ]
  },
  {
    "id": "governing-law-and-jurisdiction",
    "title": "GOVERNING LAW AND JURISDICTION",
    "clauses": [
      {
        "n": "19",
        "text": "These Terms, the Services, and your use of the QarQal app shall be governed in all respects by the laws of Malaysia. You agree to submit to the exclusive jurisdiction of the High Court of Malaya in respect of any dispute arising therefrom."
      }
    ]
  },
  {
    "id": "general",
    "title": "GENERAL",
    "clauses": [
      {
        "n": "20",
        "text": "We reserve the right to discontinue or modify any aspect of the Services at any time, without prior notice and without liability. Such actions, where taken, will be done in good faith and with the intention of improving, maintaining, or protecting the integrity, quality, or availability of the Services. We will use reasonable efforts to minimise disruption and, where appropriate, communicate material changes in advance."
      },
      {
        "n": "21",
        "text": "These Terms, together with our Privacy Policy and any other policies or legal notices published by July Systems in connection with the Services, constitute the entire agreement between you and July Systems concerning your use of the Services."
      },
      {
        "n": "22",
        "text": "If any provision of these Terms is found to be invalid or unenforceable by a court of competent jurisdiction, such provision shall be deemed severed and the remaining provisions shall remain valid and enforceable to the fullest extent permitted by law."
      },
      {
        "n": "23",
        "text": "No failure or delay by July Systems in exercising any right, power, or remedy under these Terms shall operate as a waiver of that right or any other right. Any waiver must be expressly set out in writing and signed by July Systems."
      }
    ]
  },
  {
    "id": "electronic-communication",
    "title": "ELECTRONIC COMMUNICATION",
    "clauses": [
      {
        "n": "24",
        "text": "By using the QarQal app and Services, you expressly consent to receive all communications, records, and documents, including service confirmations, receipts, and any relevant information, in electronic format. July Systems operates on a paperless basis, and all correspondences will be delivered digitally via the platform, e-mail, or any other electronic means specified by you. You may download and print any documents provided to you electronically for your personal records."
      }
    ]
  },
  {
    "id": "force-majeure",
    "title": "FORCE MAJEURE",
    "clauses": [
      {
        "n": "25",
        "text": "July Systems shall not be liable for any failure or delay in performing its obligations under these Terms due to circumstances beyond its reasonable control, including but not limited to acts of God, war, riot, pandemic, government orders, or disruptions to telecommunications or utility services."
      }
    ]
  },
  {
    "id": "modifying-and-terminating-our-services",
    "title": "MODIFYING AND TERMINATING OUR SERVICES",
    "clauses": [
      {
        "n": "26",
        "text": "We continuously improve and update our Services. We may add, remove, or modify functionalities or features, and may suspend or discontinue a Service entirely."
      },
      {
        "n": "27",
        "text": "You may stop using our Services at any time, should you decide to do so. July Systems may also stop providing Services to you or impose new limits at any time."
      },
      {
        "n": "28",
        "text": "If we discontinue a Service, we will, where reasonably possible, provide reasonable advance notice and an opportunity for you to retrieve your information. July Systems reserves the right to suspend or terminate your access to the Services, including through the QarQal app and Services at any time, for any reason, including but not limited to any violation of these Terms or infringement of rights belonging to July Systems, other users, or third parties."
      }
    ]
  },
  {
    "id": "business-use-of-the-services",
    "title": "BUSINESS USE OF THE SERVICES",
    "clauses": [
      {
        "n": "29",
        "text": "If you use our Services on behalf of a business or company, that business or company accepts these Terms. It agrees to indemnify and hold harmless July Systems, its service providers, customers, officers, agents, and employees from any claims, suits, liabilities, losses, damages, litigation costs, and attorney’s fees arising out of or related to the use of the Services or violation of these Terms."
      }
    ]
  },
  {
    "id": "about-these-terms",
    "title": "ABOUT THESE TERMS",
    "clauses": [
      {
        "n": "30",
        "text": "July Systems may update or amend these Terms, related policies, or additional terms at any time to reflect legal, regulatory, or operational changes. You are responsible for reviewing these Terms regularly to stay informed."
      }
    ]
  }
];
