// Generated from data/catalog.js, data/image-assets.js and app.js.
const LAST_UPDATED = '2026-09-27T18:20:00Z';



const SOURCE_PRESETS = {

  vipChest: { id: 'vipChest', name: 'VIP Chest', image: 'assets/sources/vip-chest.png' },

  moonChest: { id: 'moonChest', name: 'Moon Chest', image: 'assets/sources/moon-chest.png' },

  playtimeRewards: { id: 'playtimeRewards', name: 'PlayTime Rewards', image: 'assets/sources/playtime-rewards.png' },

};



const PETS = [

  {

    id: 'rich-bee', name: 'RICH BEE', rarity: 'Exclusive',

    source: 'Release PACK',

    description: '250 Exist Only, Release PACK.',

    note: '250 Exist Only.', exists: 250,

    image: 'assets/pets/rich-bee.png', value: 2000, displayValue: '2K',

  },

  {

    id: 'ruby-nebula-star', name: 'Ruby Nebula Star', rarity: 'Exclusive', bestPct: 85,

    source: '1M Event',

    description: 'Exclusive pet from the 1M Event.',

    note: '1M EVENT.',

    image: 'assets/pets/ruby-nebula-star.png', value: null,

    eventBadge: '1M EVENT',

  },

  {

    id: 'universe-capybara', name: 'Universe Capybara', rarity: 'Exclusive', bestPct: 100,

    source: 'Exclusive Shop • Galaxy Egg', hatchChance: '0.3%',

    description: 'Exclusive pet from the Galaxy Egg in the Exclusive Shop.',

    image: 'assets/pets/universe-capybara.png', value: 'O/C',

  },

  {

    id: 'alien-emperor', name: 'Alien Emperor', rarity: 'Exclusive', bestPct: 95,

    source: 'Alien Egg', hatchChance: '1 / 1,000',

    description: 'Exclusive pet from the Alien Egg.',

    image: 'assets/pets/alien-emperor.png', value: '7.5K',

  },

  {

    id: 'caaaaat', name: 'Caaaaat', rarity: 'Exclusive', bestPct: 85,

    source: 'Basic Egg', map: 'The Overworld', hatchChance: '???',

    description: 'Exclusive pet from the Basic Egg.',

    image: 'assets/pets/caaaaat-v30.png', value: '3.5K',

  },

  {

    id: 'exquisite-cat', name: 'Exquisite Cat', rarity: 'Exclusive', bestPct: 85,

    source: 'VIP Chest', hatchChance: '1 in 10,000',

    description: 'Exclusive pet available from the VIP Chest.',

    image: 'assets/pets/exquisite-cat.png', value: '1.3K',

    dropSources: [SOURCE_PRESETS.vipChest],

  },

  {

    id: 'happy-cupcake', name: 'Happy Cupcake', rarity: 'Exclusive', bestPct: 85,

    source: 'PlayTime Rewards', hatchChance: '1 in 10K',

    description: 'Exclusive pet from PlayTime Rewards.',

    image: 'assets/pets/happy-cupcake.png', value: '1.4K',

    dropSources: [SOURCE_PRESETS.playtimeRewards],

  },

  {

    id: 'six-seven', name: 'Six Seven!', rarity: 'Exclusive', bestPct: 85,

    source: 'Party Egg', hatchChance: '1 / 15,000',

    description: 'Exclusive pet from the Party Egg.',

    image: 'assets/pets/six-seven.png', value: '1.5K',

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

    image: 'assets/pets/spaceship-alien-v30.png', value: 95,

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

    image: 'assets/pets/job-cat-v30.png', value: 180,

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

    image: 'assets/pets/pop-cat-normal-v30.png', value: 25,

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

    values: { normal: 350, golden: null, diamond: null },

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

    values: { normal: 450, golden: null, diamond: null },

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

    values: { normal: 295, golden: 950, diamond: null },

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

    values: { normal: 150, golden: null , diamond: null },

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

    values: { normal: null, golden: null, diamond: null },

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

    values: { normal: 50, golden: 250, diamond: 900},

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

    values: { normal: 15, golden: 75, diamond: 325},

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

    values: { normal: 5, golden: 25, diamond: 115 },

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

    values: { normal: 25, golden: 110, diamond: 400 },

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

    values: { normal: 5, golden: 25, diamond: 115 },

  },

];



const CHARMS = [

  { id:'secret-charm', name:'Secret Charm', rarity:'Exclusive', source:'Charm', description:'Secret Charm.', image:'assets/items/secret-charm-v30.png', value:350 },

  { id:'lightning-charm', name:'Lightning Charm', rarity:'Exclusive', source:'Charm', description:'Lightning Charm.', image:'assets/items/lightning-charm-v30.png', value:400 },

  { id:'moon-charm', name:'Moon Charm', rarity:'Mythical', source:'Charm', description:'Moon Charm.', image:'assets/items/moon-charm.png', value:45 },

  { id:'rubies-charm-iv', name:'Rubies Charm IV', rarity:'Legendary', source:'Charm', description:'Rubies Charm IV.', image:'assets/items/rubies-charm-iv.png', value:325 },

  { id:'hatch-charm-iv', name:'Hatch Charm IV', rarity:'Legendary', source:'Charm', description:'Hatch Charm IV.', image:'assets/items/hatch-charm-iv.png', value:200 },

  { id:'critical-charm-iv', name:'Critical Charm IV', rarity:'Legendary', source:'Charm', description:'Critical Charm IV.', image:'assets/items/critical-charm-iv.png', value:295 },

  { id:'luck-charm-iv', name:'Luck Charm IV', rarity:'Legendary', source:'Charm', description:'Luck Charm IV.', image:'assets/items/luck-charm-iv.png', value:300 },

  { id:'coins-charm-iv', name:'Coins Charm IV', rarity:'Legendary', source:'Charm', description:'Coins Charm IV.', image:'assets/items/coins-charm-iv.png', value:200 },

  { id:'hatch-charm-iii', name:'Hatch Charm III', rarity:'Epic', source:'Charm', description:'Hatch Charm III.', image:'assets/items/hatch-charm-iii.png', value:20, dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },

  { id:'critical-charm-iii', name:'Critical Charm III', rarity:'Epic', source:'Charm', description:'Critical Charm III.', image:'assets/items/critical-charm-iii-v30.png', value:45, dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },

  { id:'lucky-charm-iii', name:'Lucky Charm III', rarity:'Epic', source:'Charm', description:'Lucky Charm III.', image:'assets/items/lucky-charm-iii-v30.png', value:50, dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },

  { id:'rubies-charm-iii', name:'Rubies Charm III', rarity:'Epic', source:'Charm', description:'Rubies Charm III.', image:'assets/items/rubies-charm-iii-v30.png', value:45, dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },

  { id:'coins-charm-iii', name:'Coins Charm III', rarity:'Epic', source:'Charm', description:'Coins Charm III.', image:'assets/items/coins-charm-iii-v30.png', value:30, dropSources:[SOURCE_PRESETS.playtimeRewards, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest] },

];



const EGGS = [

  { id:'alien-egg', name:'Alien Egg', rarity:'Exclusive', source:'Alien Invasion [Event]', description:'Alien Invasion event egg.', image:'assets/eggs/alien-egg.png', value:5 },

  { id:'party-egg', name:'Party Egg', rarity:'Exclusive', source:'PlayTime Egg', description:'PlayTime Egg reward.', image:'assets/eggs/party-egg.png', value:2 },

  { id:'galaxy-egg', name:'Galaxy Egg', rarity:'Exclusive', source:'Galaxy Collection', description:'Galaxy Egg.', image:'assets/eggs/galaxy-egg.png', value:90 },

];



const CODES = [

  { id:'code-update2', name:'update2', code:'update2', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

  { id:'code-1mvisits', name:'1mvisits', code:'1mvisits', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

  { id:'code-roksek', name:'Roksek', code:'Roksek', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

  { id:'code-droverq', name:'DroverQ', code:'DroverQ', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

  { id:'code-release', name:'Release', code:'Release', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

  { id:'code-darkrose', name:'DarkRose', code:'DarkRose', status:'active', source:'Reward Code', description:'Redeem this game code in Pet Universe.' },

];



const ITEMS = [

  { id:'vip-voucher', name:'VIP Voucher', rarity:'Exclusive', source:'Utility Item', description:'VIP Voucher | Nobody wanna This.', image:'assets/items/vip-voucher.png', value:8, dropSources:[SOURCE_PRESETS.moonChest, SOURCE_PRESETS.vipChest, SOURCE_PRESETS.playtimeRewards] },

  { id:'universe-shard', name:'Universe Shard', rarity:'Mythical', source:'Utility Item', description:'Universe Shard.', image:'assets/items/universe-shard-v30.png', value:30, dropSources:[SOURCE_PRESETS.moonChest, SOURCE_PRESETS.vipChest] },

  { id:'vip-key', name:'VIP Key', rarity:'Legendary', source:'Utility Item', description:'VIP Key.', image:'assets/items/vip-key.png', value:0.35 },

  { id:'globe', name:'Globe', rarity:'Legendary', source:'Utility Item', description:'Globe item.', image:'assets/items/globe-v30.png', value:25, dropSources:[SOURCE_PRESETS.moonChest, SOURCE_PRESETS.playtimeRewards] },

  { id:'ball', name:'Ball', rarity:'Epic', source:'Toy Item', description:'+10% Egg Luck while equipped on Unique Pet!', image:'assets/items/ball-v30.png', value:5, dropSources:[SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest, SOURCE_PRESETS.playtimeRewards] },

  { id:'squeaky', name:'Squeaky', rarity:'Epic', source:'Toy Item', description:'Squeaky toy item.', image:'assets/items/squeaky-v30.png', value:5, dropSources:[SOURCE_PRESETS.vipChest, SOURCE_PRESETS.moonChest, SOURCE_PRESETS.playtimeRewards] },

];



const RARITY_ORDER = ['Exclusive', 'Secret', 'Mythical', 'Legendary', 'Epic', 'Rare', 'Basic'];

const IMAGE_ASSETS = {"assets/eggs/alien-egg.png":{"src":"assets/optimized/alien-egg-e25eaba12d65.webp","width":1080,"height":1080,"srcset":"assets/optimized/alien-egg-e25eaba12d65.webp 1080w"},"assets/eggs/galaxy-egg.png":{"src":"assets/optimized/galaxy-egg-24d49daa318c.webp","width":1080,"height":1080,"srcset":"assets/optimized/galaxy-egg-24d49daa318c.webp 1080w"},"assets/eggs/party-egg.png":{"src":"assets/optimized/party-egg-91515a6114cf.webp","width":1080,"height":1080,"srcset":"assets/optimized/party-egg-91515a6114cf.webp 1080w"},"assets/items/ball-v30.png":{"src":"assets/optimized/ball-v30-55bad19a743f.webp","width":512,"height":512,"srcset":"assets/optimized/ball-v30-55bad19a743f.webp 512w"},"assets/items/bone-v30.png":{"src":"assets/optimized/bone-v30-2deccfcfe2d4.webp","width":512,"height":512,"srcset":"assets/optimized/bone-v30-2deccfcfe2d4.webp 512w"},"assets/items/coins-charm-iii-v30.png":{"src":"assets/optimized/coins-charm-iii-v30-7d98126d5bda.webp","width":512,"height":512,"srcset":"assets/optimized/coins-charm-iii-v30-7d98126d5bda.webp 512w"},"assets/items/coins-charm-iv.png":{"src":"assets/optimized/coins-charm-iv-b24176491794.webp","width":512,"height":512,"srcset":"assets/optimized/coins-charm-iv-b24176491794.webp 512w"},"assets/items/cookie-v30.png":{"src":"assets/optimized/cookie-v30-e4da6b88a0a5.webp","width":512,"height":512,"srcset":"assets/optimized/cookie-v30-e4da6b88a0a5.webp 512w"},"assets/items/critical-charm-iii-v30.png":{"src":"assets/optimized/critical-charm-iii-v30-d3e0712e0b63.webp","width":512,"height":512,"srcset":"assets/optimized/critical-charm-iii-v30-d3e0712e0b63.webp 512w"},"assets/items/critical-charm-iv.png":{"src":"assets/optimized/critical-charm-iv-cfe21cda4b43.webp","width":512,"height":512,"srcset":"assets/optimized/critical-charm-iv-cfe21cda4b43.webp 512w"},"assets/items/globe-v30.png":{"src":"assets/optimized/globe-v30-bed905130cb2.webp","width":512,"height":512,"srcset":"assets/optimized/globe-v30-bed905130cb2.webp 512w"},"assets/items/hatch-charm-iii.png":{"src":"assets/optimized/hatch-charm-iii-9091e2fa0bf6.webp","width":512,"height":512,"srcset":"assets/optimized/hatch-charm-iii-9091e2fa0bf6.webp 512w"},"assets/items/hatch-charm-iv.png":{"src":"assets/optimized/hatch-charm-iv-66f40d29480f.webp","width":512,"height":512,"srcset":"assets/optimized/hatch-charm-iv-66f40d29480f.webp 512w"},"assets/items/lightning-charm-v30.png":{"src":"assets/optimized/lightning-charm-v30-327069005294.webp","width":512,"height":512,"srcset":"assets/optimized/lightning-charm-v30-327069005294.webp 512w"},"assets/items/luck-charm-iv.png":{"src":"assets/optimized/luck-charm-iv-3b165a5d5f27.webp","width":512,"height":512,"srcset":"assets/optimized/luck-charm-iv-3b165a5d5f27.webp 512w"},"assets/items/lucky-charm-iii-v30.png":{"src":"assets/optimized/lucky-charm-iii-v30-122d89cdc820.webp","width":512,"height":512,"srcset":"assets/optimized/lucky-charm-iii-v30-122d89cdc820.webp 512w"},"assets/items/moon-charm.png":{"src":"assets/optimized/moon-charm-412b4e351f2a.webp","width":512,"height":512,"srcset":"assets/optimized/moon-charm-412b4e351f2a.webp 512w"},"assets/items/rubies-charm-iii-v30.png":{"src":"assets/optimized/rubies-charm-iii-v30-3104982086db.webp","width":512,"height":512,"srcset":"assets/optimized/rubies-charm-iii-v30-3104982086db.webp 512w"},"assets/items/rubies-charm-iv.png":{"src":"assets/optimized/rubies-charm-iv-f472b1e37df5.webp","width":512,"height":512,"srcset":"assets/optimized/rubies-charm-iv-f472b1e37df5.webp 512w"},"assets/items/secret-charm-v30.png":{"src":"assets/optimized/secret-charm-v30-109751022a5a.webp","width":512,"height":512,"srcset":"assets/optimized/secret-charm-v30-109751022a5a.webp 512w"},"assets/items/squeaky-v30.png":{"src":"assets/optimized/squeaky-v30-6281fbd2c141.webp","width":512,"height":512,"srcset":"assets/optimized/squeaky-v30-6281fbd2c141.webp 512w"},"assets/items/toys-hammer-v30.png":{"src":"assets/optimized/toys-hammer-v30-21139af7a5e8.webp","width":1080,"height":1080,"srcset":"assets/optimized/toys-hammer-v30-21139af7a5e8.webp 1080w"},"assets/items/universe-shard-v30.png":{"src":"assets/optimized/universe-shard-v30-bceb7c813af3.webp","width":512,"height":512,"srcset":"assets/optimized/universe-shard-v30-bceb7c813af3.webp 512w"},"assets/items/value-ticket.png":{"src":"assets/optimized/value-ticket-ed249abc2d85.webp","width":384,"height":384,"srcset":"assets/optimized/value-ticket-ed249abc2d85-64.webp 64w, assets/optimized/value-ticket-ed249abc2d85-128.webp 128w, assets/optimized/value-ticket-ed249abc2d85-256.webp 256w, assets/optimized/value-ticket-ed249abc2d85.webp 384w"},"assets/items/vip-key.png":{"src":"assets/optimized/vip-key-54055c35487b.webp","width":512,"height":512,"srcset":"assets/optimized/vip-key-54055c35487b.webp 512w"},"assets/items/vip-voucher.png":{"src":"assets/optimized/vip-voucher-89248fc148c0.webp","width":512,"height":512,"srcset":"assets/optimized/vip-voucher-89248fc148c0.webp 512w"},"assets/pets/alien-emperor.png":{"src":"assets/optimized/alien-emperor-f55d19b2eb57.webp","width":436,"height":443,"srcset":"assets/optimized/alien-emperor-f55d19b2eb57.webp 436w"},"assets/pets/blaze-phoenix-diamond.png":{"src":"assets/optimized/blaze-phoenix-diamond-ac6f293fd8ee.webp","width":512,"height":512,"srcset":"assets/optimized/blaze-phoenix-diamond-ac6f293fd8ee.webp 512w"},"assets/pets/blaze-phoenix-golden.png":{"src":"assets/optimized/blaze-phoenix-golden-0e8d2aac9007.webp","width":512,"height":512,"srcset":"assets/optimized/blaze-phoenix-golden-0e8d2aac9007.webp 512w"},"assets/pets/blaze-phoenix.png":{"src":"assets/optimized/blaze-phoenix-97e3b607053e.webp","width":420,"height":420,"srcset":"assets/optimized/blaze-phoenix-97e3b607053e.webp 420w"},"assets/pets/caaaaat-v30.png":{"src":"assets/optimized/caaaaat-v30-53703ef235e1.webp","width":512,"height":512,"srcset":"assets/optimized/caaaaat-v30-53703ef235e1.webp 512w"},"assets/pets/ember-monster-diamond.png":{"src":"assets/optimized/ember-monster-diamond-d44dd5c5a2d2.webp","width":512,"height":512,"srcset":"assets/optimized/ember-monster-diamond-d44dd5c5a2d2.webp 512w"},"assets/pets/ember-monster-golden.png":{"src":"assets/optimized/ember-monster-golden-7b4865aaa294.webp","width":512,"height":512,"srcset":"assets/optimized/ember-monster-golden-7b4865aaa294.webp 512w"},"assets/pets/ember-monster.png":{"src":"assets/optimized/ember-monster-55f232233041.webp","width":512,"height":512,"srcset":"assets/optimized/ember-monster-55f232233041.webp 512w"},"assets/pets/exquisite-cat.png":{"src":"assets/optimized/exquisite-cat-1b4424d45854.webp","width":446,"height":446,"srcset":"assets/optimized/exquisite-cat-1b4424d45854.webp 446w"},"assets/pets/exquisite-peacock-diamond.png":{"src":"assets/optimized/exquisite-peacock-diamond-0fb8bb78d2f8.webp","width":512,"height":512,"srcset":"assets/optimized/exquisite-peacock-diamond-0fb8bb78d2f8.webp 512w"},"assets/pets/exquisite-peacock-golden.png":{"src":"assets/optimized/exquisite-peacock-golden-eb551ee2d43e.webp","width":512,"height":512,"srcset":"assets/optimized/exquisite-peacock-golden-eb551ee2d43e.webp 512w"},"assets/pets/exquisite-peacock.png":{"src":"assets/optimized/exquisite-peacock-b625684c4042.webp","width":512,"height":512,"srcset":"assets/optimized/exquisite-peacock-b625684c4042.webp 512w"},"assets/pets/fallen-angel.png":{"src":"assets/optimized/fallen-angel-b0c721b62ade.webp","width":512,"height":512,"srcset":"assets/optimized/fallen-angel-b0c721b62ade.webp 512w"},"assets/pets/galaxy-bunny.png":{"src":"assets/optimized/galaxy-bunny-66a7061f089b.webp","width":1254,"height":1254,"srcset":"assets/optimized/galaxy-bunny-66a7061f089b.webp 1254w"},"assets/pets/galaxy-cat-v30.png":{"src":"assets/optimized/galaxy-cat-v30-1d1ec1ab42a4.webp","width":512,"height":512,"srcset":"assets/optimized/galaxy-cat-v30-1d1ec1ab42a4.webp 512w"},"assets/pets/grove-seeker-diamond.png":{"src":"assets/optimized/grove-seeker-diamond-f9ce5bc7cdd4.webp","width":512,"height":512,"srcset":"assets/optimized/grove-seeker-diamond-f9ce5bc7cdd4.webp 512w"},"assets/pets/grove-seeker-golden.png":{"src":"assets/optimized/grove-seeker-golden-c774e25a225f.webp","width":512,"height":512,"srcset":"assets/optimized/grove-seeker-golden-c774e25a225f.webp 512w"},"assets/pets/grove-seeker.png":{"src":"assets/optimized/grove-seeker-28766f15f789.webp","width":512,"height":512,"srcset":"assets/optimized/grove-seeker-28766f15f789.webp 512w"},"assets/pets/happy-cupcake.png":{"src":"assets/optimized/happy-cupcake-2d0126e07b00.webp","width":446,"height":452,"srcset":"assets/optimized/happy-cupcake-2d0126e07b00.webp 446w"},"assets/pets/imp-diamond.png":{"src":"assets/optimized/imp-diamond-6252443ebb61.webp","width":512,"height":512,"srcset":"assets/optimized/imp-diamond-6252443ebb61.webp 512w"},"assets/pets/imp-golden.png":{"src":"assets/optimized/imp-golden-c05dca1e4605.webp","width":512,"height":512,"srcset":"assets/optimized/imp-golden-c05dca1e4605.webp 512w"},"assets/pets/imp.png":{"src":"assets/optimized/imp-017243db3be0.webp","width":512,"height":512,"srcset":"assets/optimized/imp-017243db3be0.webp 512w"},"assets/pets/job-cat-v30.png":{"src":"assets/optimized/job-cat-v30-5ff5d574db2c.webp","width":512,"height":512,"srcset":"assets/optimized/job-cat-v30-5ff5d574db2c.webp 512w"},"assets/pets/mossy-mushroom-diamond.png":{"src":"assets/optimized/mossy-mushroom-diamond-68d540dd364d.webp","width":520,"height":520,"srcset":"assets/optimized/mossy-mushroom-diamond-68d540dd364d.webp 520w"},"assets/pets/mossy-mushroom-gold.png":{"src":"assets/optimized/mossy-mushroom-gold-5d30cb0b60a2.webp","width":520,"height":520,"srcset":"assets/optimized/mossy-mushroom-gold-5d30cb0b60a2.webp 520w"},"assets/pets/mossy-mushroom-normal.png":{"src":"assets/optimized/mossy-mushroom-normal-7e3b86f0f9cd.webp","width":512,"height":512,"srcset":"assets/optimized/mossy-mushroom-normal-7e3b86f0f9cd.webp 512w"},"assets/pets/pop-cat-normal-v30.png":{"src":"assets/optimized/pop-cat-normal-v30-c67b404e8a3c.webp","width":512,"height":512,"srcset":"assets/optimized/pop-cat-normal-v30-c67b404e8a3c.webp 512w"},"assets/pets/pop-cat-scream-v30.png":{"src":"assets/optimized/pop-cat-scream-v30-9f7302ef979c.webp","width":512,"height":512,"srcset":"assets/optimized/pop-cat-scream-v30-9f7302ef979c.webp 512w"},"assets/pets/queen-bee-diamond.png":{"src":"assets/optimized/queen-bee-diamond-d3e4995d81dc.webp","width":420,"height":420,"srcset":"assets/optimized/queen-bee-diamond-d3e4995d81dc.webp 420w"},"assets/pets/queen-bee-golden.png":{"src":"assets/optimized/queen-bee-golden-6c82f614d32d.webp","width":434,"height":450,"srcset":"assets/optimized/queen-bee-golden-6c82f614d32d.webp 434w"},"assets/pets/queen-bee-normal.png":{"src":"assets/optimized/queen-bee-normal-d1eaeecae388.webp","width":434,"height":450,"srcset":"assets/optimized/queen-bee-normal-d1eaeecae388.webp 434w"},"assets/pets/rich-bee.png":{"src":"assets/optimized/rich-bee-9c3544a6a35c.webp","width":512,"height":512,"srcset":"assets/optimized/rich-bee-9c3544a6a35c.webp 512w"},"assets/pets/ruby-majesty-diamond.png":{"src":"assets/optimized/ruby-majesty-diamond-f9e135666201.webp","width":512,"height":512,"srcset":"assets/optimized/ruby-majesty-diamond-f9e135666201.webp 512w"},"assets/pets/ruby-majesty-golden.png":{"src":"assets/optimized/ruby-majesty-golden-f4bd240be79d.webp","width":512,"height":512,"srcset":"assets/optimized/ruby-majesty-golden-f4bd240be79d.webp 512w"},"assets/pets/ruby-majesty-normal.png":{"src":"assets/optimized/ruby-majesty-normal-b13a35f8a5fd.webp","width":512,"height":512,"srcset":"assets/optimized/ruby-majesty-normal-b13a35f8a5fd.webp 512w"},"assets/pets/ruby-nebula-star.png":{"src":"assets/optimized/ruby-nebula-star-1e8139df1126.webp","width":512,"height":512,"srcset":"assets/optimized/ruby-nebula-star-1e8139df1126.webp 512w"},"assets/pets/shadow-dominus-diamond-v30.png":{"src":"assets/optimized/shadow-dominus-diamond-v30-50d333030fec.webp","width":512,"height":512,"srcset":"assets/optimized/shadow-dominus-diamond-v30-50d333030fec.webp 512w"},"assets/pets/shadow-dominus-golden-v30.png":{"src":"assets/optimized/shadow-dominus-golden-v30-835f619bfce6.webp","width":512,"height":512,"srcset":"assets/optimized/shadow-dominus-golden-v30-835f619bfce6.webp 512w"},"assets/pets/shadow-dominus.png":{"src":"assets/optimized/shadow-dominus-6e01be62b0ee.webp","width":512,"height":512,"srcset":"assets/optimized/shadow-dominus-6e01be62b0ee.webp 512w"},"assets/pets/six-seven.png":{"src":"assets/optimized/six-seven-4af44f064466.webp","width":520,"height":520,"srcset":"assets/optimized/six-seven-4af44f064466.webp 520w"},"assets/pets/spaceship-alien-v30.png":{"src":"assets/optimized/spaceship-alien-v30-60204c2d9bf5.webp","width":512,"height":512,"srcset":"assets/optimized/spaceship-alien-v30-60204c2d9bf5.webp 512w"},"assets/pets/sun-deer-v30.png":{"src":"assets/optimized/sun-deer-v30-7f81f01d9da8.webp","width":512,"height":512,"srcset":"assets/optimized/sun-deer-v30-7f81f01d9da8.webp 512w"},"assets/pets/throne-dragon-diamond.png":{"src":"assets/optimized/throne-dragon-diamond-fb818b8c8d1d.webp","width":520,"height":520,"srcset":"assets/optimized/throne-dragon-diamond-fb818b8c8d1d.webp 520w"},"assets/pets/throne-dragon-gold.png":{"src":"assets/optimized/throne-dragon-gold-ce43bcff833f.webp","width":520,"height":520,"srcset":"assets/optimized/throne-dragon-gold-ce43bcff833f.webp 520w"},"assets/pets/throne-dragon-normal.png":{"src":"assets/optimized/throne-dragon-normal-34ad90878d2c.webp","width":512,"height":512,"srcset":"assets/optimized/throne-dragon-normal-34ad90878d2c.webp 512w"},"assets/pets/universe-capybara.png":{"src":"assets/optimized/universe-capybara-536078f998b9.webp","width":520,"height":520,"srcset":"assets/optimized/universe-capybara-536078f998b9.webp 520w"},"assets/pets/void-owl-v30.png":{"src":"assets/optimized/void-owl-v30-0929129e4ed8.webp","width":512,"height":512,"srcset":"assets/optimized/void-owl-v30-0929129e4ed8.webp 512w"},"assets/sources/moon-chest.png":{"src":"assets/optimized/moon-chest-f1c508f4c434.webp","width":1254,"height":1254,"srcset":"assets/optimized/moon-chest-f1c508f4c434.webp 1254w"},"assets/sources/playtime-rewards.png":{"src":"assets/optimized/playtime-rewards-b131b207e2af.webp","width":400,"height":400,"srcset":"assets/optimized/playtime-rewards-b131b207e2af.webp 400w"},"assets/sources/vip-chest.png":{"src":"assets/optimized/vip-chest-73a6f4d507c1.webp","width":512,"height":512,"srcset":"assets/optimized/vip-chest-73a6f4d507c1.webp 512w"},"assets/ui/category-charms.png":{"src":"assets/optimized/category-charms-f527f93e8d1a.webp","width":1254,"height":1254,"srcset":"assets/optimized/category-charms-f527f93e8d1a-64.webp 64w, assets/optimized/category-charms-f527f93e8d1a-128.webp 128w, assets/optimized/category-charms-f527f93e8d1a-256.webp 256w, assets/optimized/category-charms-f527f93e8d1a-512.webp 512w, assets/optimized/category-charms-f527f93e8d1a.webp 1254w"},"assets/ui/category-codes.png":{"src":"assets/optimized/category-codes-58ccc0457e14.webp","width":1308,"height":1203,"srcset":"assets/optimized/category-codes-58ccc0457e14-64.webp 64w, assets/optimized/category-codes-58ccc0457e14-128.webp 128w, assets/optimized/category-codes-58ccc0457e14-256.webp 256w, assets/optimized/category-codes-58ccc0457e14-512.webp 512w, assets/optimized/category-codes-58ccc0457e14.webp 1308w"},"assets/ui/category-eggs.png":{"src":"assets/optimized/category-eggs-c760bcb45695.webp","width":1254,"height":1254,"srcset":"assets/optimized/category-eggs-c760bcb45695-64.webp 64w, assets/optimized/category-eggs-c760bcb45695-128.webp 128w, assets/optimized/category-eggs-c760bcb45695-256.webp 256w, assets/optimized/category-eggs-c760bcb45695-512.webp 512w, assets/optimized/category-eggs-c760bcb45695.webp 1254w"},"assets/ui/category-items.png":{"src":"assets/optimized/category-items-1d10b97790e7.webp","width":1254,"height":1254,"srcset":"assets/optimized/category-items-1d10b97790e7-64.webp 64w, assets/optimized/category-items-1d10b97790e7-128.webp 128w, assets/optimized/category-items-1d10b97790e7-256.webp 256w, assets/optimized/category-items-1d10b97790e7-512.webp 512w, assets/optimized/category-items-1d10b97790e7.webp 1254w"},"assets/ui/category-pets.png":{"src":"assets/optimized/category-pets-122dca91115b.webp","width":1254,"height":1254,"srcset":"assets/optimized/category-pets-122dca91115b-64.webp 64w, assets/optimized/category-pets-122dca91115b-128.webp 128w, assets/optimized/category-pets-122dca91115b-256.webp 256w, assets/optimized/category-pets-122dca91115b-512.webp 512w, assets/optimized/category-pets-122dca91115b.webp 1254w"},"assets/ui/home-link-game.png":{"src":"assets/optimized/home-link-game-df6436e911ce.webp","width":150,"height":150,"srcset":"assets/optimized/home-link-game-df6436e911ce-64.webp 64w, assets/optimized/home-link-game-df6436e911ce-128.webp 128w, assets/optimized/home-link-game-df6436e911ce.webp 150w"},"assets/ui/home-link-lipbuilds.png":{"src":"assets/optimized/home-link-lipbuilds-9543aa46994d.webp","width":150,"height":150,"srcset":"assets/optimized/home-link-lipbuilds-9543aa46994d-64.webp 64w, assets/optimized/home-link-lipbuilds-9543aa46994d-128.webp 128w, assets/optimized/home-link-lipbuilds-9543aa46994d.webp 150w"},"assets/ui/sky-world.png":{"src":"assets/optimized/sky-world-00957c8f2b5b.webp","width":768,"height":432,"srcset":"assets/optimized/sky-world-00957c8f2b5b.webp 768w"}};


const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ticket = 'assets/items/value-ticket.png';
const integerFormat = new Intl.NumberFormat('en-US');
const decimalFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
function imageSource(source) { return IMAGE_ASSETS[source]?.src || source; }
function imageAttributes(source, { sizes = '', eager = false } = {}) {
  const asset = IMAGE_ASSETS[source];
  const responsive = asset && sizes ? ` srcset="${asset.srcset}" sizes="${sizes}"` : '';
  return `src="${imageSource(source)}"${responsive} decoding="async" loading="${eager ? 'eager' : 'lazy'}" draggable="false"`;
}
function setImageSource(element, source) {
  element.removeAttribute('srcset');
  element.removeAttribute('sizes');
  element.src = imageSource(source);
  element.decoding = 'async';
}

// One render per display frame, including rapid keyboard input.
let renderFrame = 0;
let pickerFrame = 0;
function scheduleRender() {
  if (!renderFrame) renderFrame = requestAnimationFrame(() => { renderFrame = 0; render(); });
}
function schedulePickerRender() {
  if (!pickerFrame) pickerFrame = requestAnimationFrame(() => { pickerFrame = 0; renderCalcPicker(); });
}

// Restart CSS effects through their animation clock, without reading layout.
function restartEffect(element, className) {
  if (!motionAllowed()) return;
  element.classList.add(className);
  for (const animation of element.getAnimations()) {
    if (animation.effect?.getTiming().iterations !== Infinity) {
      animation.currentTime = 0;
      animation.play();
    }
  }
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function readSetting(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writeSetting(key, value) { try { localStorage.setItem(key, value); } catch {} }
let animationsPaused = readSetting('pet-universe-motion') === 'off' || reducedMotion.matches;
function motionAllowed() { return !animationsPaused && !reducedMotion.matches; }
function syncMotion() {
  document.documentElement.dataset.motion = animationsPaused ? 'off' : 'on';
  const button = $('#motionToggle');
  button.textContent = animationsPaused ? '▶' : 'Ⅱ';
  button.setAttribute('aria-label', animationsPaused ? 'Enable animations' : 'Pause animations');
  button.setAttribute('aria-pressed', String(animationsPaused));
  button.title = animationsPaused ? 'Enable animations' : 'Pause animations';
}

const rarityColors = {
  Exclusive: '#930fff',
  Secret: '#c1c1c1',
  Mythical: '#ff00ae',
  Legendary: '#ffd33f',
  Epic: '#34d8ff',
  Rare: '#7ef23a',
  Basic: '#8f98a8',
  Code: '#65d8ff',
};

const rarityPalettes = {
  Exclusive: ['#930fff', '#feddff', '#930fff', '#de22ff', '#9823ff', '#edc2ff', '#930fff'],
  Mythical: ['#ff00ae', '#ff0097', '#ff7dd2', '#ff0f3b', '#ffcfb9', '#ff8e0c', '#ffce78', '#fafbdd', '#f6fcb7', '#fff582'],
  Secret: ['#ffffff', '#c1c1c1', '#747474', '#b1b1b1', '#ffffff', '#6f6f6f', '#f1f1f1', '#a7a7a7'],
};

function paletteFor(item) {
  const rarity = typeof item === 'string' ? item : rarityFor(item);
  return rarityPalettes[rarity] || [rarityColors[rarity] || '#98a0af'];
}

function gradientFor(item, angle = 120) {
  return `linear-gradient(${angle}deg,${paletteFor(item).join(',')})`;
}
function pickerConicFor(item) {
  const colors = {
    Exclusive: '#930fff,#feddff,#de22ff,#9823ff,#edc2ff,#930fff',
    Mythical: '#ff00ae,#ff7dd2,#ff0f3b,#ff8e0c,#fff582,#ff00ae',
    Secret: '#ffffff,#c1c1c1,#747474,#ffffff,#a7a7a7,#ffffff',
  };
  return `conic-gradient(${colors[rarityFor(item)] || paletteFor(item).join(',')})`;
}

const catalogs = { pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS, codes: CODES };
const categoryMeta = {
  pets: ['PET COLLECTION', 'Pet Values', 'Search pets...', 'PET DETAILS'],
  charms: ['CHARM COLLECTION', 'Charm Values', 'Search charms...', 'CHARM DETAILS'],
  eggs: ['EGG COLLECTION', 'Egg Values', 'Search eggs...', 'EGG DETAILS'],
  items: ['ITEM COLLECTION', 'Item Values', 'Search items...', 'ITEM DETAILS'],
  codes: ['BONUS CODES', 'Code Values', 'Search codes...', 'CODE DETAILS'],
};

const sortNames = {
  featured: 'Featured',
  name: 'Name A-Z',
  'best-desc': 'Best % high-low',
  'best-asc': 'Best % low-high',
  rarity: 'Rarity',
};

const state = {
  view: 'home',
  category: 'pets',
  variant: 'normal',
  query: '',
  sort: 'featured',
  modalItem: null,
  modalVariant: 'normal',
  modalRange: '24h',
  calcPickerSide: 'left',
  calcPickerCategory: 'pets',
  calcPickerQuery: '',
  calc: { left: [], right: [], leftTickets: 0, rightTickets: 0 },
};

let historyController = null;
let historyRequestId = 0;
let calcMotionCache = { leftTotal: null, rightTotal: null, diff: null, leftTickets: 0, rightTickets: 0, verdict: 'fair' };

const calcCategories = ['pets', 'charms', 'eggs', 'items'];

function calcFindItem(category, id) {
  return (catalogs[category] || []).find(item => item.id === id) || null;
}

function parseNumericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/,/g, '').toUpperCase();
  const match = normalized.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(K|M|B|T|QA|QI|SX|SP|OC)?$/);
  if (!match) return null;
  const multipliers = { K:1e3, M:1e6, B:1e9, T:1e12, QA:1e15, QI:1e18, SX:1e21, SP:1e24, OC:1e27 };
  const numeric = Number(match[1]) * (multipliers[match[2]] || 1);
  return Number.isFinite(numeric) ? numeric : null;
}

function calcNumericValue(item, variant = 'normal') {
  return parseNumericValue(valueFor(item, variant)) ?? 0;
}

function switchView(view) {
  if (!['home', 'values', 'calculator'].includes(view)) return;
  state.view = view;
  render();
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch (_) {
    return false;
  }
}

function currentCatalog() {
  return catalogs[state.category] || [];
}

function rarityFor(item) {
  return item.rarity || 'Basic';
}

function rarityIndex(item) {
  const index = RARITY_ORDER.indexOf(rarityFor(item));
  return index === -1 ? 999 : index;
}

function rarityColor(item) {
  return rarityColors[rarityFor(item)] || '#98a0af';
}

function raritySlug(item) {
  return rarityFor(item).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function formatValue(value) {
  if (value == null) return 'Set value';
  if (typeof value === 'string') return value;
  return integerFormat.format(value);
}

function formatItemValue(item, variant = state.variant) {
  if (!item.supportsVariants && item.displayValue) return item.displayValue;
  return formatValue(valueFor(item, variant));
}

function formatChartValue(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return decimalFormat.format(value);
}

function formatSignedValue(value) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '-'}${formatChartValue(Math.abs(value))}`;
}

function formatRelativeTime(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return 'Updated recently';
  const diffMs = Date.now() - date.getTime();
  const future = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  if (minutes < 1) return future ? 'Updated in a moment' : 'Updated just now';
  if (minutes < 60) return `Updated ${future ? 'in ' : ''}${minutes}m${future ? '' : ' ago'}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${future ? 'in ' : ''}${hours}h${future ? '' : ' ago'}`;
  const days = Math.round(hours / 24);
  return `Updated ${future ? 'in ' : ''}${days}d${future ? '' : ' ago'}`;
}

function refreshHomeUpdated() {
  const el = $('#homeUpdated');
  if (!el) return;
  el.textContent = formatRelativeTime(LAST_UPDATED);
}

function fallbackHistoryPoint(item, variant = state.modalVariant) {
  const value = parseNumericValue(valueFor(item, variant));
  return Number.isFinite(value) ? [{ timestamp: Date.now(), value }] : [];
}

function normalizeHistoryPoints(points = []) {
  return points
    .map(point => ({
      timestamp: Number(point.timestamp ?? point.captured_at),
      value: Number(point.value),
    }))
    .filter(point => Number.isFinite(point.timestamp) && Number.isFinite(point.value))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function setHistoryStatus(text, mode = 'neutral') {
  const status = $('#historyStatus');
  status.textContent = text;
  status.className = `history-status is-${mode}`;
}

function renderHistoryStats(points, currentValue) {
  const values = points.map(point => point.value).filter(Number.isFinite);
  const latest = Number.isFinite(currentValue) ? currentValue : (values.length ? values.at(-1) : null);
  const previousEl = $('#historyPrevious');
  const changeEl = $('#historyChange');
  const amountEl = $('#historyChangeAmount');

  $('#historyCurrent').textContent = Number.isFinite(latest) ? formatChartValue(latest) : '—';
  $('#historyCurrentMeta').textContent = Number.isFinite(latest) ? 'Current catalog value' : 'Numeric value not set';
  $('#historyHigh').textContent = values.length ? formatChartValue(Math.max(...values)) : '—';
  $('#historyLow').textContent = values.length ? formatChartValue(Math.min(...values)) : '—';

  changeEl.className = 'is-neutral';
  amountEl.className = 'is-neutral';

  if (values.length < 2) {
    if (previousEl) previousEl.textContent = '—';
    changeEl.textContent = '—';
    amountEl.textContent = '—';
    return;
  }

  const previous = values.at(-2);
  const last = values.at(-1);
  const amount = last - previous;
  const pct = previous !== 0 ? (amount / Math.abs(previous)) * 100 : null;
  const trendClass = amount > 0 ? 'is-up' : amount < 0 ? 'is-down' : 'is-neutral';
  const trendArrow = amount > 0 ? '▲' : amount < 0 ? '▼' : '•';

  if (previousEl) previousEl.textContent = formatChartValue(previous);
  changeEl.className = trendClass;
  changeEl.textContent = pct == null ? '—' : `${trendArrow} ${pct > 0 ? '+' : ''}${pct.toFixed(Math.abs(pct) >= 100 ? 0 : 1)}%`;
  amountEl.className = trendClass;
  amountEl.textContent = amount === 0 ? '0' : formatSignedValue(amount);
}

function updateHistoryTimestamp(points) {
  const label = $('#historyLastUpdated');
  const last = points.at(-1);
  if (!last) {
    label.textContent = 'No snapshots yet';
    return;
  }
  const date = new Date(last.timestamp);
  label.textContent = `Last snapshot ${new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)}`;
}

async function loadValueHistory() {
  const item = state.modalItem;
  if (!item || state.category === 'codes') return;

  const historyArea = $('#modalHistoryArea');
  historyArea.hidden = false;
  const currentValue = parseNumericValue(valueFor(item, state.modalVariant));
  const fallback = fallbackHistoryPoint(item, state.modalVariant);
  renderHistoryStats(fallback, currentValue);
  updateHistoryTimestamp(fallback);
  $('#historyHint').textContent = 'Connecting to value history…';
  setHistoryStatus('Loading', 'loading');

  historyController?.abort();
  historyController = new AbortController();
  const requestId = ++historyRequestId;

  try {
    const params = new URLSearchParams({
      category: state.category,
      id: item.id,
      variant: state.modalVariant,
      range: state.modalRange,
    });
    const response = await fetch(`/api/history?${params}`, { signal: historyController.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`History API ${response.status}`);
    const payload = await response.json();
    if (requestId !== historyRequestId || state.modalItem?.id !== item.id) return;

    const points = normalizeHistoryPoints(payload.points);
    const usablePoints = points.length ? points : fallback;
    const apiCurrent = Number.isFinite(payload.current) ? payload.current : currentValue;
    renderHistoryStats(usablePoints, apiCurrent);
    updateHistoryTimestamp(usablePoints);

    if (payload.available === false) {
      setHistoryStatus('D1 not connected', 'offline');
      $('#historyHint').textContent = 'Add a Cloudflare D1 binding named VALUES_DB. The frontend is already ready for shared history.';
    } else if (!Number.isFinite(apiCurrent)) {
      setHistoryStatus('Value not set', 'offline');
      $('#historyHint').textContent = 'This item has no numeric value yet. Set one in catalog.js and deploy again.';
    } else if (points.length <= 1) {
      setHistoryStatus('First snapshot', 'neutral');
      $('#historyHint').textContent = 'The first D1 snapshot is saved. Change the value and deploy again to create the first trend.';
    } else {
      const trendDelta = points.at(-1).value - points.at(-2).value;
      const trendMode = trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'live';
      const trendLabel = trendDelta > 0 ? '▲ Rising' : trendDelta < 0 ? '▼ Falling' : `${points.length} snapshots`;
      setHistoryStatus(trendLabel, trendMode);
      $('#historyHint').textContent = `Showing ${state.modalRange.toUpperCase()} movement from Cloudflare D1. Change is calculated from the two latest snapshots.`;
    }
  } catch (error) {
    if (error?.name === 'AbortError') return;
    if (requestId !== historyRequestId) return;
    setHistoryStatus('Local preview', 'offline');
    $('#historyHint').textContent = 'Cloudflare API is not active in this preview. The current value is shown; deploy and connect D1 to collect history.';
  }
}

function formatExists(exists) {
  return exists == null ? '' : `${integerFormat.format(exists)} exist`;
}

function supportsVariant(item, variant) {
  if (variant === 'normal') return true;
  return Boolean(item.supportsVariants && item.variantImages?.[variant]);
}

function imageFor(item, variant = state.variant) {
  if (item.id === 'pop-cat') return 'assets/pets/pop-cat-normal-v30.png';
  if (item.supportsVariants) return item.variantImages?.[variant] || item.variantImages?.normal || null;
  return item.image || null;
}

function valueFor(item, variant = state.variant) {
  if (item.supportsVariants) {
    if (item.values && Object.prototype.hasOwnProperty.call(item.values, variant)) return item.values[variant];
    return item.values?.normal ?? null;
  }
  return item.value ?? null;
}

function isAnimated(item) {
  return item.id === 'pop-cat';
}

function filtered() {
  let list = [...currentCatalog()];
  const query = state.query.trim().toLowerCase();

  if (state.category === 'pets' && state.variant !== 'normal') {
    list = list.filter(item => supportsVariant(item, state.variant));
  }

  if (query) {
    list = list.filter(item => [
      item.name,
      item.rarity,
      item.source,
      item.description,
      item.note,
      item.map,
      item.hatchChance,
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }

  if (state.sort === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (state.sort === 'best-desc') {
    list.sort((a, b) => (b.bestPct ?? -1) - (a.bestPct ?? -1) || rarityIndex(a) - rarityIndex(b));
  } else if (state.sort === 'best-asc') {
    list.sort((a, b) => (a.bestPct ?? 999) - (b.bestPct ?? 999) || rarityIndex(a) - rarityIndex(b));
  } else if (state.sort === 'rarity') {
    list.sort((a, b) => rarityIndex(a) - rarityIndex(b) || a.name.localeCompare(b.name));
  } else if (state.category !== 'codes') {
    list.sort((a, b) =>
      rarityIndex(a) - rarityIndex(b)
      || (b.bestPct ?? -1) - (a.bestPct ?? -1)
      || a.name.localeCompare(b.name));
  }

  return list;
}

function animatedPopMarkup(location = 'card') {
  const className = location === 'card' ? 'animated-pop-card' : 'animated-pop-modal';
  return `<div class="${className}">
    <img class="pop-frame normal" ${imageAttributes('assets/pets/pop-cat-normal-v30.png')} alt="Pop Cat">
    <img class="pop-frame scream" ${imageAttributes('assets/pets/pop-cat-scream-v30.png')} alt="Pop Cat animated frame">
  </div>`;
}

function card(item, index = 0) {
  const color = rarityColor(item);
  const art = isAnimated(item)
    ? animatedPopMarkup('card')
    : `<img class="card-image" ${imageAttributes(imageFor(item), { eager: index < 8 })} alt="${item.name}">`;

  return `<article class="value-card rarity-${raritySlug(item)}" data-id="${item.id}" data-rarity="${raritySlug(item)}" style="--rarity:${color};--rarity-gradient:${gradientFor(item)};--delay:${Math.min(index, 12) * 24}ms;">
    <button class="card-button" type="button" aria-label="Open ${item.name}">
      <span class="rarity-sheen" aria-hidden="true"></span>
      <div class="card-art">
        <div class="card-ambient"></div>
        <span class="render-reflection" aria-hidden="true"></span>
        <span class="render-floor" aria-hidden="true"></span>
        <div class="card-badges">
          <span class="rarity-badge"><i></i><span class="rarity-text">${rarityFor(item)}</span></span>
          ${item.bestPct != null ? `<span class="best-badge">${item.bestPct}% Best Pet</span>` : ''}
        </div>
        ${item.eventBadge ? `<span class="event-badge">${item.eventBadge}</span>` : ''}
        ${isAnimated(item) ? '<span class="animated-badge card-animated-badge">▶ Animated</span>' : ''}
        ${item.exists != null ? `<span class="exists-badge">${formatExists(item.exists)}</span>` : ''}
        ${art}
      </div>
      <div class="card-bottom">
        <div class="card-title">${item.name}</div>
        <div class="card-value-row">
          <span>VALUE</span>
          <span class="set-value"><img ${imageAttributes(ticket, { sizes: '22px' })} alt=""><strong>${formatItemValue(item)}</strong></span>
        </div>
      </div>
    </button>
  </article>`;
}

function renderPets(list) {
  const exclusive = list.filter(item => rarityFor(item) === 'Exclusive');
  const statPets = list.filter(item => rarityFor(item) !== 'Exclusive');
  const sections = [];

  if (exclusive.length) {
    sections.push(`<section class="rarity-section rarity-section-exclusive" data-rarity="exclusive" style="--section-color:${rarityColors.Exclusive};--section-gradient:${gradientFor('Exclusive')}">
      <div class="rarity-section-head">
        <h2>Exclusive</h2>
        <span>${exclusive.length}</span>
      </div>
      <div class="card-grid">${exclusive.map(card).join('')}</div>
    </section>`);
  }

  if (statPets.length) {
    sections.push(`<section class="rarity-section rarity-section-stat" data-rarity="mythical" style="--section-color:${rarityColors.Mythical};--section-gradient:${gradientFor('Mythical')}">
      <div class="rarity-section-head">
        <h2>Stat Pets</h2>
        <span>${statPets.length}</span>
      </div>
      <div class="card-grid">${statPets.map(card).join('')}</div>
    </section>`);
  }

  return sections.join('');
}

function renderCompact(list) {
  return `<div class="card-grid compact-grid compact-grid-${state.category}">${list.map(card).join('')}</div>`;
}

function renderCodes(list) {
  return `<div class="codes-list">${list.map((item, index) => {
    const status = String(item.status || 'active').toLowerCase();
    const expired = status === 'expired';
    return `
    <article class="code-row ${expired ? 'is-expired' : 'is-active'}" data-id="${item.id}" style="--delay:${Math.min(index, 12) * 34}ms;">
      <div class="code-row-main">
        <strong class="code-row-code">${item.code}</strong>
      </div>
      <span class="code-row-status"><i></i>${expired ? 'Expired' : 'Active'}</span>
      <button class="code-copy-button copy-code-btn" type="button" data-code="${item.code}" aria-label="${expired ? 'Expired code' : `Copy ${item.code}`}" ${expired ? 'disabled' : ''}>
        <span class="copy-icon">${expired ? '×' : '⧉'}</span>
        <strong>${expired ? 'Expired' : 'Copy code'}</strong>
      </button>
    </article>`;
  }).join('')}</div>`;
}

// Keep real card nodes and decoded images when filtering, sorting or returning
// to a category. No virtualization: the complete list stays in the document.
const catalogViews = new Map();
let catalogRenderSignature = '';
function elementFromMarkup(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup;
  return template.content.firstElementChild;
}
function reconcileChildren(parent, nodes) {
  nodes.forEach((node, index) => {
    const current = parent.children[index];
    if (current !== node) parent.insertBefore(node, current || null);
  });
  while (parent.children.length > nodes.length) parent.lastElementChild.remove();
}
function createPetSection(exclusive) {
  const rarity = exclusive ? 'Exclusive' : 'Mythical';
  const section = elementFromMarkup(`<section class="rarity-section rarity-section-${exclusive ? 'exclusive' : 'stat'}" data-rarity="${rarity.toLowerCase()}" style="--section-color:${rarityColors[rarity]};--section-gradient:${gradientFor(rarity)}"><div class="rarity-section-head"><h2>${exclusive ? 'Exclusive' : 'Stat Pets'}</h2><span></span></div><div class="card-grid"></div></section>`);
  return { section, grid: $('.card-grid', section), count: $('.rarity-section-head > span', section) };
}
const observedTiles = new Set();
const tileObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.toggleAttribute('data-offscreen', !entry.isIntersecting);
}, { rootMargin: '450px 0px' }) : null;
function syncVisibleAnimations() {
  if (!tileObserver) return;
  const tiles = new Set($$('#cardsGrid .value-card, #calcPickerGrid .calc-picker-card'));
  for (const tile of observedTiles) {
    if (!tiles.has(tile)) { tileObserver.unobserve(tile); observedTiles.delete(tile); }
  }
  for (const tile of tiles) {
    if (!observedTiles.has(tile)) { tileObserver.observe(tile); observedTiles.add(tile); }
  }
}
function renderCatalog(list) {
  const key = `${state.category}:${state.variant}`;
  const signature = `${key}:${list.map(item => item.id).join(',')}`;
  if (signature === catalogRenderSignature) return;
  catalogRenderSignature = signature;
  let view = catalogViews.get(key);
  if (!view) {
    view = { cards: new Map() };
    if (state.category === 'pets') {
      view.exclusive = createPetSection(true);
      view.stat = createPetSection(false);
    } else {
      view.root = elementFromMarkup(state.category === 'codes' ? '<div class="codes-list"></div>' : `<div class="card-grid compact-grid compact-grid-${state.category}"></div>`);
    }
    catalogViews.set(key, view);
  }
  const cardNode = (item, index) => {
    if (!view.cards.has(item.id)) {
      const node = state.category === 'codes'
        ? elementFromMarkup(renderCodes([item])).firstElementChild
        : elementFromMarkup(card(item, index));
      view.cards.set(item.id, node);
    }
    return view.cards.get(item.id);
  };
  const roots = [];
  if (state.category === 'pets') {
    for (const [group, exclusive] of [[view.exclusive, true], [view.stat, false]]) {
      const items = list.filter(item => (rarityFor(item) === 'Exclusive') === exclusive);
      reconcileChildren(group.grid, items.map(cardNode));
      group.count.textContent = items.length;
      if (items.length) roots.push(group.section);
    }
  } else {
    reconcileChildren(view.root, list.map(cardNode));
    roots.push(view.root);
  }
  const host = $('#cardsGrid');
  if (list.length) reconcileChildren(host, roots);
  else host.replaceChildren(elementFromMarkup('<div class="empty-results"><strong>No matches found</strong><p>Try another name or pet variant.</p><button type="button" id="clearFilters">Clear filters</button></div>'));
  syncVisibleAnimations();
}

function render() {
  document.body.dataset.view = state.view;
  const homeView = $('#homeView');
  const valuesView = $('#valuesView');
  const calculatorView = $('#calculatorView');
  const categoryNav = $('#categoryNav');

  homeView.hidden = state.view !== 'home';
  valuesView.hidden = state.view !== 'values';
  calculatorView.hidden = state.view !== 'calculator';
  categoryNav.hidden = state.view !== 'values';

  refreshHomeUpdated();

  if (state.view === 'calculator') {
    renderCalculator();
    return;
  }
  if (state.view !== 'values') return;

  const list = filtered();
  const [kicker, title, placeholder] = categoryMeta[state.category];
  const petsMode = state.category === 'pets';

  $('#sectionKicker').textContent = kicker;
  $('#sectionTitle').textContent = title;
  $('#searchInput').placeholder = placeholder;
  $('#resultCount').textContent = `${list.length} ${list.length === 1 ? 'result' : 'results'}`;

  const variantTools = $('#variantTools');
  variantTools.hidden = !petsMode;
  $('.page-tools').classList.toggle('no-variants', !petsMode);

  const catalogLabel = $('#catalogLabel');
  catalogLabel.textContent = state.category === 'codes' ? '' : (petsMode ? 'Pet Collection' : title);
  catalogLabel.hidden = state.category === 'codes';
  $('.catalog-meta').classList.toggle('codes-meta', state.category === 'codes');

  const petOnlySorts = new Set(['best-desc', 'best-asc']);
  $$('.sort-option').forEach(option => {
    option.hidden = petOnlySorts.has(option.dataset.sort) && !petsMode;
  });

  $$('.nav-btn').forEach(button => {
    const active = button.dataset.category === state.category;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  $$('.variant-btn').forEach(button => {
    const active = button.dataset.variant === state.variant;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  renderCatalog(list);
}

function calcSideInfo(side) {
  const entries = state.calc[side] || [];
  const hasOC = entries.some(entry => {
    const item = calcFindItem(entry.category, entry.id);
    return typeof valueFor(item, entry.variant) === 'string';
  });
  const items = entries.reduce((sum, entry) => {
    const item = calcFindItem(entry.category, entry.id);
    return sum + calcNumericValue(item, entry.variant) * entry.qty;
  }, 0);
  const tickets = Math.max(0, Number(state.calc[`${side}Tickets`]) || 0);
  return { total: items + tickets, hasOC };
}

function calcEntryMarkup(side, entry) {
  const item = calcFindItem(entry.category, entry.id);
  if (!item) return '';
  const rawValue = valueFor(item, entry.variant);
  const numericValue = calcNumericValue(item, entry.variant) * entry.qty;
  const displayValue = typeof rawValue === 'string' ? rawValue : (item.displayValue ? formatChartValue(numericValue) : formatValue(numericValue));
  const image = imageFor(item, entry.variant);
  const variantName = entry.variant !== 'normal' ? entry.variant[0].toUpperCase() + entry.variant.slice(1) : '';
  return `<article class="trade-item-v40">
    <div class="trade-item-art-v40">
      <img ${imageAttributes(image)} alt="${item.name}">
      <span class="trade-item-qty-v40">x${entry.qty}</span>
    </div>
    <div class="trade-item-copy-v40">
      <strong>${item.name}</strong>
      <small>${variantName || rarityFor(item)}</small>
      <span><img ${imageAttributes(ticket, { sizes: '22px' })} alt="">${displayValue}</span>
    </div>
    <button class="trade-item-remove-v40" type="button" data-calc-remove="${side}" data-id="${entry.id}" data-variant="${entry.variant}" aria-label="Remove ${item.name}">×</button>
  </article>`;
}

function calcAddTile(side) {
  return `<button type="button" class="trade-add-v40" data-calc-open="${side}" aria-label="Add item to ${side} side">
    <span>+</span><strong>Add item</strong>
  </button>`;
}

function animateMetric(target, nextText, direction = 'neutral') {
  const element = typeof target === 'string' ? $(target) : target;
  if (!element) return;
  const prevText = element.textContent?.trim() || '';
  if (prevText === String(nextText).trim()) return;
  element.textContent = nextText;
  if (!motionAllowed()) return;
  element.classList.remove('metric-rise', 'metric-fall', 'metric-neutral');
  restartEffect(element, direction === 'up' ? 'metric-rise' : direction === 'down' ? 'metric-fall' : 'metric-neutral');
  clearTimeout(element._metricTimer);
  element._metricTimer = setTimeout(() => element.classList.remove('metric-rise', 'metric-fall', 'metric-neutral'), 480);
}

function flashTicketInput(element, direction = 'neutral') {
  if (!element || !motionAllowed()) return;
  const host = element.closest('.trade-v55-ticket');
  if (!host) return;
  host.classList.remove('ticket-rise', 'ticket-fall');
  if (direction === 'up') host.classList.add('ticket-rise');
  if (direction === 'down') host.classList.add('ticket-fall');
  clearTimeout(host._ticketTimer);
  host._ticketTimer = setTimeout(() => host.classList.remove('ticket-rise', 'ticket-fall'), 420);
}

const calcListSignatures = { left: null, right: null };
function renderCalculator() {
  for (const side of ['left', 'right']) {
    const signature = JSON.stringify(state.calc[side]);
    if (signature !== calcListSignatures[side]) {
      $(`#calc${side === 'left' ? 'Left' : 'Right'}List`).innerHTML = state.calc[side].map(entry => calcEntryMarkup(side, entry)).join('') + calcAddTile(side);
      calcListSignatures[side] = signature;
    }
  }

  const leftInfo = calcSideInfo('left');
  const rightInfo = calcSideInfo('right');
  const left = leftInfo.total;
  const right = rightInfo.total;
  const diff = left - right;
  const gap = Math.abs(diff);
  const hasAnyOC = leftInfo.hasOC || rightInfo.hasOC;

  for (const side of ['left', 'right']) {
    const input = $(`#calc${side === 'left' ? 'Left' : 'Right'}Tickets`);
    if (input !== document.activeElement && input.value !== String(state.calc[`${side}Tickets`])) {
      input.value = state.calc[`${side}Tickets`];
    }
  }
  animateMetric('#calcLeftTotal', leftInfo.hasOC ? `${formatValue(left)} + O/C` : formatValue(left), calcMotionCache.leftTotal == null ? 'neutral' : left > calcMotionCache.leftTotal ? 'up' : left < calcMotionCache.leftTotal ? 'down' : 'neutral');
  animateMetric('#calcRightTotal', rightInfo.hasOC ? `${formatValue(right)} + O/C` : formatValue(right), calcMotionCache.rightTotal == null ? 'neutral' : right > calcMotionCache.rightTotal ? 'up' : right < calcMotionCache.rightTotal ? 'down' : 'neutral');
  animateMetric('#calcDifference', formatValue(gap), calcMotionCache.diff == null ? 'neutral' : gap > calcMotionCache.diff ? 'up' : gap < calcMotionCache.diff ? 'down' : 'neutral');
  $('#calcLeftOcNote').hidden = !leftInfo.hasOC;
  $('#calcRightOcNote').hidden = !rightInfo.hasOC;

  const label = $('#calcDifferenceLabel');
  const centerVerdict = $('#calcDifferenceVerdict');
  centerVerdict.className = '';

  const setTradeStatus = status => {
    $$('.trade-status-segment').forEach(segment => {
      const active = segment.dataset.tradeStatus === status;
      segment.classList.toggle('active', active);
      segment.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };

  // Result is from My Offer perspective: giving more = L, receiving more = W.
  let verdictState = 'fair';
  if (diff > 0) {
    verdictState = 'lose';
    setTradeStatus('lose');
    centerVerdict.classList.add('is-lose');
    animateMetric(centerVerdict, `L -${formatValue(gap)}`, 'down');
    label.className = 'is-lose';
    animateMetric(label, `You give ${formatValue(gap)} more value${hasAnyOC ? ' · O/C excluded' : ''}`, 'down');
  } else if (diff < 0) {
    verdictState = 'win';
    setTradeStatus('win');
    centerVerdict.classList.add('is-win');
    animateMetric(centerVerdict, `W +${formatValue(gap)}`, 'up');
    label.className = 'is-win';
    animateMetric(label, `You receive ${formatValue(gap)} more value${hasAnyOC ? ' · O/C excluded' : ''}`, 'up');
  } else {
    verdictState = 'fair';
    setTradeStatus('fair');
    centerVerdict.classList.add('is-fair');
    animateMetric(centerVerdict, 'FAIR', 'neutral');
    label.className = 'is-fair';
    animateMetric(label, hasAnyOC ? 'Fair trade · O/C excluded' : 'Fair trade', 'neutral');
  }

  calcMotionCache.leftTotal = left;
  calcMotionCache.rightTotal = right;
  calcMotionCache.diff = gap;
  calcMotionCache.verdict = verdictState;
}

function swapCalcOffers() {
  const leftEntries = state.calc.left;
  state.calc.left = state.calc.right;
  state.calc.right = leftEntries;
  const leftTickets = state.calc.leftTickets;
  state.calc.leftTickets = state.calc.rightTickets;
  state.calc.rightTickets = leftTickets;
  renderCalculator();
}

function clearCalcTrade() {
  state.calc.left = [];
  state.calc.right = [];
  state.calc.leftTickets = 0;
  state.calc.rightTickets = 0;
  renderCalculator();
}

function openCalcPicker(side) {
  state.calcPickerSide = side;
  state.calcPickerCategory = 'pets';
  state.calcPickerQuery = '';
  $('#calcPickerSearch').value = '';
  renderCalcPicker();
  $('#calcPickerModal').showModal();
}

const pickerCards = new Map();
function renderCalcPicker() {
  $$('#calcPickerTabs [data-calc-category]').forEach(button => {
    button.classList.toggle('active', button.dataset.calcCategory === state.calcPickerCategory);
  });
  const query = state.calcPickerQuery.trim().toLowerCase();
  const list = (catalogs[state.calcPickerCategory] || [])
    .filter(item => !query || `${item.name} ${item.rarity || ''}`.toLowerCase().includes(query));
  const nodes = list.map(item => {
    const key = `${state.calcPickerCategory}:${item.id}`;
    if (pickerCards.has(key)) return pickerCards.get(key);
    const variants = state.calcPickerCategory === 'pets' && item.supportsVariants
      ? ['normal','golden','diamond'].filter(variant => item.variantImages?.[variant])
      : ['normal'];
    const chips = variants.map(variant => `<button type="button" class="calc-picker-variant" data-calc-pick="${item.id}" data-calc-variant="${variant}" data-calc-category-pick="${state.calcPickerCategory}">${variant === 'normal' ? 'Normal' : variant === 'golden' ? 'Golden' : 'Diamond'}</button>`).join('');
    const node = elementFromMarkup(`<article class="calc-picker-card" data-id="${item.id}" data-rarity="${raritySlug(item)}" style="--picker-rarity:${rarityColor(item)};--rarity-gradient:${gradientFor(item)};--picker-conic:${pickerConicFor(item)}">
      <span class="rarity-sheen" aria-hidden="true"></span>
      <div class="calc-picker-art"><img ${imageAttributes(imageFor(item, 'normal'))} alt="${item.name}"></div>
      <div class="calc-picker-body">
        <strong class="calc-picker-name">${item.name}</strong>
        <div class="calc-picker-meta">
          <span class="calc-picker-rarity"><span class="rarity-text">${rarityFor(item)}</span></span>
          <small class="calc-picker-value"><img ${imageAttributes(ticket, { sizes: '22px' })} alt=""> ${formatItemValue(item, 'normal')}</small>
        </div>
      </div>
      <div class="calc-picker-variants">${chips}</div>
    </article>`);
    pickerCards.set(key, node);
    return node;
  });
  reconcileChildren($('#calcPickerGrid'), nodes.length ? nodes : [elementFromMarkup('<div class="calc-picker-empty">No matches found.</div>')]);
  syncVisibleAnimations();
}

function addCalcItem(side, category, id, variant = 'normal') {
  const item = calcFindItem(category, id);
  if (!item) return;
  const entries = state.calc[side];
  const existing = entries.find(entry => entry.category === category && entry.id === id && entry.variant === variant);
  if (existing) existing.qty += 1;
  else entries.push({ category, id, variant, qty: 1 });
  renderCalculator();
}

function removeCalcItem(side, id, variant) {
  const entries = state.calc[side];
  const existing = entries.find(entry => entry.id === id && entry.variant === variant);
  if (!existing) return;
  if (existing.qty > 1) existing.qty -= 1;
  else state.calc[side] = entries.filter(entry => !(entry.id === id && entry.variant === variant));
  renderCalculator();
}

// Delegated hover: a single listener/RAF and a rect cached between scrolls.
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
let tiltButton = null;
let tiltRect = null;
let tiltFrame = 0;
let pointerX = 0;
let pointerY = 0;
function resetTilt() {
  cancelAnimationFrame(tiltFrame);
  tiltFrame = 0;
  if (tiltButton) {
    tiltButton.style.setProperty('--rx', '0deg');
    tiltButton.style.setProperty('--ry', '0deg');
  }
  tiltButton = null;
  tiltRect = null;
}
$('#cardsGrid').addEventListener('pointermove', event => {
  if (!motionAllowed() || !finePointer.matches || event.pointerType === 'touch') return;
  const button = event.target.closest('.card-button');
  if (!button) { resetTilt(); return; }
  if (button !== tiltButton) { resetTilt(); tiltButton = button; }
  pointerX = event.clientX; pointerY = event.clientY;
  if (tiltFrame) return;
  tiltFrame = requestAnimationFrame(() => {
    tiltFrame = 0;
    if (!tiltButton?.isConnected || !motionAllowed()) { resetTilt(); return; }
    tiltRect ||= tiltButton.getBoundingClientRect();
    if (!tiltRect.width || !tiltRect.height) return;
    const x = Math.max(0, Math.min(1, (pointerX - tiltRect.left) / tiltRect.width));
    const y = Math.max(0, Math.min(1, (pointerY - tiltRect.top) / tiltRect.height));
    tiltButton.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`);
    tiltButton.style.setProperty('--my', `${(y * 100).toFixed(2)}%`);
    tiltButton.style.setProperty('--rx', `${((0.5 - y) * 6).toFixed(3)}deg`);
    tiltButton.style.setProperty('--ry', `${((x - 0.5) * 7).toFixed(3)}deg`);
  });
}, { passive: true });
$('#cardsGrid').addEventListener('pointerout', event => {
  if (tiltButton && !tiltButton.contains(event.relatedTarget)) resetTilt();
}, { passive: true });
document.addEventListener('scroll', () => { tiltRect = null; }, { passive: true, capture: true });
window.addEventListener('resize', () => { tiltRect = null; }, { passive: true });

function switchCategory(category) {
  if (!catalogs[category]) return;
  const main = $('.main');
  resetTilt();
  state.view = 'values';
  state.category = category;
  state.query = '';
  if (category !== 'pets') state.variant = 'normal';
  if (category !== 'pets' && state.sort.startsWith('best-')) {
    state.sort = 'featured';
    $('#sortLabel').textContent = sortNames.featured;
    $$('.sort-option').forEach(button => {
      const active = button.dataset.sort === 'featured';
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }
  $('#searchInput').value = '';
  render();
  restartEffect(main, 'category-switching');
  setTimeout(() => main.classList.remove('category-switching'), 380);
}

function dropSourcesMarkup(sources = []) {
  return sources.map(source => `<div class="drop-source-card">
    <img ${imageAttributes(source.image, { eager: true })} alt="${source.name}">
    <span>${source.name}</span>
  </div>`).join('');
}

function openModal(item) {
  clearTimeout(petTapTimer);
  $('#modalArtShell').classList.remove('pet-tap');
  state.modalItem = item;
  state.modalVariant = item.supportsVariants && item.variantImages?.[state.variant] ? state.variant : 'normal';

  const modal = $('#detailModal');
  modal.style.setProperty('--modal-rarity', rarityColor(item));
  modal.style.setProperty('--rarity-gradient', gradientFor(item));
  modal.dataset.rarity = raritySlug(item);
  modal.dataset.itemId = item.id;
  $('#modalKicker').textContent = categoryMeta[state.category][3];
  $('#modalRarity').innerHTML = `<i></i><span class="rarity-text">${rarityFor(item)}</span>`;
  $('#modalBest').textContent = item.bestPct != null ? `${item.bestPct}% Best Pet` : '';
  $('#modalBest').hidden = item.bestPct == null;
  $('#modalEventBadge').textContent = item.eventBadge || '';
  $('#modalEventBadge').hidden = !item.eventBadge;
  $('#modalTitle').textContent = item.name;
  $('#modalDescription').textContent = item.description || item.source || '';
  $('#modalSource').textContent = item.source || '—';

  const isCode = state.category === 'codes';
  $('#modalHistoryArea').hidden = isCode;
  if (!isCode) {
    state.modalRange = '24h';
    $$('#historyRange [data-history-range]').forEach(button => {
      const active = button.dataset.historyRange === state.modalRange;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  $('#modalMapRow').hidden = isCode || !item.map;
  $('#modalMap').textContent = item.map || '';
  $('#modalChanceRow').hidden = isCode || !item.hatchChance;
  $('#modalChance').textContent = item.hatchChance || '';
  $('#modalExistsRow').hidden = isCode || item.exists == null;
  $('#modalExists').textContent = item.exists != null ? new Intl.NumberFormat('en-US').format(item.exists) : '';

  $('#modalDropArea').hidden = isCode || !item.dropSources?.length;
  $('#modalSourceGallery').innerHTML = item.dropSources?.length ? dropSourcesMarkup(item.dropSources) : '';
  $('#modalVariantArea').hidden = !(state.category === 'pets' && item.supportsVariants);
  $('#modalAnimatedBadge').hidden = !isAnimated(item);
  $('#modalNote').hidden = !(item.note || isCode);
  $('#modalNote').textContent = isCode ? 'Use the copy button on the code card, then redeem it in game.' : (item.note || '');

  $('#modalValueLabel').textContent = isCode ? 'Code' : 'Value';
  setImageSource($('#modalValueIcon'), isCode ? 'assets/ui/category-codes.png' : ticket);
  $('#modalValueIcon').alt = isCode ? 'Code badge' : 'Ticket';

  renderModalVariant();
  modal.showModal();
  document.body.classList.add('modal-open');
}

function renderModalVariant() {
  const item = state.modalItem;
  if (!item) return;

  const variantArea = $('#modalVariantArea');
  if (state.category === 'pets' && item.supportsVariants) {
    variantArea.hidden = false;
    $('#modalVariantButtons').innerHTML = ['normal', 'golden', 'diamond'].map(variant => `
      <button class="modal-variant-btn ${state.modalVariant === variant ? 'active' : ''}" data-modal-variant="${variant}" aria-pressed="${state.modalVariant === variant}" ${!item.variantImages?.[variant] ? 'disabled' : ''}>
        <i></i>${variant[0].toUpperCase() + variant.slice(1)}
      </button>`).join('');
  } else {
    variantArea.hidden = true;
    $('#modalVariantButtons').innerHTML = '';
  }

  const modalImage = $('#modalImage');
  const animatedArt = $('#modalAnimatedArt');
  if (isAnimated(item)) {
    modalImage.hidden = true;
    animatedArt.hidden = false;
  } else {
    animatedArt.hidden = true;
    modalImage.hidden = false;
    setImageSource(modalImage, imageFor(item, state.modalVariant));
    modalImage.alt = item.name;
    restartEffect(modalImage, 'pop-in');
  }

  $('#modalValue').textContent = state.category === 'codes' ? item.code : formatItemValue(item, state.modalVariant);
  if (state.category !== 'codes') loadValueHistory();
}

function closeModal() {
  historyController?.abort();
  $('#detailModal').close();
  document.body.classList.remove('modal-open');
}

function setSort(nextSort) {
  if (!sortNames[nextSort]) return;
  state.sort = nextSort;
  $('#sortLabel').textContent = sortNames[nextSort];
  $$('.sort-option').forEach(option => {
    const active = option.dataset.sort === nextSort;
    option.classList.toggle('active', active);
    option.setAttribute('aria-selected', String(active));
  });
  $('#sortPopover').hidden = true;
  $('#sortTrigger').setAttribute('aria-expanded', 'false');
  render();
}

function toggleSortMenu(forceOpen = null) {
  const popover = $('#sortPopover');
  const trigger = $('#sortTrigger');
  const willOpen = forceOpen == null ? popover.hidden : forceOpen;
  popover.hidden = !willOpen;
  trigger.setAttribute('aria-expanded', String(willOpen));
}

document.addEventListener('click', event => {
  if (event.target.closest('#clearFilters')) {
    state.query = ''; state.variant = 'normal';
    $('#searchInput').value = ''; render(); $('#searchInput').focus(); return;
  }
  const copyButton = event.target.closest('.copy-code-btn');
  if (copyButton) {
    event.preventDefault();
    event.stopPropagation();
    copyText(copyButton.dataset.code || '').then(ok => {
      const strong = copyButton.querySelector('strong');
      if (!strong) return;
      const previous = strong.textContent;
      strong.textContent = ok ? 'Copied!' : 'Copy failed';
      setTimeout(() => { strong.textContent = previous; }, 1200);
    });
    return;
  }

  const viewTarget = event.target.closest('[data-view-target]');
  if (viewTarget) {
    toggleSortMenu(false);
    switchView(viewTarget.dataset.viewTarget);
    return;
  }

  const nav = event.target.closest('[data-category]');
  if (nav) {
    toggleSortMenu(false);
    switchCategory(nav.dataset.category);
    return;
  }

  if (event.target.closest('[data-swap-trade]')) {
    swapCalcOffers();
    return;
  }

  if (event.target.closest('[data-clear-trade]')) {
    clearCalcTrade();
    return;
  }

  const calcOpen = event.target.closest('[data-calc-open]');
  if (calcOpen) {
    openCalcPicker(calcOpen.dataset.calcOpen);
    return;
  }

  const calcRemove = event.target.closest('[data-calc-remove]');
  if (calcRemove) {
    removeCalcItem(calcRemove.dataset.calcRemove, calcRemove.dataset.id, calcRemove.dataset.variant);
    return;
  }

  const calcPick = event.target.closest('[data-calc-pick]');
  if (calcPick) {
    addCalcItem(state.calcPickerSide, calcPick.dataset.calcCategoryPick, calcPick.dataset.calcPick, calcPick.dataset.calcVariant || 'normal');
    return;
  }

  const calcTab = event.target.closest('[data-calc-category]');
  if (calcTab) {
    state.calcPickerCategory = calcTab.dataset.calcCategory;
    renderCalcPicker();
    return;
  }

  if (event.target.closest('[data-close-calc-picker]')) {
    $('#calcPickerModal').close();
    return;
  }

  const variant = event.target.closest('.variant-btn');
  if (variant) {
    toggleSortMenu(false);
    state.variant = variant.dataset.variant;
    render();
    return;
  }

  const sortOption = event.target.closest('.sort-option');
  if (sortOption) {
    setSort(sortOption.dataset.sort);
    $('#sortTrigger').focus();
    return;
  }

  if (event.target.closest('#sortTrigger')) {
    toggleSortMenu();
    return;
  }

  if (!event.target.closest('#customSort')) {
    toggleSortMenu(false);
  }

  const cardElement = event.target.closest('.value-card');
  if (cardElement) {
    const item = currentCatalog().find(entry => entry.id === cardElement.dataset.id);
    if (item) openModal(item);
    return;
  }

  if (event.target.closest('[data-close-modal]')) closeModal();
});

$('#searchInput').addEventListener('input', event => {
  state.query = event.target.value;
  scheduleRender();
});

$('#calcPickerSearch').addEventListener('input', event => {
  state.calcPickerQuery = event.target.value;
  schedulePickerRender();
});

$('#calcLeftTickets').addEventListener('input', event => {
  const next = Math.max(0, Number(event.target.value) || 0);
  flashTicketInput(event.target, next > state.calc.leftTickets ? 'up' : next < state.calc.leftTickets ? 'down' : 'neutral');
  state.calc.leftTickets = next;
  renderCalculator();
});

$('#calcRightTickets').addEventListener('input', event => {
  const next = Math.max(0, Number(event.target.value) || 0);
  flashTicketInput(event.target, next > state.calc.rightTickets ? 'up' : next < state.calc.rightTickets ? 'down' : 'neutral');
  state.calc.rightTickets = next;
  renderCalculator();
});
for (const side of ['left', 'right']) {
  $(`#calc${side === 'left' ? 'Left' : 'Right'}Tickets`).addEventListener('blur', event => {
    event.target.value = state.calc[`${side}Tickets`];
  });
}

$('#calcPickerModal').addEventListener('click', event => {
  if (event.target !== $('#calcPickerModal')) return;
  const rect = $('#calcPickerModal').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#calcPickerModal').close();
});

$('#modalVariantButtons').addEventListener('click', event => {
  const button = event.target.closest('[data-modal-variant]');
  if (!button || button.disabled) return;
  state.modalVariant = button.dataset.modalVariant;
  renderModalVariant();
});

$('#historyRange').addEventListener('click', event => {
  const button = event.target.closest('[data-history-range]');
  if (!button || button.dataset.historyRange === state.modalRange) return;
  state.modalRange = button.dataset.historyRange;
  $$('#historyRange [data-history-range]').forEach(option => {
    const active = option === button;
    option.classList.toggle('active', active);
    option.setAttribute('aria-pressed', String(active));
  });
  loadValueHistory();
});

$('#detailModal').addEventListener('click', event => {
  if (event.target !== $('#detailModal')) return;
  const rect = $('#detailModal').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal();
});

$('#detailModal').addEventListener('close', () => {
  historyController?.abort();
  clearTimeout(petTapTimer);
  $('#modalArtShell').classList.remove('pet-tap');
  document.body.classList.remove('modal-open');
});

document.addEventListener('keydown', event => {
  if (event.key === '/' && state.view === 'values' && !event.ctrlKey && !event.metaKey && !$('#detailModal').open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault(); $('#searchInput').focus();
  }
  if (event.key === 'Escape' && !$('#sortPopover').hidden) {
    toggleSortMenu(false);
    $('#sortTrigger').focus();
  }
});

const savedTheme = readSetting('pet-universe-theme');
if (savedTheme === 'dark' || savedTheme === 'light') {
  document.documentElement.dataset.theme = savedTheme;
}

function syncTheme() {
  $('#themeLabel').textContent = document.documentElement.dataset.theme === 'dark' ? 'Dark mode' : 'Light mode';
}

$('#themeToggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  writeSetting('pet-universe-theme', next);
  syncTheme();
});

let petTapTimer;
$('#modalArtShell').addEventListener('click', () => {
  if (!motionAllowed()) return;
  const art = $('#modalArtShell');
  clearTimeout(petTapTimer);
  art.classList.add('pet-tap');
  for (const animation of art.getAnimations({ subtree: true })) {
    if (animation.animationName === 'petTap') { animation.currentTime = 0; animation.play(); }
  }
  petTapTimer = setTimeout(() => art.classList.remove('pet-tap'), 700);
});
$('#motionToggle').addEventListener('click', () => {
  animationsPaused = !animationsPaused; syncMotion(); writeSetting('pet-universe-motion', animationsPaused ? 'off' : 'on');
  resetTilt();
});
reducedMotion.addEventListener('change', event => { if (event.matches) { animationsPaused = true; syncMotion(); } });
document.addEventListener('visibilitychange', () => {
  document.documentElement.toggleAttribute('data-page-hidden', document.hidden);
  if (document.hidden) resetTilt();
});
document.addEventListener('pointerdown', event => {
  if (!motionAllowed() || !event.target.closest('button')) return;
  const dialog = event.target.closest('dialog');
  const rect = dialog?.getBoundingClientRect();
  const fragment = document.createDocumentFragment();
  const sparks = [];
  for (let i = 0; i < 5; i++) {
    const spark = document.createElement('i'); spark.className = 'click-ember';
    const angle = Math.PI * 2 * i / 5;
    spark.style.cssText = `left:${event.clientX}px;top:${event.clientY}px;--sx:${Math.cos(angle)*25}px;--sy:${Math.sin(angle)*25}px`;
    if (dialog) { spark.style.position = 'absolute'; spark.style.left = `${event.clientX-rect.left}px`; spark.style.top = `${event.clientY-rect.top+dialog.scrollTop}px`; }
    fragment.append(spark); sparks.push(spark);
  }
  (dialog || document.body).append(fragment);
  setTimeout(() => sparks.forEach(spark => spark.remove()), 550);
});
$('#sortTrigger').addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') { event.preventDefault(); toggleSortMenu(true); $('.sort-option:not([hidden])')?.focus(); }
});
$('#sortPopover').addEventListener('keydown', event => {
  const options = $$('.sort-option:not([hidden])');
  const index = options.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault(); options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
  }
  if (event.key === 'Home') { event.preventDefault(); options[0]?.focus(); }
  if (event.key === 'End') { event.preventDefault(); options.at(-1)?.focus(); }
});
syncMotion();
syncTheme();
refreshHomeUpdated();
setInterval(refreshHomeUpdated, 60000);
render();
fetch('/api/snapshot', { method: 'POST', headers: { accept: 'application/json' } }).catch(() => {});


function enableAssetProtection() {
  const protectedSelector = '.brand-card img, .card-art, .card-art img, .modal-art-shell, .modal-art-shell img, .calc-picker-art, .calc-picker-art img, .home-v40-orbit img, .drop-source-card img';
  document.querySelectorAll('img').forEach(img => {
    img.setAttribute('draggable', 'false');
    img.setAttribute('decoding', 'async');
  });
  document.addEventListener('dragstart', event => {
    if (event.target.closest(protectedSelector)) event.preventDefault();
  });
  document.addEventListener('contextmenu', event => {
    event.preventDefault();
  });
  document.addEventListener('copy', event => {
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest(protectedSelector)) event.preventDefault();
  });
}

enableAssetProtection();
