/* =====================================================================
 * CIRCUS CATS — BREED LIST (edit this file to add or change cats)
 * =====================================================================
 * Every cat in the Cat Shop comes from this list. For each breed you can set:
 *
 *   id        unique short name, no spaces           e.g. 'siamese'
 *   name      what players see                        e.g. 'Siamese'
 *   price     coins needed (1 coin per ring passed). 0 = free / starter cat
 *             (house cats: +20 each, Big & Wild Cats: +50 each)
 *   look      how the drawn cat looks (colours, pattern, ears, tail, body shape)
 *   voice     settings for the built-in (generated) meow and cry sounds
 *   files     OPTIONAL real files that REPLACE the built-in ones:
 *               meow:     'sounds/siamese-meow.mp3'  (played on every jump)
 *               cry:      'sounds/siamese-cry.mp3'   (played on game over)
 *               gameOver: 'images/siamese-cry.png'   (picture on the Game Over card,
 *                                                     square PNG, transparent background works best)
 *             Put the files in the www/sounds and www/images folders.
 *             If a file is missing or fails to load, the built-in version is used.
 *
 * look options
 *   coat      main colour               shade   darker colour (far legs), optional
 *   line      outline colour (optional)
 *   belly     chest/belly colour        chin    white chin/muzzle colour
 *   socks     paw colour                brow    light patch above the eyes
 *   points    colour-point colour (face mask, ears, legs, tail)   (Siamese style)
 *   pattern   'tabby' | 'stripes' (tiger) | 'spots' | 'rosette' | 'ticked' | 'calico' | 'clouds'
 *   patColor  pattern colour            patColor2  second pattern colour (rosette centre / calico)
 *   dense     true = many small spots   big   true = big bold spots    dotted  true = dot in rosettes (jaguar)
 *   fur       0 = short, 1 = semi-long, 2 = long and fluffy
 *   hairless  true = no fur (Sphynx)    wrinkles  true = skin wrinkles
 *   rex       true = wavy curly coat (Devon / Cornish Rex)
 *   ears      'normal' | 'small' | 'round' | 'fold' | 'curl' | 'tufted'
 *   earSize   ear size (1 = normal)     tuftLen  length of ear-tip tufts    earBack  colour of ear backs
 *   tail      'long' | 'thin' | 'plume' (fluffy) | 'bob' (pom-pom) | 'stub' (almost none)
 *   tailRings ring colour on the tail   tailTip  tail-tip colour    tuftTip  true = lion tail tuft
 *   mane      mane colour (lion)        beard   cheek-ruff colour (lynx)
 *   tearMarks black "tear lines" (cheetah)      muzzleDots  dark whisker spots (cougar)
 *   eyes      eye colour                eyes2   second eye colour (odd-eyed cats)
 *   bigEyes   true = extra-big eyes     roundPupils  true = round pupils    grumpy  true = grumpy brows
 *   face      snout length (1 = normal, 0.45 = flat face like a Persian)
 *   head      head size (1 = normal)
 *   body      body length    legs  leg length    girth  body thickness (all 1 = normal)
 *   wild      true = wild cat (darker nose, white ear spots)
 *   ruff      colour of the circus ruffle collar
 *
 * voice options (built-in sounds)
 *   pitch     1 = normal, higher = smaller/squeakier, lower = deeper
 *   length    1 = normal meow length
 *   rasp      0..1 raspy, loud voice (Siamese / Oriental style)
 *   chirp     true = "mrrp!" trill on each jump instead of a meow
 *   roar      true = big-cat roar on each jump        saw  true = leopard "sawing" roar
 *   growl     true = short snarl/chuff on each jump
 *   cryPitch  pitch of the game-over cry
 *   yowl      true = long dramatic yowl on game over
 * Every cat uses the same hitbox size, so no cat is easier than another.
 * ===================================================================== */
window.CIRCUS_BREEDS = [
  {
    id: 'mainecoon', name: 'Maine Coon', price: 0,
    look: { coat: '#8f6d4b', line: '#3a2616', pattern: 'tabby', patColor: '#3b2a1c', belly: '#ecdfca', chin: '#f1e8da', fur: 2, ears: 'tufted', earSize: 1.25, tail: 'plume', body: 1.25, legs: 1.1, girth: 1.15, head: 1.08, eyes: '#c9a227', ruff: '#2b6fd6' },
    voice: { pitch: 0.82, chirp: true, cryPitch: 0.85 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'persian', name: 'Persian', price: 20,
    look: { coat: '#f6f1ea', shade: '#e2d9cf', line: '#b9ab9d', fur: 2, ears: 'small', tail: 'plume', face: 0.45, head: 1.1, girth: 1.15, legs: 0.75, eyes: '#e0862a', ruff: '#ff5c9a' },
    voice: { pitch: 0.95, length: 1.05, cryPitch: 0.95 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'siamese', name: 'Siamese', price: 40,
    look: { coat: '#f1e6d2', line: '#6d5a48', points: '#4a3428', earSize: 1.35, tail: 'thin', body: 1.12, legs: 1.1, girth: 0.85, face: 1.15, eyes: '#4aa3e8', ruff: '#d93b3b' },
    voice: { pitch: 1.08, rasp: 0.7, length: 1.1, cryPitch: 1.05, yowl: true },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'ragdoll', name: 'Ragdoll', price: 60,
    look: { coat: '#f4ede2', line: '#8a7a6c', points: '#857a78', socks: '#fdfbf8', chin: '#fdfbf8', fur: 2, tail: 'plume', body: 1.2, girth: 1.1, legs: 1.0, eyes: '#4aa3e8', ruff: '#8a2be2' },
    voice: { pitch: 0.88, length: 0.95, cryPitch: 0.9 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'british', name: 'British Shorthair', price: 80,
    look: { coat: '#8b939d', line: '#3d4249', ears: 'small', earSize: 1.1, tail: 'long', face: 0.75, head: 1.14, girth: 1.25, legs: 0.85, eyes: '#e39a2a', ruff: '#e0a800' },
    voice: { pitch: 0.8, length: 1.0, cryPitch: 0.8 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'bengal', name: 'Bengal', price: 100,
    look: { coat: '#dba35c', line: '#5a3515', pattern: 'rosette', patColor: '#3f2513', patColor2: '#b0702e', belly: '#f3e0bf', chin: '#f6ead3', tail: 'long', tailRings: '#3f2513', body: 1.15, legs: 1.1, eyes: '#8bc34a', ruff: '#1fa3a3' },
    voice: { pitch: 0.95, rasp: 0.3, cryPitch: 0.9 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'scottishfold', name: 'Scottish Fold', price: 120,
    look: { coat: '#c8cad0', line: '#50545c', pattern: 'tabby', patColor: '#6c7079', chin: '#f2f2f4', ears: 'fold', tail: 'long', face: 0.8, head: 1.12, girth: 1.12, legs: 0.9, eyes: '#e39a2a', ruff: '#ff5c9a' },
    voice: { pitch: 1.02, length: 0.9, cryPitch: 1.0 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'sphynx', name: 'Sphynx', price: 140,
    look: { coat: '#eab9a3', shade: '#d69d87', line: '#8a5646', hairless: true, wrinkles: true, earSize: 1.45, tail: 'thin', body: 1.05, girth: 0.95, eyes: '#8bc34a', ruff: '#e84a8a' },
    voice: { pitch: 1.0, rasp: 0.2, cryPitch: 1.0 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'russianblue', name: 'Russian Blue', price: 160,
    look: { coat: '#7e8a97', line: '#343b43', earSize: 1.18, tail: 'long', body: 1.1, legs: 1.05, girth: 0.95, eyes: '#4fc24a', ruff: '#e0a800' },
    voice: { pitch: 1.0, length: 0.8, cryPitch: 0.95 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'american', name: 'American Shorthair', price: 180,
    look: { coat: '#c9cdd2', line: '#3a3d43', pattern: 'tabby', patColor: '#2c2f35', chin: '#f4f5f6', tail: 'long', tailRings: '#2c2f35', girth: 1.08, eyes: '#8bc34a', ruff: '#d93b3b' },
    voice: { pitch: 0.95, cryPitch: 0.95 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'norwegian', name: 'Norwegian Forest Cat', price: 200,
    look: { coat: '#9c7b57', line: '#3e2b1b', pattern: 'tabby', patColor: '#3e2b1b', belly: '#fbf8f3', socks: '#fbf8f3', chin: '#fbf8f3', fur: 2, ears: 'tufted', earSize: 1.15, tail: 'plume', body: 1.2, legs: 1.1, girth: 1.15, eyes: '#c9a227', ruff: '#2f9e5b' },
    voice: { pitch: 0.84, chirp: true, cryPitch: 0.85 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'siberian', name: 'Siberian', price: 220,
    look: { coat: '#aa9b86', line: '#4b4035', pattern: 'tabby', patColor: '#51463b', belly: '#efe7da', chin: '#f5efe6', fur: 2, ears: 'tufted', tail: 'plume', body: 1.15, girth: 1.2, eyes: '#c9a227', ruff: '#c9302c' },
    voice: { pitch: 0.86, chirp: true, cryPitch: 0.85 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'birman', name: 'Birman', price: 240,
    look: { coat: '#f0e3cb', line: '#7a6450', points: '#4b3629', socks: '#fdfbf8', fur: 2, tail: 'plume', body: 1.1, girth: 1.05, eyes: '#3d8fe0', ruff: '#e0a800' },
    voice: { pitch: 0.95, length: 0.95, cryPitch: 0.95 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'abyssinian', name: 'Abyssinian', price: 260,
    look: { coat: '#c77c3b', line: '#5a2f0f', pattern: 'ticked', patColor: '#6e3a16', chin: '#f3dcc0', earSize: 1.3, tail: 'long', tailTip: '#4a2510', body: 1.1, legs: 1.15, girth: 0.9, eyes: '#b5a22a', ruff: '#2b6fd6' },
    voice: { pitch: 1.05, chirp: true, cryPitch: 1.0 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'angora', name: 'Turkish Angora', price: 280,
    look: { coat: '#fbfaf8', shade: '#e6e2dc', line: '#aaa198', fur: 1, earSize: 1.2, tail: 'plume', body: 1.1, legs: 1.1, girth: 0.85, eyes: '#3d8fe0', eyes2: '#e0b22a', ruff: '#ff5c9a' },
    voice: { pitch: 1.08, cryPitch: 1.05 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'exotic', name: 'Exotic Shorthair', price: 300,
    look: { coat: '#e6a462', line: '#7a4217', pattern: 'tabby', patColor: '#b8662a', chin: '#fbeede', ears: 'small', tail: 'long', tailRings: '#b8662a', face: 0.45, head: 1.15, girth: 1.25, legs: 0.75, eyes: '#d9822b', ruff: '#8a2be2' },
    voice: { pitch: 0.95, length: 0.95, cryPitch: 0.95 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'oriental', name: 'Oriental Shorthair', price: 320,
    look: { coat: '#6e412b', line: '#2a160c', earSize: 1.6, tail: 'thin', face: 1.3, body: 1.2, legs: 1.2, girth: 0.8, eyes: '#6fbf3a', ruff: '#e0a800' },
    voice: { pitch: 1.05, rasp: 0.75, length: 1.15, cryPitch: 1.0, yowl: true },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'devonrex', name: 'Devon Rex', price: 340,
    look: { coat: '#bcb0b3', line: '#5e5356', rex: true, earSize: 1.65, tail: 'thin', face: 0.8, head: 1.05, legs: 1.1, girth: 0.9, eyes: '#e0b22a', ruff: '#1fa3a3' },
    voice: { pitch: 1.12, length: 0.9, cryPitch: 1.1 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'burmese', name: 'Burmese', price: 360,
    look: { coat: '#5c3b25', line: '#24150b', tail: 'long', face: 0.85, head: 1.06, girth: 1.1, eyes: '#e8b62a', ruff: '#d93b3b' },
    voice: { pitch: 0.95, rasp: 0.4, cryPitch: 0.95, yowl: true },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'himalayan', name: 'Himalayan', price: 380,
    look: { coat: '#f3e9d8', line: '#8c7864', points: '#4b3629', fur: 2, ears: 'small', tail: 'plume', face: 0.45, head: 1.1, girth: 1.15, legs: 0.75, eyes: '#3d8fe0', ruff: '#2f9e5b' },
    voice: { pitch: 0.95, length: 1.05, cryPitch: 0.95 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'manx', name: 'Manx', price: 400,
    look: { coat: '#e79c47', line: '#7a3f10', pattern: 'tabby', patColor: '#b35f1f', belly: '#fcf3e6', chin: '#fcf3e6', tail: 'stub', body: 0.95, legs: 1.05, girth: 1.15, head: 1.05, eyes: '#c9a227', ruff: '#2b6fd6' },
    voice: { pitch: 0.95, chirp: true, cryPitch: 0.95 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'cornishrex', name: 'Cornish Rex', price: 420,
    look: { coat: '#e9b47d', line: '#7a4a1e', rex: true, belly: '#fdf8f1', socks: '#fdf8f1', chin: '#fdf8f1', earSize: 1.5, tail: 'thin', face: 1.2, body: 1.15, legs: 1.3, girth: 0.75, eyes: '#e0b22a', ruff: '#8a2be2' },
    voice: { pitch: 1.1, cryPitch: 1.1 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'tonkinese', name: 'Tonkinese', price: 440,
    look: { coat: '#a47d58', line: '#3e2616', points: '#5a3a24', tail: 'long', body: 1.05, girth: 0.95, eyes: '#35c2b0', ruff: '#e84a8a' },
    voice: { pitch: 1.0, rasp: 0.5, cryPitch: 1.0, yowl: true },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'somali', name: 'Somali', price: 460,
    look: { coat: '#c77c3b', line: '#5a2f0f', pattern: 'ticked', patColor: '#6e3a16', chin: '#f3dcc0', fur: 1, ears: 'tufted', earSize: 1.3, tail: 'plume', tailTip: '#4a2510', body: 1.1, legs: 1.1, girth: 0.95, eyes: '#8bc34a', ruff: '#e0a800' },
    voice: { pitch: 1.02, chirp: true, cryPitch: 1.0 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'americancurl', name: 'American Curl', price: 480,
    look: { coat: '#ead09e', line: '#7a5626', pattern: 'tabby', patColor: '#c08a45', chin: '#fdf8ef', fur: 1, ears: 'curl', earSize: 1.1, tail: 'plume', eyes: '#8bc34a', ruff: '#d93b3b' },
    voice: { pitch: 1.05, cryPitch: 1.05 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'egyptianmau', name: 'Egyptian Mau', price: 500,
    look: { coat: '#cfd3d7', line: '#3a3d43', pattern: 'spots', patColor: '#2c2f35', chin: '#f3f4f5', earSize: 1.1, tail: 'long', tailRings: '#2c2f35', tailTip: '#2c2f35', body: 1.1, legs: 1.15, girth: 0.95, eyes: '#9ccc3a', ruff: '#1fa3a3' },
    voice: { pitch: 1.0, chirp: true, cryPitch: 1.0 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'bobtail', name: 'Japanese Bobtail', price: 520,
    look: { coat: '#fbf8f2', shade: '#e4ddd2', line: '#6e6258', pattern: 'calico', patColor: '#e08a3a', patColor2: '#2b2426', earSize: 1.15, tail: 'bob', body: 1.1, legs: 1.1, girth: 0.9, eyes: '#e0b22a', ruff: '#d93b3b' },
    voice: { pitch: 1.1, chirp: true, cryPitch: 1.05 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'ocicat', name: 'Ocicat', price: 540,
    look: { coat: '#dab47c', line: '#5e3a1a', pattern: 'spots', patColor: '#6b3f1f', big: true, chin: '#f6ead6', tail: 'long', tailRings: '#6b3f1f', tailTip: '#4a2a12', body: 1.15, legs: 1.1, girth: 1.1, eyes: '#e0b22a', ruff: '#2f9e5b' },
    voice: { pitch: 0.92, cryPitch: 0.9 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'bombay', name: 'Bombay', price: 560,
    look: { coat: '#1e1b1d', line: '#050404', tail: 'long', face: 0.85, head: 1.05, girth: 1.05, eyes: '#e39a2a', ruff: '#e0a800' },
    voice: { pitch: 0.95, cryPitch: 0.95 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'balinese', name: 'Balinese', price: 580,
    look: { coat: '#f3ead9', line: '#7a6652', points: '#4a3428', fur: 1, earSize: 1.3, tail: 'plume', face: 1.1, body: 1.1, legs: 1.1, girth: 0.85, eyes: '#4aa3e8', ruff: '#8a2be2' },
    voice: { pitch: 1.06, rasp: 0.6, length: 1.1, cryPitch: 1.05, yowl: true },
    files: { meow: null, cry: null, gameOver: null }
  },

  /* ---------- BIG & WILD CATS ---------- */
  {
    id: 'tiger', name: 'Tiger', price: 630,
    look: { coat: '#e8862a', line: '#4a220b', pattern: 'stripes', patColor: '#1c1412', belly: '#fbf6ee', chin: '#fbf6ee', brow: '#fbf6ee', ears: 'round', earBack: '#1c1412', tail: 'long', tailRings: '#1c1412', tailTip: '#1c1412', wild: true, body: 1.3, legs: 1.05, girth: 1.2, head: 1.15, eyes: '#e0b22a', ruff: '#2b6fd6' },
    voice: { roar: true, pitch: 0.9, cryPitch: 0.6 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'lion', name: 'Lion', price: 680,
    look: { coat: '#d9a55a', line: '#5a3510', belly: '#f0d6a5', chin: '#f6e8cc', mane: '#8a4f1c', ears: 'round', tail: 'long', tailTip: '#5a3214', tuftTip: true, wild: true, body: 1.3, legs: 1.05, girth: 1.2, head: 1.12, eyes: '#c9a227', ruff: '#d93b3b' },
    voice: { roar: true, pitch: 0.75, cryPitch: 0.55 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'leopard', name: 'Leopard', price: 730,
    look: { coat: '#e2b25e', line: '#5a3a14', pattern: 'rosette', patColor: '#2a1a10', patColor2: '#c48a3a', belly: '#f6ead3', chin: '#f6ead3', ears: 'round', earBack: '#2a1a10', tail: 'long', tailRings: '#2a1a10', wild: true, body: 1.25, legs: 1.0, girth: 1.05, head: 1.05, eyes: '#9ccc3a', ruff: '#2f9e5b' },
    voice: { roar: true, saw: true, pitch: 1.05, cryPitch: 0.7 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'cheetah', name: 'Cheetah', price: 780,
    look: { coat: '#e6bf6e', line: '#5e3e12', pattern: 'spots', patColor: '#1c1412', belly: '#fbf3e3', chin: '#fbf3e3', tearMarks: '#1c1412', ears: 'round', earSize: 0.85, tail: 'long', tailRings: '#1c1412', tailTip: '#fbf6ee', wild: true, body: 1.25, legs: 1.35, girth: 0.82, head: 0.95, eyes: '#c9a227', ruff: '#e0a800' },
    voice: { chirp: true, pitch: 1.25, cryPitch: 1.1 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'jaguar', name: 'Jaguar', price: 830,
    look: { coat: '#d9a050', line: '#5a3510', pattern: 'rosette', patColor: '#1c1412', patColor2: '#a8662a', dotted: true, belly: '#f6ead3', chin: '#f6ead3', ears: 'round', earBack: '#1c1412', tail: 'long', tailRings: '#1c1412', wild: true, body: 1.2, legs: 0.95, girth: 1.3, head: 1.2, eyes: '#c9a227', ruff: '#c9302c' },
    voice: { roar: true, saw: true, pitch: 0.85, cryPitch: 0.65 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'snowleopard', name: 'Snow Leopard', price: 880,
    look: { coat: '#d8d6cf', line: '#55534d', pattern: 'rosette', patColor: '#4a4a4a', patColor2: '#b5b2aa', belly: '#f4f3ef', chin: '#f4f3ef', fur: 1, ears: 'round', earSize: 0.85, tail: 'plume', tailRings: '#4a4a4a', wild: true, body: 1.2, legs: 0.95, girth: 1.1, eyes: '#9fb8a8', ruff: '#1fa3a3' },
    voice: { growl: true, pitch: 1.0, cryPitch: 0.8 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'panther', name: 'Black Panther', price: 930,
    look: { coat: '#1a1718', line: '#050404', pattern: 'rosette', patColor: '#0d0b0c', patColor2: '#221e1f', ears: 'round', tail: 'long', wild: true, body: 1.25, legs: 1.05, girth: 1.15, head: 1.1, eyes: '#e0c22a', ruff: '#8a2be2' },
    voice: { roar: true, pitch: 0.95, cryPitch: 0.65 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'cougar', name: 'Cougar / Mountain Lion', price: 980,
    look: { coat: '#c79a63', line: '#5a3a1a', belly: '#f0e2cc', chin: '#fbf6ee', muzzleDots: '#3a2616', ears: 'round', earBack: '#3a2616', tail: 'long', tailTip: '#3a2616', wild: true, body: 1.25, legs: 1.1, girth: 1.0, eyes: '#c9a227', ruff: '#2b6fd6' },
    voice: { pitch: 0.7, rasp: 0.8, length: 1.4, cryPitch: 0.75, yowl: true },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'caracal', name: 'Caracal', price: 1030,
    look: { coat: '#c98f55', line: '#5a3010', chin: '#fbf3e6', belly: '#f3dcc0', brow: '#fbf3e6', ears: 'tufted', earSize: 1.55, tuftLen: 1.8, earBack: '#1c1412', tail: 'long', wild: true, body: 1.1, legs: 1.2, girth: 0.95, eyes: '#c9a227', ruff: '#e84a8a' },
    voice: { growl: true, pitch: 1.3, cryPitch: 0.95 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'serval', name: 'Serval', price: 1080,
    look: { coat: '#e3b45f', line: '#5e3e12', pattern: 'spots', patColor: '#1c1412', big: true, belly: '#fbf3e3', chin: '#fbf3e3', earSize: 1.75, earBack: '#1c1412', tail: 'long', tailRings: '#1c1412', tailTip: '#1c1412', wild: true, body: 1.05, legs: 1.45, girth: 0.82, eyes: '#c9a227', ruff: '#e0a800' },
    voice: { chirp: true, pitch: 1.15, cryPitch: 1.0 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'lynx', name: 'Lynx', price: 1130,
    look: { coat: '#b8a387', line: '#4a3b28', pattern: 'spots', patColor: '#7a6448', belly: '#efe6d8', chin: '#f6f0e6', beard: '#efe6d8', fur: 1, ears: 'tufted', earSize: 1.2, tuftLen: 1.4, tail: 'stub', tailTip: '#1c1412', wild: true, body: 1.05, legs: 1.3, girth: 1.05, eyes: '#c9a227', ruff: '#c9302c' },
    voice: { growl: true, pitch: 1.15, cryPitch: 0.9 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'ocelot', name: 'Ocelot', price: 1180,
    look: { coat: '#d9ab62', line: '#5a3a14', pattern: 'rosette', patColor: '#1c1412', patColor2: '#b9803c', belly: '#fbf3e3', chin: '#fbf3e3', ears: 'round', earBack: '#1c1412', tail: 'long', tailRings: '#1c1412', wild: true, body: 1.1, legs: 1.0, girth: 1.0, eyes: '#b5a22a', ruff: '#2f9e5b' },
    voice: { pitch: 0.95, rasp: 0.4, cryPitch: 0.9 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'clouded', name: 'Clouded Leopard', price: 1230,
    look: { coat: '#c2a97f', line: '#4a3a2a', pattern: 'clouds', patColor: '#4a3a2a', belly: '#efe4cf', chin: '#efe4cf', ears: 'round', earSize: 0.85, tail: 'plume', tailRings: '#3a2e22', wild: true, body: 1.25, legs: 0.85, girth: 1.05, eyes: '#c9a227', ruff: '#e0a800' },
    voice: { growl: true, pitch: 1.05, cryPitch: 0.85 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'fishing', name: 'Fishing Cat', price: 1280,
    look: { coat: '#9a958a', line: '#3a3833', pattern: 'spots', patColor: '#2c2a27', belly: '#d9d5cc', chin: '#ece9e3', ears: 'round', earSize: 0.8, tail: 'long', tailRings: '#2c2a27', wild: true, body: 1.15, legs: 0.85, girth: 1.15, eyes: '#c9a227', ruff: '#2b6fd6' },
    voice: { pitch: 0.85, rasp: 0.5, cryPitch: 0.85 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'pallas', name: "Pallas's Cat", price: 1330,
    look: { coat: '#a9a39a', line: '#4a463f', chin: '#efece6', brow: '#efece6', fur: 2, ears: 'small', earSize: 0.7, tail: 'plume', tailRings: '#3e3a35', tailTip: '#2a2724', grumpy: true, roundPupils: true, wild: true, face: 0.6, head: 1.1, body: 1.0, legs: 0.7, girth: 1.3, eyes: '#e0c22a', ruff: '#8a2be2' },
    voice: { growl: true, pitch: 1.2, cryPitch: 1.0 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'sandcat', name: 'Sand Cat', price: 1380,
    look: { coat: '#e2cfa3', line: '#7a6440', chin: '#fbf6ea', belly: '#f6ecd6', earSize: 1.35, tail: 'long', tailRings: '#5a4a30', tailTip: '#2a2219', wild: true, head: 1.12, body: 0.95, legs: 0.8, girth: 1.05, eyes: '#c9a227', ruff: '#e84a8a' },
    voice: { pitch: 1.2, chirp: true, cryPitch: 1.15 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'junglecat', name: 'Jungle Cat', price: 1430,
    look: { coat: '#b5a080', line: '#4a3b28', chin: '#efe6d8', ears: 'tufted', earSize: 1.25, tuftLen: 0.8, tail: 'long', tailRings: '#3a2e22', tailTip: '#1c1412', wild: true, body: 1.1, legs: 1.25, girth: 0.95, eyes: '#c9a227', ruff: '#1fa3a3' },
    voice: { pitch: 0.95, rasp: 0.4, cryPitch: 0.9 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'geoffroy', name: "Geoffroy's Cat", price: 1480,
    look: { coat: '#c8b893', line: '#4a3e28', pattern: 'spots', patColor: '#2a2219', dense: true, chin: '#f3eee3', ears: 'round', earBack: '#1c1412', tail: 'long', tailRings: '#2a2219', wild: true, body: 1.0, legs: 0.95, eyes: '#9ccc3a', ruff: '#d93b3b' },
    voice: { pitch: 1.1, cryPitch: 1.05 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'margay', name: 'Margay', price: 1530,
    look: { coat: '#d6a85c', line: '#5a3a14', pattern: 'rosette', patColor: '#1c1412', patColor2: '#b38040', belly: '#fbf3e3', chin: '#fbf3e3', ears: 'round', earBack: '#1c1412', tail: 'long', tailRings: '#1c1412', bigEyes: true, wild: true, body: 1.05, legs: 0.95, girth: 0.9, eyes: '#b5a22a', ruff: '#e0a800' },
    voice: { pitch: 1.15, cryPitch: 1.1 },
    files: { meow: null, cry: null, gameOver: null }
  },
  {
    id: 'rustyspotted', name: 'Rusty-Spotted Cat', price: 1580,
    look: { coat: '#a99582', line: '#4a3b2c', pattern: 'spots', patColor: '#9a4a22', dense: true, belly: '#f3ece3', chin: '#f3ece3', brow: '#f3ece3', ears: 'round', tail: 'long', bigEyes: true, wild: true, body: 0.9, legs: 0.9, girth: 0.85, head: 1.05, eyes: '#c9a227', ruff: '#2f9e5b' },
    voice: { pitch: 1.35, cryPitch: 1.3 },
    files: { meow: null, cry: null, gameOver: null }
  }
];
