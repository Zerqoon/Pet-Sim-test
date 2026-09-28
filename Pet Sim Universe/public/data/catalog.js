export const LAST_UPDATED = '2026-09-27T18:20:00Z';

export const SOURCE_PRESETS = {
  vipChest: { id: 'vipChest', name: 'VIP Chest', image: 'assets/sources/vip-chest.png' },
  moonChest: { id: 'moonChest', name: 'Moon Chest', image: 'assets/sources/moon-chest.png' },
  playtimeRewards: { id: 'playtimeRewards', name: 'PlayTime Rewards', image: 'assets/sources/playtime-rewards.png' },
};

export const PETS = [
  {
    id: 'universe-capybara', name: 'Universe Capybara', rarity: 'Exclusive', bestPct: 100,
    source: 'Exclusive Shop • Galaxy Egg', hatchChance: '0.3%',
    description: 'Exclusive pet from the Galaxy Egg in the Exclusive Shop.',
    image: 'assets/pets/universe-capybara.png', value: 22500,
  },
  {
    id: 'alien-emperor', name: 'Alien Emperor', rarity: 'Exclusive', bestPct: 95,
    source: 'Alien Egg', hatchChance: '1 / 1,000',
    description: 'Exclusive pet from the Alien Egg.',
    image: 'assets/pets/alien-emperor.png', value: 4250,
  },
  {
    id: 'caaaaat', name: 'Caaaaat', rarity: 'Exclusive', bestPct: 85,
    source: 'Basic Egg', map: 'The Overworld', hatchChance: '???',
    description: 'Exclusive pet from the Basic Egg.',
    image: 'assets/pets/caaaaat-v30.png', value: 3150,
  },
  {
    id: 'exquisite-cat', name: 'Exquisite Cat', rarity: 'Exclusive', bestPct: 85,
    source: 'VIP Chest', hatchChance: '1 in 10,000',
    description: 'Exclusive pet available from the VIP Chest.',
    image: 'assets/pets/exquisite-cat.png', value: 1400,
    dropSources: [SOURCE_PRESETS.vipChest],
  },
  {
    id: 'happy-cupcake', name: 'Happy Cupcake', rarity: 'Exclusive', bestPct: 85,
    source: 'PlayTime Rewards', hatchChance: '1 in 10K',
    description: 'Exclusive pet from PlayTime Rewards.',
    image: 'assets/pets/happy-cupcake.png', value: 1500,
    dropSources: [SOURCE_PRESETS.playtimeRewards],
  },
  {
    id: 'six-seven', name: 'Six Seven!', rarity: 'Exclusive', bestPct: 85,
    source: 'Party Egg', hatchChance: '1 / 15,000',
    description: 'Exclusive pet from the Party Egg.',
    image: 'assets/pets/six-seven.png', value: 1950,
  },
  {
    id: 'void-owl', name: 'Void Owl', rarity: 'Exclusive', bestPct: 75,
    source: 'Exclusive Shop • Galaxy Egg', hatchChance: '1.7%',
    description: 'Exclusive pet from the Galaxy Egg in the Exclusive Shop.',
    image: 'assets/pets/void-owl-v30.png', value: 350,
  },
  {
    id: 'sun-deer', name: 'Sun Deer', rarity: 'Exclusive', bestPct: 65,
    source: 'Exclusive Shop • Galaxy Egg', hatchChance: '3%',
    description: 'Exclusive pet from the Galaxy Egg in the Exclusive Shop.',
    image: 'assets/pets/sun-deer-v30.png', value: 120,
  },
  {
    id: 'spaceship-alien', name: 'Spaceship Alien', rarity: 'Exclusive', bestPct: 65,
    source: 'Exclusive Pet', hatchChance: '1 in 33',
    description: 'Exclusive Spaceship Alien pet.',
    image: 'assets/pets/spaceship-alien-v30.png', value: 80,
  },
  {
    id: 'fallen-angel', name: 'Fallen Angel', rarity: 'Exclusive', bestPct: 60,
    source: 'Pack 1.0 Update', description: 'Limited Exclusive pet from Pack 1.0 Update.',
    note: 'Only 500 exist.', exists: 500,
    image: 'assets/pets/fallen-angel.png', value: 500,
  },
  {
    id: 'job-cat', name: 'Job Cat', rarity: 'Exclusive', bestPct: 60,
    source: 'Pack 2.0 Update', description: '60% Best Pet from Pack 2.0 Update.',
    note: 'Only 700 exist.', exists: 700,
    image: 'assets/pets/job-cat-v30.png', value: 200,
  },
  {
    id: 'galaxy-bunny', name: 'Galaxy Bunny', rarity: 'Exclusive', bestPct: 50,
    source: 'Exclusive Shop • Galaxy Egg', hatchChance: '30%',
    description: 'Exclusive pet from the Galaxy Egg in the Exclusive Shop.',
    image: 'assets/pets/galaxy-bunny.png', value: 20,
  },
  {
    id: 'galaxy-cat', name: 'Galaxy Cat', rarity: 'Exclusive', bestPct: 40,
    source: 'Exclusive Shop • Galaxy Egg', hatchChance: '65%',
    description: 'Exclusive pet from the Galaxy Egg in the Exclusive Shop.',
    image: 'assets/pets/galaxy-cat-v30.png', value: 10,
  },
  {
    id: 'pop-cat', name: 'Pop Cat', rarity: 'Exclusive',
    source: 'Party Egg', hatchChance: '1 in 200 (0.5%)',
    description: 'Animated Exclusive pet from the Party Egg.',
    image: 'assets/pets/pop-cat-normal-v30.png', value: 20,
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
    values: { normal: 400, golden: null, diamond: null },
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
    values: { normal: 600, golden: null, diamond: null },
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
    values: { normal: 315, golden: 1400, diamond: null },
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
    values: { normal: 175, golden: 485, diamond: null },
  },
  {
    id: 'ember-monster', name: 'Ember Monster', rarity: 'Mythical', source: 'Mythical Pet',
    description: 'Mythical pet Ember Monster.', map: 'Volcano Hollow [World 7]', hatchChance: '1 in 750k',
    supportsVariants: true,
    variantImages: {
      normal: 'assets/pets/ember-monster.png',
      golden: 'assets/pets/ember-monster-golden.png',
      diamond: 'assets/pets/ember-monster-diamond.png',
    },
    values: { normal: 25, golden: 350, diamond: 1300},
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
    values: { normal: 15, golden: null, diamond: null},
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
    values: { normal: null, golden: null, diamond: null },
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
    values: { normal: null, golden: null, diamond: null },
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
    values: { normal: null, golden: null, diamond: null },
  },
];

export const CHARMS = [
  { id:'secret-charm', name:'Secret Charm', rarity:'Exclusive', source:'Charm', description:'Secret Charm.', image:'assets/items/secret-charm-v30.png', value:300 },
  { id:'lightning-charm', name:'Lightning Charm', rarity:'Exclusive', source:'Charm', description:'Lightning Charm.', image:'assets/items/lightning-charm-v30.png', value:400 },
  { id:'moon-charm', name:'Moon Charm', rarity:'Mythical', source:'Charm', description:'Moon Charm.', image:'assets/items/moon-charm.png', value:55 },
  { id:'rubies-charm-iv', name:'Rubies Charm IV', rarity:'Legendary', source:'Charm', description:'Rubies Charm IV.', image:'assets/items/rubies-charm-iv.png', value:325 },
  { id:'hatch-charm-iv', name:'Hatch Charm IV', rarity:'Legendary', source:'Charm', description:'Hatch Charm IV.', image:'assets/items/hatch-charm-iv.png', value:250 },
  { id:'critical-charm-iv', name:'Critical Charm IV', rarity:'Legendary', source:'Charm', description:'Critical Charm IV.', image:'assets/items/critical-charm-iv.png', value:315 },
  { id:'luck-charm-iv', name:'Luck Charm IV', rarity:'Legendary', source:'Charm', description:'Luck Charm IV.', image:'assets/items/luck-charm-iv.png', value:350 },
  { id:'coins-charm-iv', name:'Coins Charm IV', rarity:'Legendary', source:'Charm', description:'Coins Charm IV.', image:'assets/items/coins-charm-iv.png', value:null },
  { id:'hatch-charm-iii', name:'Hatch Charm III', rarity:'Epic', source:'Charm', description:'Hatch Charm III.', image:'assets/items/hatch-charm-iii.png', value:45, dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },
  { id:'critical-charm-iii', name:'Critical Charm III', rarity:'Epic', source:'Charm', description:'Critical Charm III.', image:'assets/items/critical-charm-iii-v30.png', value:65, dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },
  { id:'lucky-charm-iii', name:'Lucky Charm III', rarity:'Epic', source:'Charm', description:'Lucky Charm III.', image:'assets/items/lucky-charm-iii-v30.png', value:95, dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },
  { id:'rubies-charm-iii', name:'Rubies Charm III', rarity:'Epic', source:'Charm', description:'Rubies Charm III.', image:'assets/items/rubies-charm-iii-v30.png', value:80, dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },
  { id:'coins-charm-iii', name:'Coins Charm III', rarity:'Epic', source:'Charm', description:'Coins Charm III.', image:'assets/items/coins-charm-iii-v30.png', value:30, dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },
];

export const EGGS = [
  { id:'alien-egg', name:'Alien Egg', rarity:'Exclusive', source:'Alien Invasion [Event]', description:'Alien Invasion event egg.', image:'assets/eggs/alien-egg.png', value:10 },
  { id:'party-egg', name:'Party Egg', rarity:'Exclusive', source:'PlayTime Egg', description:'PlayTime Egg reward.', image:'assets/eggs/party-egg.png', value:3 },
  { id:'galaxy-egg', name:'Galaxy Egg', rarity:'Exclusive', source:'Galaxy Collection', description:'Galaxy Egg.', image:'assets/eggs/galaxy-egg.png', value:125 },
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
  { id:'vip-voucher', name:'VIP Voucher', rarity:'Exclusive', source:'Utility Item', description:'VIP Voucher.', image:'assets/items/vip-voucher.png', value:20, dropSources:[SOURCE_PRESETS.moonChest, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.playtimeRewards] },
  { id:'universe-shard', name:'Universe Shard', rarity:'Mythical', source:'Utility Item', description:'Universe Shard.', image:'assets/items/universe-shard-v30.png', value:50, dropSources:[SOURCE_PRESETS.moonChest, SOURCE_PRESETS.vipChest] },
  { id:'vip-key', name:'VIP Key', rarity:'Legendary', source:'Utility Item', description:'VIP Key.', image:'assets/items/vip-key.png', value:0.5 },
  { id:'globe', name:'Globe', rarity:'Legendary', source:'Utility Item', description:'Globe item.', image:'assets/items/globe-v30.png', value:40, dropSources:[SOURCE_PRESETS.moonChest, SOURCE_PRESETS.playtimeRewards] },
  { id:'ball', name:'Ball', rarity:'Epic', source:'Toy Item', description:'+10% Egg Luck while equipped on Unique Pet!', image:'assets/items/ball-v30.png', value:5, dropSources:[SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest, SOURCE_PRESETS.playtimeRewards] },
  { id:'squeaky', name:'Squeaky', rarity:'Epic', source:'Toy Item', description:'Squeaky toy item.', image:'assets/items/squeaky-v30.png', value:5, dropSources:[SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest, SOURCE_PRESETS.playtimeRewards] },
];

export const RARITY_ORDER = ['Exclusive', 'Secret', 'Mythical', 'Legendary', 'Epic', 'Rare', 'Basic'];
