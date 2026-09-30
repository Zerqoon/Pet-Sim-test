import { PRICES } from './prices.js';
// Opisy i grafiki: ten plik. Wszystkie ceny: prices.js.

export const LAST_UPDATED = '2026-09-29T22:02:57Z';

export const SOURCE_PRESETS = {

  vipChest: { id: 'vipChest', name: 'VIP Chest', image: 'assets/sources/vip-chest.png' },

  moonChest: { id: 'moonChest', name: 'Moon Chest', image: 'assets/sources/moon-chest.png' },

  playtimeRewards: { id: 'playtimeRewards', name: 'PlayTime Rewards', image: 'assets/sources/playtime-rewards.png' },

};

export const PETS = [

  {

    id: 'rich-bee', name: 'RICH BEE', rarity: 'Exclusive',

    source: 'Release PACK',

    description: '250 Exist Only, Release PACK.',

    note: '250 Exist Only.', exists: 250,

    image: 'assets/pets/rich-bee.png', compactValue: true,

  },

  {

    id: 'ruby-nebula-star', name: 'Ruby Nebula Star', rarity: 'Exclusive', bestPct: 100,

    source: '1M Event',

    description: 'Exclusive pet from the 1M Event.',

    note: '1M EVENT.',

    image: 'assets/pets/ruby-nebula-star.png',

    eventBadge: '1M EVENT',

  },

  {

    id: 'universe-capybara', name: 'Universe Capybara', rarity: 'Exclusive', bestPct: 100,

    source: 'Exclusive Shop • Galaxy Egg', hatchChance: '0.3%',

    description: 'Exclusive pet from the Galaxy Egg in the Exclusive Shop.',

    image: 'assets/pets/universe-capybara.png',

  },

  {

    id: 'alien-emperor', name: 'Alien Emperor', rarity: 'Exclusive', bestPct: 95,

    source: 'Alien Egg', hatchChance: '1 / 1,000',

    description: 'Exclusive pet from the Alien Egg.',

    image: 'assets/pets/alien-emperor.png',

  },

  {

    id: 'caaaaat', name: 'Caaaaat', rarity: 'Exclusive', bestPct: 85,

    source: 'Basic Egg', map: 'The Overworld', hatchChance: '???',

    description: 'Exclusive pet from the Basic Egg.',

    image: 'assets/pets/caaaaat-v30.png',

  },

  {

    id: 'exquisite-cat', name: 'Exquisite Cat', rarity: 'Exclusive', bestPct: 85,

    source: 'VIP Chest', hatchChance: '1 in 10,000',

    description: 'Exclusive pet available from the VIP Chest.',

    image: 'assets/pets/exquisite-cat.png',

    dropSources: [SOURCE_PRESETS.vipChest],

  },

  {

    id: 'happy-cupcake', name: 'Happy Cupcake', rarity: 'Exclusive', bestPct: 85,

    source: 'PlayTime Rewards', hatchChance: '1 in 10K',

    description: 'Exclusive pet from PlayTime Rewards.',

    image: 'assets/pets/happy-cupcake.png',

    dropSources: [SOURCE_PRESETS.playtimeRewards],

  },

  {

    id: 'six-seven', name: 'Six Seven!', rarity: 'Exclusive', bestPct: 85,

    source: 'Party Egg', hatchChance: '1 / 15,000',

    description: 'Exclusive pet from the Party Egg.',

    image: 'assets/pets/six-seven.png',

  },

  {

    id: 'void-owl', name: 'Void Owl', rarity: 'Exclusive', bestPct: 75,

    source: 'Exclusive Shop • Galaxy Egg', hatchChance: '1.7%',

    description: 'Exclusive pet from the Galaxy Egg in the Exclusive Shop.',

    image: 'assets/pets/void-owl-v30.png',

  },

  {

    id: 'sun-deer', name: 'Sun Deer', rarity: 'Exclusive', bestPct: 65,

    source: 'Exclusive Shop • Galaxy Egg', hatchChance: '3%',

    description: 'Exclusive pet from the Galaxy Egg in the Exclusive Shop.',

    image: 'assets/pets/sun-deer-v30.png',

  },

  {

    id: 'spaceship-alien', name: 'Spaceship Alien', rarity: 'Exclusive', bestPct: 65,

    source: 'Exclusive Pet', hatchChance: '1 in 33',

    description: 'Exclusive Spaceship Alien pet.',

    image: 'assets/pets/spaceship-alien-v30.png',

  },

  {

    id: 'fallen-angel', name: 'Fallen Angel', rarity: 'Exclusive', bestPct: 60,

    source: 'Pack 1.0 Update', description: 'Limited Exclusive pet from Pack 1.0 Update.',

    note: 'Only 500 exist.', exists: 500,

    image: 'assets/pets/fallen-angel.png',

  },

  {

    id: 'job-cat', name: 'Job Cat', rarity: 'Exclusive', bestPct: 60,

    source: 'Pack 2.0 Update', description: '60% Best Pet from Pack 2.0 Update.',

    note: 'Only 700 exist.', exists: 700,

    image: 'assets/pets/job-cat-v30.png',

  },

  {

    id: 'galaxy-bunny', name: 'Galaxy Bunny', rarity: 'Exclusive', bestPct: 50,

    source: 'Exclusive Shop • Galaxy Egg', hatchChance: '30%',

    description: 'Exclusive pet from the Galaxy Egg in the Exclusive Shop.',

    image: 'assets/pets/galaxy-bunny.png',

  },

  {

    id: 'galaxy-cat', name: 'Galaxy Cat', rarity: 'Exclusive', bestPct: 40,

    source: 'Exclusive Shop • Galaxy Egg', hatchChance: '65%',

    description: 'Exclusive pet from the Galaxy Egg in the Exclusive Shop.',

    image: 'assets/pets/galaxy-cat-v30.png',

  },

  {

    id: 'pop-cat', name: 'Pop Cat', rarity: 'Exclusive',

    source: 'Party Egg', hatchChance: '1 in 200 (0.5%)',

    description: 'Animated Exclusive pet from the Party Egg.',

    image: 'assets/pets/pop-cat-normal-v30.png',

  },

  {

    id: 'queen-bee', name: 'Queen Bee', rarity: 'Secret', source: 'Universe Egg',

    description: 'Secret pet from the Universe Egg.', map: 'The Overworld', hatchChance: '???',

    supportsVariants: true,

    variantImages: {

      normal: 'assets/pets/queen-bee-normal.png',

      golden: 'assets/pets/queen-bee-golden.png',

      diamond: 'assets/pets/queen-bee-diamond.png',

    },

    

  },

  {

    id: 'blaze-phoenix', name: 'Blaze Phoenix', rarity: 'Secret', source: 'Secret Pet',

    description: 'Secret pet Blaze Phoenix.', map: 'Volcano Hollow [World 7]', hatchChance: '1 in 12.5m',

    supportsVariants: true,

    variantImages: {

      normal: 'assets/pets/blaze-phoenix.png',

      golden: 'assets/pets/blaze-phoenix-golden.png',

      diamond: 'assets/pets/blaze-phoenix-diamond.png',

    },

    

  },

  {

    id: 'mossy-mushroom', name: 'Mossy Mushroom', rarity: 'Secret', source: 'Secret Pet',

    description: 'Increase Egg Luck by 5%.', map: 'Enchanted Grove [World 6]', hatchChance: '1 in 10m',

    supportsVariants: true,

    variantImages: {

      normal: 'assets/pets/mossy-mushroom-normal.png',

      golden: 'assets/pets/mossy-mushroom-gold.png',

      diamond: 'assets/pets/mossy-mushroom-diamond.png',

    },

    

  },

  {

    id: 'throne-dragon', name: 'Throne Dragon', rarity: 'Secret', source: 'Secret Pet',

    description: 'Secret pet Throne Dragon.', map: 'Pet Kingdom [World 5]', hatchChance: '1 in 5m',

    supportsVariants: true,

    variantImages: {

      normal: 'assets/pets/throne-dragon-normal.png',

      golden: 'assets/pets/throne-dragon-gold.png',

      diamond: 'assets/pets/throne-dragon-diamond.png',

    },

    

  },

  {

    id: 'ruby-majesty', name: 'Ruby Majesty', rarity: 'Mythical', source: '1M Event',

    description: 'Mythical pet from the 1M Event.',

    supportsVariants: true,

    eventBadge: '1M EVENT',

    variantImages: {

      normal: 'assets/pets/ruby-majesty-normal.png',

      golden: 'assets/pets/ruby-majesty-golden.png',

      diamond: 'assets/pets/ruby-majesty-diamond.png',

    },

    

  },

  {

    id: 'ember-monster', name: 'Ember Monster', rarity: 'Mythical', source: 'Mythical Pet',

    description: 'Mythical pet Ember Monster.', map: 'Volcano Hollow [World 7]', hatchChance: '1 in 750K',

    supportsVariants: true,

    variantImages: {

      normal: 'assets/pets/ember-monster.png',

      golden: 'assets/pets/ember-monster-golden.png',

      diamond: 'assets/pets/ember-monster-diamond.png',

    },

    

  },

  {

    id: 'shadow-dominus', name: 'Shadow Dominus', rarity: 'Mythical', source: 'Mythical Pet',

    description: 'Mythical pet Shadow Dominus.',

    supportsVariants: true,

    variantImages: {

      normal: 'assets/pets/shadow-dominus.png',

      golden: 'assets/pets/shadow-dominus-golden-v30.png',

      diamond: 'assets/pets/shadow-dominus-diamond-v30.png',

    },

    

  },

  {

    id: 'imp', name: 'Imp', rarity: 'Mythical', source: 'Mythical Pet',

    description: 'Mythical pet Imp.', map: 'Volcano Hollow [World 7]', hatchChance: 'Unknown',

    supportsVariants: true,

    variantImages: {

      normal: 'assets/pets/imp.png',

      golden: 'assets/pets/imp-golden.png',

      diamond: 'assets/pets/imp-diamond.png',

    },

    

  },

  {

    id: 'grove-seeker', name: 'Grove Seeker', rarity: 'Mythical', source: 'Mythical Pet',

    description: 'Mythical pet Grove Seeker.', map: 'Enchanted Grove [World 6]', hatchChance: 'Unknown',

    supportsVariants: true,

    variantImages: {

      normal: 'assets/pets/grove-seeker.png',

      golden: 'assets/pets/grove-seeker-golden.png',

      diamond: 'assets/pets/grove-seeker-diamond.png',

    },

    

  },

  {

    id: 'exquisite-peacock', name: 'Exquisite Peacock', rarity: 'Mythical', source: 'Mythical Pet',

    description: 'Mythical pet Exquisite Peacock.', map: 'Pet Kingdom [World 5]', hatchChance: 'Unknown',

    supportsVariants: true,

    variantImages: {

      normal: 'assets/pets/exquisite-peacock.png',

      golden: 'assets/pets/exquisite-peacock-golden.png',

      diamond: 'assets/pets/exquisite-peacock-diamond.png',

    },

    

  },

];

export const CHARMS = [

  { id:'secret-charm', name:'Secret Charm', rarity:'Exclusive', source:'Charm', description:'Secret Charm.', image:'assets/items/secret-charm-v30.png' },

  { id:'lightning-charm', name:'Lightning Charm', rarity:'Exclusive', source:'Charm', description:'Lightning Charm.', image:'assets/items/lightning-charm-v30.png' },

  { id:'moon-charm', name:'Moon Charm', rarity:'Mythical', source:'Charm', description:'Moon Charm.', image:'assets/items/moon-charm.png' },

  { id:'rubies-charm-iv', name:'Rubies Charm IV', rarity:'Legendary', source:'Charm', description:'Rubies Charm IV.', image:'assets/items/rubies-charm-iv.png' },

  { id:'hatch-charm-iv', name:'Hatch Charm IV', rarity:'Legendary', source:'Charm', description:'Hatch Charm IV.', image:'assets/items/hatch-charm-iv.png' },

  { id:'critical-charm-iv', name:'Critical Charm IV', rarity:'Legendary', source:'Charm', description:'Critical Charm IV.', image:'assets/items/critical-charm-iv.png' },

  { id:'luck-charm-iv', name:'Luck Charm IV', rarity:'Legendary', source:'Charm', description:'Luck Charm IV.', image:'assets/items/luck-charm-iv.png' },

  { id:'coins-charm-iv', name:'Coins Charm IV', rarity:'Legendary', source:'Charm', description:'Coins Charm IV.', image:'assets/items/coins-charm-iv.png' },

  { id:'hatch-charm-iii', name:'Hatch Charm III', rarity:'Epic', source:'Charm', description:'Hatch Charm III.', image:'assets/items/hatch-charm-iii.png', dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },

  { id:'critical-charm-iii', name:'Critical Charm III', rarity:'Epic', source:'Charm', description:'Critical Charm III.', image:'assets/items/critical-charm-iii-v30.png', dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },

  { id:'lucky-charm-iii', name:'Lucky Charm III', rarity:'Epic', source:'Charm', description:'Lucky Charm III.', image:'assets/items/lucky-charm-iii-v30.png', dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },

  { id:'rubies-charm-iii', name:'Rubies Charm III', rarity:'Epic', source:'Charm', description:'Rubies Charm III.', image:'assets/items/rubies-charm-iii-v30.png', dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },

  { id:'coins-charm-iii', name:'Coins Charm III', rarity:'Epic', source:'Charm', description:'Coins Charm III.', image:'assets/items/coins-charm-iii-v30.png', dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },

];

export const EGGS = [

  { id:'alien-egg', name:'Alien Egg', rarity:'Exclusive', source:'Alien Invasion [Event]', description:'Alien Invasion event egg.', image:'assets/eggs/alien-egg.png' },

  { id:'party-egg', name:'Party Egg', rarity:'Exclusive', source:'PlayTime Egg', description:'PlayTime Egg reward.', image:'assets/eggs/party-egg.png' },

  { id:'galaxy-egg', name:'Galaxy Egg', rarity:'Exclusive', source:'Galaxy Collection', description:'Galaxy Egg.', image:'assets/eggs/galaxy-egg.png' },

];

export const CODES = [

  { id:'code-update2', name:'update2', code:'update2', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

  { id:'code-1mvisits', name:'1mvisits', code:'1mvisits', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

  { id:'code-roksek', name:'Roksek', code:'Roksek', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

  { id:'code-droverq', name:'DroverQ', code:'DroverQ', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

  { id:'code-release', name:'Release', code:'Release', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

  { id:'code-darkrose', name:'DarkRose', code:'DarkRose', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

];

export const ITEMS = [

  { id:'vip-voucher', name:'VIP Voucher', rarity:'Exclusive', source:'Utility Item', description:'VIP Voucher | Nobody wanna This.', image:'assets/items/vip-voucher.png', dropSources:[SOURCE_PRESETS.moonChest, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.playtimeRewards] },

  { id:'universe-shard', name:'Universe Shard', rarity:'Mythical', source:'Utility Item', description:'Universe Shard.', image:'assets/items/universe-shard-v30.png', dropSources:[SOURCE_PRESETS.moonChest, SOURCE_PRESETS.vipChest] },

  { id:'vip-key', name:'VIP Key', rarity:'Legendary', source:'Utility Item', description:'VIP Key.', image:'assets/items/vip-key.png' },

  { id:'globe', name:'Globe', rarity:'Legendary', source:'Utility Item', description:'Globe item.', image:'assets/items/globe-v30.png', dropSources:[SOURCE_PRESETS.moonChest, SOURCE_PRESETS.playtimeRewards] },

  { id:'ball', name:'Ball', rarity:'Epic', source:'Toy Item', description:'+10% Egg Luck while equipped on Unique Pet!', image:'assets/items/ball-v30.png', dropSources:[SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest, SOURCE_PRESETS.playtimeRewards] },

  { id:'squeaky', name:'Squeaky', rarity:'Epic', source:'Toy Item', description:'Squeaky toy item.', image:'assets/items/squeaky-v30.png', dropSources:[SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest, SOURCE_PRESETS.playtimeRewards] },

];

export const RARITY_ORDER = ['Exclusive', 'Secret', 'Mythical', 'Legendary', 'Epic', 'Rare', 'Basic'];

// Jedno zrodlo cen dla strony i Cloudflare Functions. Brak ceny = null.
for (const [category, list] of Object.entries({ pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS })) {
  for (const item of list) {
    const price = PRICES[category]?.[item.id];
    if (item.supportsVariants) {
      item.values = { normal: null, golden: null, diamond: null, ...(price && typeof price === 'object' ? price : {}) };
    } else {
      item.value = typeof price === 'number' || typeof price === 'string' ? price : null;
    }
  }
}
