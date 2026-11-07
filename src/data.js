// Verified business information only. Do not add prices, hours, trainer names or testimonials
// until the business confirms them.
export const CONTACT = {
  name: 'AT FITNESS',
  phone: '+91 95574 88787',
  phoneHref: 'tel:+919557488787',
  whatsapp: '919557488787',
  email: 'info@atfitness.in',
  addressLines: ['No. 25/19/1, The Atrium, 2nd Floor,', 'Municipal, EC Road, Rajeev Marg 2,', 'Dehradun, Uttarakhand 248001'],
  mapEmbed: 'https://maps.google.com/maps?q=AT%20Fitness%20The%20Atrium%20EC%20Road%20Dehradun%20248001&output=embed',
  mapLink: 'https://www.google.com/maps/search/?api=1&query=AT+Fitness+The+Atrium+EC+Road+Dehradun+248001',
};

// The four real photographs supplied (image 5 was a byte-identical duplicate of image 4).
export const PHOTOS = {
  pilates: { src: '/images/pilates-reformer.webp', w: 431, h: 585, alt: 'An instructor guiding a client through a reformer Pilates exercise at AT FITNESS' },
  boxing: { src: '/images/boxing-studio.webp', w: 1360, h: 765, alt: 'The AT FITNESS boxing zone: leather heavy bags, mirrored walls and warm golden lighting' },
  aerial: { src: '/images/aerial-hoop.webp', w: 680, h: 1020, alt: 'A performer inverted on an aerial hoop in the AT FITNESS studio' },
  suspension: { src: '/images/suspension.webp', w: 141, h: 235, alt: 'Two people practising suspension and aerial workouts on mats' },
};

// Scene IV · Beyond Pilates. Real photographs where we have them; the aerial silk chapter uses the
// stylised performer and the last chapter an animated figure until real photography/footage is supplied.
export const CHAPTERS = [
  { title: 'Aerial Hoop / Lyra', sub: 'Strength, flexibility and grace, suspended.', art: 'photo', photo: 'aerial', pos: '50% 36%' },
  { title: 'Aerial Silk', sub: 'Fluid, climbing and wrapping: control that looks effortless.', art: 'silk' },
  { title: 'Boxing', sub: 'A dedicated boxing zone: heavy bags, conditioning and technique.', art: 'photo', photo: 'boxing', pos: '30% 50%' },
  { title: 'Functional Training', sub: 'Suspension and bodyweight work that builds strength you can use.', art: 'contain', photo: 'suspension' },
  { title: 'Strength & Conditioning', sub: 'Structured strength training for every level, from first session to experienced.', art: 'fig', fig: 'lifter' },
];

export const PROGRAMS = [
  'Strength Training', 'Weight Loss Programs', 'Pilates', 'Pilates Reformer', 'Functional Training',
  'Cardio Workouts', 'Personal Training', 'Flexibility & Mobility', 'Group Fitness Classes',
];

export const FAQS = [
  { q: 'I have never trained before. Can I join?', a: 'Yes. Beginners and experienced fitness enthusiasts are both welcome at AT FITNESS, and our trainers guide you through every exercise.' },
  { q: 'What programmes do you offer?', a: 'Strength training, weight loss programmes, Pilates and Pilates Reformer, functional training, cardio workouts, personal training, flexibility and mobility sessions, and group fitness classes. Our studio also has a boxing zone and aerial hoop sessions.' },
  { q: 'How does the coaching work?', a: 'You train with certified trainers who build personalised workout plans, guide your technique and support you continuously.' },
  { q: 'Is there a free trial?', a: 'Yes. Send us your details through the form on this page and our team will get in touch to arrange your free trial session.' },
  { q: 'How do I join, and what does it cost?', a: 'Call, WhatsApp or email us and we will walk you through the options. Membership details are shared directly on enquiry.' },
  { q: 'What are your timings?', a: 'Please call or message us for current class timings and availability.' },
  { q: 'Where are you?', a: 'The Atrium, 2nd Floor, EC Road, Rajeev Marg 2, Dehradun.' },
];

export const NAV = [
  ['story', 'Pilates'], ['beyond', 'Disciplines'], ['intro', 'The Studio'], ['inside', 'Inside'],
  ['coaching', 'Coaching'], ['trial', 'Free Trial'], ['faq', 'FAQ'], ['contact', 'Contact'],
];

// Labels shown when the visitor hovers a part of the 3D Reformer.
export const PART_INFO = {
  carriage: { title: 'The carriage', text: 'It glides on tracks, so every stroke is smooth, quiet and controlled.' },
  springs: { title: 'Springs', text: 'Adjustable resistance. Your trainer tunes the load to your body and your goal.' },
  footbar: { title: 'Footbar', text: 'Press, push and anchor. Many classic exercises begin here.' },
  straps: { title: 'Ropes & straps', text: 'Pulleys guide the handles for precise arm and leg work.' },
  headrest: { title: 'Headrest & shoulder rests', text: 'Support that keeps your alignment honest while you move.' },
  frame: { title: 'The frame', text: 'The long, stable track the carriage rides on.' },
};
