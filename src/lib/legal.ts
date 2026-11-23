/**
 * Privacy policy, terms and support text, shown in the apps (LegalModal) and on the public website
 * (admin site: /legal/privacy, /legal/terms, /legal/delete-account).
 * Not legal advice: have a lawyer review before a big launch. Update UPDATED when you change the text.
 */
export const SUPPORT_EMAIL = 'ridegopabiliapp@gmail.com';
export const OPERATOR = 'Pabili';
export const UPDATED = '24 November 2026';

export type LegalDoc = 'privacy' | 'terms' | 'delete-account';
export type Section = { heading: string; body: string[] };

export const LEGAL_TITLES: Record<LegalDoc, string> = {
  privacy: 'Privacy policy',
  terms: 'Terms of service',
  'delete-account': 'Delete your account',
};

export const LEGAL: Record<LegalDoc, Section[]> = {
  privacy: [
    {
      heading: 'Who we are',
      body: [
        `${OPERATOR} runs the Pabili app (customers) and the Pabili Rider app (riders) in the Philippines. We follow the Data Privacy Act of 2012 (Republic Act 10173). Questions or requests: ${SUPPORT_EMAIL}.`,
      ],
    },
    {
      heading: 'What we collect',
      body: [
        'Account: your name, email address, mobile number and password (stored encrypted; we can never see it).',
        'Saved addresses: places you pin and choose to save (up to 20), with the details and names you give them. You can delete them in Account → Saved addresses.',
        'Orders: what you ask a rider to buy or pick up, store names, pickup and drop-off places and their map location, contact names and numbers you enter for a pickup or receiver, fees, promo codes, receipt amounts, ratings and order times.',
        'Location: while you use the app, your location to set your address and show nearby stores (only if you allow it). Riders: their location while they are online, so customers can follow their order.',
        'Riders also give their motorcycle plate number and driver’s license number for approval.',
        'Notifications: if you allow them, a notification token for your phone, so we can alert you about your orders (riders: new jobs). Logging out removes it.',
        'We do not collect payment card details, contacts, photos or advertising IDs, and we do not show ads.',
      ],
    },
    {
      heading: 'How we use it',
      body: [
        'To take and deliver orders, calculate road distance and fees, let the customer and rider contact each other, show order history and earnings, approve riders, handle cash remittances, prevent fraud, and answer support requests.',
      ],
    },
    {
      heading: 'Who sees it',
      body: [
        'The rider who accepts your order sees your first name, mobile number, addresses and the order details. You see your rider’s name, mobile number, plate number and location during the order.',
        'Service providers that run the app for us: Supabase (database and login, servers in Singapore), Google Maps Platform (road distances, maps and nearby stores; it receives map coordinates), Expo and Google Firebase / Apple (delivering notifications), and Expo (app builds and updates).',
        'We do not sell your data. We share it with authorities only when the law requires.',
      ],
    },
    {
      heading: 'How long we keep it',
      body: [
        'Your account data is kept until you delete your account. Order and payment records are kept for accounting and tax purposes for as long as the law requires; when you delete your account they are separated from you and your name, phone numbers and exact address are removed from them.',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        'You can see and correct your details in the app, and delete your account at any time: Account → Delete account (customers) or Profile → Delete account (riders). You may also ask us for a copy of your data, to correct it, or to stop processing it, by emailing ' + SUPPORT_EMAIL + '. You can complain to the National Privacy Commission (privacy.gov.ph).',
      ],
    },
    {
      heading: 'Security and children',
      body: [
        'Data is sent over encrypted connections and protected by access rules so people can only see orders they are part of. Pabili is not meant for children under 18.',
      ],
    },
    { heading: 'Changes', body: ['If we change this policy we will update it here and show the new date. Last updated: ' + UPDATED + '.'] },
  ],

  terms: [
    {
      heading: 'The service',
      body: [
        `Pabili connects customers with independent motorcycle riders. Pabili orders: the rider buys items you list, at the store you choose, with the rider’s own money. Pasugo orders: the rider picks up a document, bag or package and brings it where you say. Pabili does not carry passengers.`,
      ],
    },
    {
      heading: 'Paying',
      body: [
        'The app shows the delivery fee before you order. For pabili you also repay the rider the exact amount on the store receipt. Payment is in cash to the rider for now.',
        'Prices for items are set by the stores, not by Pabili. Ask the rider for the receipt.',
      ],
    },
    {
      heading: 'Cancelling',
      body: ['You can cancel for free until the rider arrives at the store or pickup point. After that the order can no longer be cancelled in the app.'],
    },
    {
      heading: 'What you may not order',
      body: [
        'Anything illegal; drugs; firearms, explosives or other weapons; stolen goods; live animals; cash or valuables over ₱5,000; prescription medicine without a valid prescription; alcohol or tobacco for anyone under 18; anything dangerous or too big or heavy for a motorcycle. Riders may refuse any item they think is unsafe or illegal.',
      ],
    },
    {
      heading: 'Your responsibilities',
      body: [
        'Give correct addresses and contact numbers, be reachable during the order, and treat riders with respect. Pack pasugo items properly. Pabili may suspend accounts that break these rules or abuse promos.',
      ],
    },
    {
      heading: 'Riders',
      body: [
        'Riders are independent and are approved by Pabili before they can take jobs. They must hold a valid driver’s license and registration, follow traffic laws, and wear a helmet. Riders keep their share of each fee shown in the app and hand the rest of any cash they collect to Pabili.',
      ],
    },
    {
      heading: 'Liability',
      body: [
        'We work to make every delivery safe and on time, but the service is provided as it is. If an item is lost or damaged, contact us within 24 hours at ' + SUPPORT_EMAIL + ' and we will help resolve it with the rider. Nothing in these terms limits your rights as a consumer under Philippine law.',
      ],
    },
    { heading: 'Changes and law', body: ['These terms follow the laws of the Philippines. We may update them; the date below shows the latest version. Last updated: ' + UPDATED + '.'] },
  ],

  'delete-account': [
    {
      heading: 'Delete in the app',
      body: [
        'Pabili app: open Account → Delete account.',
        'Pabili Rider app: open Profile → Delete account.',
        'Your login, name, phone number and rider details are deleted right away. You need to finish or cancel any open order first, and riders need to settle their cash balance with Pabili first.',
      ],
    },
    {
      heading: 'No access to the app?',
      body: [`Email ${SUPPORT_EMAIL} from the email address of your account with the subject “Delete my account”. We delete it within 7 days and confirm by email.`],
    },
    {
      heading: 'What we keep',
      body: [
        'Records of past orders and cash payments are kept for accounting and tax purposes as the law requires, without your name, phone numbers or exact address.',
      ],
    },
  ],
};
