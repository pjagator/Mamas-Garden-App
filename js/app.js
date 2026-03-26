// ── Supabase ───────────────────────────────────────────────────
export const SUPABASE_URL     = 'https://itjvgruwvlrrlhsknwiw.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0anZncnV3dmxycmxoc2tud2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTgzMTgsImV4cCI6MjA4OTY3NDMxOH0.I9nrbtfZqvd4Q9V9GIbUv1vWYWB9OfQwucGhBU8UP6c';
export const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Event system ──────────────────────────────────────────────
const _listeners = {};
export function on(event, fn) { (_listeners[event] ||= []).push(fn); }
export function emit(event, data) { (_listeners[event] || []).forEach(fn => fn(data)); }

// ── State with getters/setters ────────────────────────────────
let _currentUser = null;
export function getCurrentUser() { return _currentUser; }
export function setCurrentUser(u) { _currentUser = u; }
let _allInventory = [];
export function getAllInventory() { return _allInventory; }
export function setAllInventory(v) { _allInventory = v; }

// ── Native plant database ──────────────────────────────────────
export const NATIVE_PLANTS = [
    { name: "Coontie",             scientific: "Zamia integrifolia",       aliases: ["coontie", "florida arrowroot", "zamia"], bloom: ["Spring","Summer"],              type: "Cycad" },
    { name: "Beautyberry",         scientific: "Callicarpa americana",     aliases: ["beautyberry", "callicarpa"],             bloom: ["Summer","Fall"],               type: "Shrub" },
    { name: "Firebush",            scientific: "Hamelia patens",           aliases: ["firebush", "hamelia", "scarlet bush"],   bloom: ["Spring","Summer","Fall"],      type: "Shrub" },
    { name: "Wild Coffee",         scientific: "Psychotria nervosa",       aliases: ["wild coffee", "psychotria"],             bloom: ["Spring","Summer"],              type: "Shrub" },
    { name: "Simpson's Stopper",   scientific: "Myrcianthes fragrans",    aliases: ["simpson", "stopper", "myrcianthes"],     bloom: ["Spring","Summer"],              type: "Tree" },
    { name: "Blanket Flower",      scientific: "Gaillardia pulchella",    aliases: ["blanket flower", "gaillardia", "indian blanket"], bloom: ["Spring","Summer","Fall"], type: "Wildflower" },
    { name: "Beach Sunflower",     scientific: "Helianthus debilis",      aliases: ["beach sunflower", "helianthus debilis"],  bloom: ["Year-round"],                  type: "Wildflower" },
    { name: "Coral Honeysuckle",   scientific: "Lonicera sempervirens",   aliases: ["coral honeysuckle", "lonicera"],         bloom: ["Spring","Summer","Fall"],      type: "Vine" },
    { name: "Passion Vine",        scientific: "Passiflora incarnata",    aliases: ["passion vine", "passionflower", "maypop", "passiflora"], bloom: ["Summer","Fall"], type: "Vine" },
    { name: "Muhly Grass",         scientific: "Muhlenbergia capillaris", aliases: ["muhly", "muhlenbergia", "pink muhly"],   bloom: ["Fall"],                         type: "Grass" },
    { name: "Saw Palmetto",        scientific: "Serenoa repens",          aliases: ["saw palmetto", "serenoa"],               bloom: ["Spring"],                       type: "Palm" },
    { name: "Cabbage Palm",        scientific: "Sabal palmetto",          aliases: ["cabbage palm", "sabal", "cabbage palmetto"], bloom: ["Summer"],                  type: "Palm" },
    { name: "Southern Magnolia",   scientific: "Magnolia grandiflora",    aliases: ["magnolia", "southern magnolia"],          bloom: ["Spring","Summer"],              type: "Tree" },
    { name: "Live Oak",            scientific: "Quercus virginiana",      aliases: ["live oak", "quercus virginiana"],         bloom: ["Spring"],                       type: "Tree" },
    { name: "Bald Cypress",        scientific: "Taxodium distichum",      aliases: ["bald cypress", "taxodium"],               bloom: ["Spring"],                       type: "Tree" },
];

// ── Preset tags and locations ──────────────────────────────────
export const PRESET_TAGS = ['Grass', 'Vine', 'Shrub', 'Wildflower', 'Tree', 'Palm', 'Cycad', 'Fern', 'Herb'];
export const LOCATION_ZONES = ['Front', 'Back', 'Side', 'Pot'];
export const LOCATION_HABITATS = ['Hammock', 'Sandhill'];

// ── Helpers ────────────────────────────────────────────────────
export function getSeason(monthIndex) {
    if (monthIndex >= 2 && monthIndex <= 4) return 'Spring';
    if (monthIndex >= 5 && monthIndex <= 7) return 'Summer';
    if (monthIndex >= 8 && monthIndex <= 10) return 'Fall';
    return 'Winter';
}

export function getCurrentSeason() { return getSeason(new Date().getMonth()); }

export function confidenceClass(pct) {
    if (pct >= 70) return 'high';
    if (pct >= 40) return 'mid';
    return 'low';
}

export function matchNative(commonName = '', scientificName = '') {
    const haystack = (commonName + ' ' + scientificName).toLowerCase();
    return NATIVE_PLANTS.find(p => {
        if (haystack.includes(p.scientific.toLowerCase())) return true;
        return p.aliases.some(a => haystack.includes(a));
    }) || null;
}

// ── Welcome screen quotes ───────────────────────────────────────
export const GARDEN_QUOTES = [
    { text: "One is nearer God's heart in a garden than anywhere else on earth.", author: "Dorothy Frances Gurney", source: "God's Garden" },
    { text: "We must cultivate our garden.", author: "Voltaire", source: "Candide" },
    { text: "The glory of gardening: hands in the dirt, head in the sun, heart with nature.", author: "Alfred Austin", source: "The Garden That I Love" },
    { text: "To plant a garden is to believe in tomorrow.", author: "Audrey Hepburn", source: "" },
    { text: "In the spring, at the end of the day, you should smell like dirt.", author: "Margaret Atwood", source: "Bluebeard's Egg" },
    { text: "What is a weed? A plant whose virtues have not yet been discovered.", author: "Ralph Waldo Emerson", source: "Fortune of the Republic" },
    { text: "The kiss of the sun for pardon, the song of the birds for mirth, one is nearer God's heart in a garden than anywhere else on earth.", author: "Dorothy Frances Gurney", source: "God's Garden" },
    { text: "April is the cruellest month, breeding / Lilacs out of the dead land, mixing / Memory and desire, stirring / Dull roots with spring rain.", author: "T.S. Eliot", source: "The Waste Land" },
    { text: "Where you tend a rose, my lad, a thistle cannot grow.", author: "Frances Hodgson Burnett", source: "The Secret Garden" },
    { text: "If you have a garden and a library, you have everything you need.", author: "Cicero", source: "Ad Familiares IX, 4" },
    { text: "The earth laughs in flowers.", author: "Ralph Waldo Emerson", source: "Hamatreya" },
    { text: "A garden is a grand teacher. It teaches patience and careful watchfulness.", author: "Gertrude Jekyll", source: "Wood and Garden" },
    { text: "He who plants a garden plants happiness.", author: "Chinese Proverb", source: "" },
    { text: "I know a bank where the wild thyme blows, / Where oxlips and the nodding violet grows.", author: "William Shakespeare", source: "A Midsummer Night's Dream" },
    { text: "One touch of nature makes the whole world kin.", author: "William Shakespeare", source: "Troilus and Cressida" },
    { text: "And the spring arose on the garden fair, / Like the Spirit of Love felt everywhere.", author: "Percy Bysshe Shelley", source: "The Sensitive Plant" },
    { text: "I wandered lonely as a cloud / That floats on high o'er vales and hills, / When all at once I saw a crowd, / A host, of golden daffodils.", author: "William Wordsworth", source: "Daffodils" },
    { text: "The poetry of the earth is never dead.", author: "John Keats", source: "On the Grasshopper and Cricket" },
    { text: "A thing of beauty is a joy for ever: / Its loveliness increases; it will never / Pass into nothingness.", author: "John Keats", source: "Endymion" },
    { text: "Nature never did betray the heart that loved her.", author: "William Wordsworth", source: "Tintern Abbey" },
    { text: "To see a World in a Grain of Sand / And a Heaven in a Wild Flower.", author: "William Blake", source: "Auguries of Innocence" },
    { text: "The Amen of nature is always a flower.", author: "Oliver Wendell Holmes", source: "The Autocrat of the Breakfast-Table" },
    { text: "How vainly men themselves amaze / To win the palm, the oak, or bays, / And their incessant labours see / Crown'd from some single herb or tree.", author: "Andrew Marvell", source: "The Garden" },
    { text: "I think that I shall never see / A poem lovely as a tree.", author: "Joyce Kilmer", source: "Trees" },
    { text: "Nothing is more completely the child of art than a garden.", author: "Sir Walter Scott", source: "On Ornamental Plantations and Landscape Gardening" },
    { text: "There can be no other occupation like gardening in which, if you were to creep up behind someone at their work, you would find them smiling.", author: "Mirabel Osler", source: "A Gentle Plea for Chaos" },
    { text: "All my hurts my garden spade can heal.", author: "Ralph Waldo Emerson", source: "Musketaquid" },
    { text: "In joy or sadness, flowers are our constant friends.", author: "Kakuz\u014d Okakura", source: "The Book of Tea" },
    { text: "God Almighty first planted a garden. And indeed it is the purest of human pleasures.", author: "Francis Bacon", source: "Of Gardens" },
    { text: "I perhaps owe having become a painter to flowers.", author: "Claude Monet", source: "" },
    { text: "Everything that slows us down and forces patience, everything that sets us back into the slow circles of nature, is a help.", author: "May Sarton", source: "Plant Dreaming Deep" },
    { text: "To forget how to dig the earth and to tend the soil is to forget ourselves.", author: "Mahatma Gandhi", source: "" },
    { text: "A garden requires patient labor and attention. Plants do not grow merely to satisfy ambitions or to fulfill good intentions. They thrive because someone expended effort on them.", author: "Liberty Hyde Bailey", source: "The Holy Earth" },
    { text: "My garden is my most beautiful masterpiece.", author: "Claude Monet", source: "" },
    { text: "The love of gardening is a seed once sown that never dies.", author: "Gertrude Jekyll", source: "Wood and Garden" },
    { text: "Show me your garden and I shall tell you what you are.", author: "Alfred Austin", source: "The Garden That I Love" },
    { text: "Let us not forget that the cultivation of the earth is the most important labor of man.", author: "Daniel Webster", source: "" },
    { text: "How fair is a garden amid the trials and passions of existence.", author: "Benjamin Disraeli", source: "Lothair" },
    { text: "When the world wearies and society fails to satisfy, there is always the garden.", author: "Minnie Aumonier", source: "" },
    { text: "I have a garden of my own, / But so with roses overgrown, / And lilies, that you would it guess / To be a little wilderness.", author: "Andrew Marvell", source: "The Nymph Complaining" },
    { text: "Gardening is the art that uses flowers and plants as paint, and the soil and sky as canvas.", author: "Elizabeth Murray", source: "" },
    { text: "The garden suggests there might be a place where we can meet nature halfway.", author: "Michael Pollan", source: "Second Nature" },
    { text: "Green fingers are the extension of a verdant heart.", author: "Russell Page", source: "The Education of a Gardener" },
    { text: "But though an old man, I am but a young gardener.", author: "Thomas Jefferson", source: "Letter to Charles Willson Peale" },
    { text: "All gardening is landscape painting.", author: "William Kent", source: "" },
    { text: "The greatest gift of the garden is the restoration of the five senses.", author: "Hanna Rion", source: "Let's Make a Flower Garden" },
    { text: "Half the interest of a garden is the constant exercise of the imagination.", author: "Mrs. C.W. Earle", source: "Pot-Pourri from a Surrey Garden" },
    { text: "O, what pity is it / That he had not so trimm'd and dress'd his land / As we this garden!", author: "William Shakespeare", source: "Richard II" },
    { text: "Who loves a garden still his Eden keeps, / Perennial pleasures plants, and wholesome harvests reaps.", author: "Amos Bronson Alcott", source: "Tablets" },
    { text: "I used to visit and revisit it a dozen times a day, and stand in deep contemplation over my vegetable progeny with a love that nobody could share or conceive of.", author: "Nathaniel Hawthorne", source: "Mosses from an Old Manse" },
    { text: "Weather means more when you have a garden. There's nothing like listening to a shower and thinking how it is soaking in around your green beans.", author: "Marcelene Cox", source: "" },
    { text: "Remember that children, marriages, and flower gardens reflect the kind of care they get.", author: "H. Jackson Brown Jr.", source: "Life's Little Instruction Book" },
    { text: "In search of my mother's garden, I found my own.", author: "Alice Walker", source: "In Search of Our Mothers' Gardens" },
    { text: "Come forth into the light of things, let nature be your teacher.", author: "William Wordsworth", source: "The Tables Turned" },
    { text: "With freedom, flowers, books, and the moon, who could not be perfectly happy?", author: "Oscar Wilde", source: "De Profundis" },
    { text: "In every walk with nature one receives far more than he seeks.", author: "John Muir", source: "Steep Trails" },
    { text: "What a desolate place would be a world without a flower! It would be a face without a smile, a feast without a welcome.", author: "Clara Balfour", source: "" },
    { text: "Flowers always make people better, happier, and more helpful; they are sunshine, food, and medicine for the soul.", author: "Luther Burbank", source: "" },
    { text: "The lesson I have thoroughly learnt, and wish to pass on to others, is to know the enduring happiness that the love of a garden gives.", author: "Gertrude Jekyll", source: "Wood and Garden" },
    { text: "Life begins the day you start a garden.", author: "Chinese Proverb", source: "" },
    { text: "I go to nature to be soothed and healed, and to have my senses put in order.", author: "John Burroughs", source: "I Go a-Fishing" },
    { text: "Blessed are they who see beautiful things in humble places where other people see nothing.", author: "Camille Pissarro", source: "" },
    { text: "Where flowers bloom so does hope.", author: "Lady Bird Johnson", source: "" },
    { text: "By plucking her petals, you do not gather the beauty of the flower.", author: "Rabindranath Tagore", source: "Stray Birds" },
    { text: "Some old-fashioned things like fresh air and sunshine are hard to beat.", author: "Laura Ingalls Wilder", source: "" },
];

// ── Welcome screen gardening facts ──────────────────────────────
export const GARDEN_FACTS = [
    "Tampa Bay sits in USDA Hardiness Zone 9b\u201310a, meaning average winter lows rarely dip below 30\u00b0F \u2014 perfect for tropical and subtropical plants year-round.",
    "Florida's state wildflower, the Coreopsis, blooms in brilliant yellows and oranges along Tampa Bay roadsides from spring through fall.",
    "Coontie (Zamia integrifolia) is the only native cycad in North America and the sole host plant for the rare Atala butterfly.",
    "Tampa Bay's sandy, acidite soil drains quickly. Most native plants here have adapted to thrive in nutrient-poor conditions that would starve garden cultivars.",
    "The Southern magnolia can live for over 120 years and its flowers are among the most ancient on Earth \u2014 fossils date magnolia-like plants to 95 million years ago.",
    "Florida has more native plant species (about 4,200) than any other state east of the Mississippi River.",
    "Saw palmettos can live for 500 to 700 years, making them among the longest-lived plants in the southeastern United States.",
    "Spanish moss isn't moss at all \u2014 it's an epiphytic bromeliad (Tillandsia usneoides) related to pineapples. It takes all its nutrients from air and rain.",
    "Pollinators are responsible for one out of every three bites of food we eat. A single honeybee colony can pollinate 300 million flowers each day.",
    "Tampa Bay's live oaks (Quercus virginiana) are semi-evergreen: they drop their old leaves in spring just as new ones emerge, so they're never truly bare.",
    "Fireflies in Tampa Bay gardens are actually beetles (family Lampyridae). Their bioluminescence is the most efficient light production known \u2014 nearly 100% of the energy becomes light.",
    "Florida's native Beautyberry produces vivid purple fruit clusters that are not only ornamental but can be made into jelly, and the crushed leaves are a traditional insect repellent.",
    "The term 'hammock' in Florida ecology refers to a dense stand of hardwood trees, not a hanging bed. Tampa Bay has both coastal and inland hammock habitats.",
    "Butterfly gardens in Tampa should include both nectar plants (for adults) and host plants (for caterpillars). Passionvine hosts Gulf Fritillary and Zebra Longwing butterflies.",
    "Mycorrhizal fungi form symbiotic networks with plant roots, extending their reach for water and nutrients. About 90% of plant species depend on these fungal partnerships.",
    "Tampa Bay receives about 46 inches of rain per year, with 60% falling between June and September during the afternoon thunderstorm season.",
    "Mulch should be kept 2\u20133 inches away from tree trunks to prevent rot. This gap is called a 'mulch volcano' prevention zone.",
    "Florida's state tree, the Sabal palmetto (cabbage palm), can withstand hurricane-force winds because its trunk bends rather than breaks.",
    "The Zebra Longwing is Florida's state butterfly. It's unusual because adults can digest pollen (not just nectar), giving them a lifespan of up to 6 months.",
    "Native plants typically require 60% less water than non-native ornamentals once established, making them ideal for Florida's dry winters.",
    "Composting in Tampa's heat works fast \u2014 a well-maintained pile can produce usable compost in as little as 4\u20136 weeks during summer.",
    "The word 'garden' comes from Old English 'geard' meaning 'enclosure.' The Garden of Eden literally means 'enclosed delight.'",
    "Blanket flowers (Gaillardia) are one of the few wildflowers that thrive in pure Florida sand with virtually no amendments or irrigation.",
    "Lightning fixes atmospheric nitrogen into a form plants can absorb. Florida \u2014 the lightning capital of the US \u2014 gets a natural fertilizer boost with every storm.",
    "Resurrection fern (Pleopeltis polypodioides), common on Tampa Bay live oaks, can lose up to 97% of its water content and revive completely within hours of rain.",
    "The average garden soil contains more living organisms in a single tablespoon than there are people on Earth.",
    "Tampa Bay's mangrove forests are among the most productive ecosystems on the planet, generating more organic material per acre than most temperate forests.",
    "Coral honeysuckle (Lonicera sempervirens) is one of the best hummingbird plants for Tampa Bay \u2014 it blooms for months and never becomes invasive like Japanese honeysuckle.",
    "Florida scrub-jays, found near Tampa Bay, are the only bird species endemic to Florida. They depend on scrub habitat with saw palmetto and scrub oaks.",
    "Earthworms aren't native to Florida. The worms in Tampa gardens are introduced species \u2014 native soil organisms like beetle larvae and millipedes did the decomposition work first.",
    "The firebush (Hamelia patens) is one of the top butterfly-attracting plants in Florida, visited by at least 18 species of butterflies.",
    "pH matters: most Florida native plants prefer slightly acidic soil (pH 5.5\u20136.5). Tampa's sandy soils naturally tend toward this range.",
    "A single mature live oak can transpire over 40,000 gallons of water per year, cooling the surrounding air like a natural air conditioner.",
    "Muhly grass (Muhlenbergia capillaris) puts on its spectacular pink-purple display in October and November \u2014 one of the showiest native grasses in the Southeast.",
    "Florida's native wild coffee (Psychotria nervosa) is not in the same genus as commercial coffee but gets its name from similar-looking red berries.",
    "Dragonflies, common in Tampa Bay gardens, are among the most efficient predators on Earth \u2014 they catch up to 95% of the prey they pursue.",
    "The first botanical garden in the Americas was established in 1545 in Padua, Italy. It still exists today and is a UNESCO World Heritage Site.",
    "Rain barrels connected to a standard roof gutter can collect about 600 gallons of water from just one inch of rainfall on a 1,000-square-foot roof.",
    "Ladybugs (lady beetles) can eat up to 5,000 aphids in their lifetime, making them one of the most effective natural pest controls in any garden.",
    "Tampa Bay's subtropical climate means you can grow two or three successive vegetable crops per year \u2014 cool-season, warm-season, and a fall planting.",
    "Bald cypress trees in Florida can live for over 1,000 years. Their 'knees' that poke above water are thought to help with gas exchange and stability.",
    "Native wildflower meadows support 10 to 50 times more pollinators than manicured lawns of the same size.",
    "The term 'companion planting' goes back to Indigenous agricultural traditions. The 'Three Sisters' method (corn, beans, squash) is one of the oldest known examples.",
    "Florida's sandhill ecosystem, found in parts of Tampa Bay, features longleaf pines and wiregrass and depends on periodic fire to maintain its health.",
    "Sunflowers exhibit heliotropism \u2014 young flower heads track the sun across the sky during the day and reset east overnight. Mature heads face east permanently.",
    "A healthy square yard of garden soil can contain over 1,000 earthworms, 100,000 springtails, and millions of nematodes.",
    "The scent of freshly cut grass is actually a chemical distress signal \u2014 plants release volatile organic compounds to warn neighboring plants of damage.",
    "Simpson's stopper (Myrcianthes fragrans), a Tampa Bay native, produces tiny aromatic fruits that attract mockingbirds, catbirds, and cedar waxwings.",
    "Butterflies taste with their feet. When a butterfly lands on a flower, receptors on its legs detect sugars in the nectar.",
    "Native bunch grasses like wiregrass and muhly grass have root systems that can extend 6 feet deep, far outperforming sod grass for erosion control.",
    "The practice of 'chop and drop' mulching \u2014 cutting spent plants and leaving them where they fall \u2014 returns nutrients to the soil and mimics natural forest floor processes.",
    "Green anoles, the small lizards common in Tampa gardens, can change color from bright green to brown depending on temperature, stress, and social signals.",
    "Florida's rainy season (June\u2013September) is when most native wildflowers and grasses put on their best growth. Plant them in early summer to let rain do the watering.",
    "Bat houses in Tampa Bay gardens can attract evening bats and Brazilian free-tailed bats. A single bat can eat 1,000 mosquitoes per hour.",
    "The oldest known cultivated garden is the Tomb Garden of Sennefer in ancient Egypt, dating to around 1400 BCE.",
    "Native beach sunflower (Helianthus debilis) is one of the best ground covers for sunny Florida gardens \u2014 it blooms year-round and tolerates salt, drought, and poor soil.",
    "Leaf cutter ants, sometimes seen in Tampa Bay, don't eat the leaves they cut. They use them to cultivate a fungus underground \u2014 they're fungus farmers.",
    "Passion fruit vine flowers have an elaborate structure that inspired early Spanish missionaries to name them after the Passion of Christ \u2014 the corona as the crown of thorns.",
    "The average American lawn uses 10 times more chemical pesticide per acre than farmland. Replacing even part of a lawn with natives eliminates this entirely.",
    "Tampa Bay's gulf breezes carry salt spray inland, which is why salt-tolerant natives like sea grape, beach sunflower, and railroad vine thrive near the coast.",
    "The world's largest organism is a honey fungus (Armillaria ostoyae) network spanning 2,385 acres in Oregon \u2014 the underground networks in your garden soil work on the same principle.",
    "Bromeliads, which grow naturally on Tampa Bay trees, are 'tank plants' \u2014 their overlapping leaves form cups that hold water, creating entire micro-ecosystems for frogs and insects.",
    "Morning dew is more than decoration: many plants, especially in Florida's dry winters, absorb moisture directly through their leaves from condensation.",
    "The concept of a 'butterfly garden' was popularized in the 1980s, but Indigenous peoples throughout the Americas had been managing pollinator habitat for thousands of years.",
];

// ── Internal welcome screen helpers ─────────────────────────────
function getDailyIndex(arr, offset) {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    return (dayOfYear + offset) % arr.length;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

export function initWelcomeScreen() {
    const qi = getDailyIndex(GARDEN_QUOTES, 0);
    const fi = getDailyIndex(GARDEN_FACTS, 17);
    const q = GARDEN_QUOTES[qi];

    document.getElementById('welcome-greeting').textContent = getGreeting();
    document.getElementById('welcome-quote-text').textContent = q.text;
    document.getElementById('welcome-quote-attr').textContent = q.source
        ? `\u2014 ${q.author}, ${q.source}`
        : `\u2014 ${q.author}`;
    document.getElementById('welcome-fact-text').textContent = GARDEN_FACTS[fi];
}

export function dismissWelcome() {
    document.getElementById('welcome-screen').classList.remove('active-screen');
    document.getElementById('tab-capture').classList.add('active-screen');
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.querySelector('.nav-label').textContent === 'Capture');
    });
}

// ── Navigation ─────────────────────────────────────────────────
export function showScreen(name, btnEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active-screen');
    if (btnEl) btnEl.classList.add('active');
    document.getElementById('welcome-screen').classList.remove('active-screen');
}

// ── Modal helpers ──────────────────────────────────────────────
export function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
}

export function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    document.body.style.overflow = '';
}

// ── Load inventory ─────────────────────────────────────────────
export async function loadInventory() {
    const { data, error } = await sb.from('inventory')
        .select('*')
        .eq('user_id', getCurrentUser().id)
        .order('date', { ascending: false });
    if (error) { console.error(error); return; }
    _allInventory = data || [];
    updateStats();
    renderInventory();
    renderTimeline();
    loadReminders();
}

// ── Imports from child modules ─────────────────────────────────
import { showAuthTab, handleSignIn, handleSignUp, handleSendCode, handleVerifyCode, handlePasswordReset, handleSignOut } from './auth.js';
import { handlePhoto, removeImage, identifySpecies, renderIdCards, selectIdCard, saveSelectedId, openManualEntry, saveManualEntry } from './capture.js';
import { updateStats, handleSearch, setFilter, toggleTagFilter, setLocationFilter, setSort, toggleFilterDropdown, renderInventory, showItemDetail, showLinkedBug, deleteItem, renderTimeline, exportJSON, exportCSV, clearAllData, showNativesDB } from './inventory.js';
import { toggleTag, removeTag, addCustomTag, toggleBugPlantLink, saveBugPlantLink, togglePlantStatus, setLocationZone, setLocationHabitat, savePlantStatus, refreshCareProfile, toggleCareProfile, parseLocation, buildLocation, loadReminders, toggleReminderDone, addCustomReminder, removeReminder, toggleRemindersSection, toggleHealthHistory, loadMoreHealthHistory } from './features.js';

// ── Auth state change handler ──────────────────────────────────
sb.auth.onAuthStateChange((event, session) => {
    _currentUser = session?.user ?? null;
    if (_currentUser) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app').style.display = 'block';
        document.getElementById('settings-email').textContent = _currentUser.email;
        document.getElementById('current-season').textContent = getCurrentSeason();
        // Show welcome screen, hide all tab screens
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('welcome-screen').classList.add('active-screen');
        initWelcomeScreen();
        loadInventory();
        renderTimeline();
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app').style.display = 'none';
    }
});

// ── Event listeners ────────────────────────────────────────────
on('inventory-changed', async () => { await loadInventory(); });
on('item-updated', ({ itemId }) => {
    renderInventory();
    const item = getAllInventory().find(i => i.id === itemId);
    if (item) showItemDetail(item);
});

// ── Window bindings for HTML onclick/oninput/onchange handlers ──
Object.assign(window, {
    // Auth
    showAuthTab, handleSignIn, handleSignUp, handleSendCode, handleVerifyCode, handlePasswordReset, handleSignOut,
    // Navigation
    showScreen, dismissWelcome,
    // Capture
    handlePhoto, removeImage, identifySpecies, renderIdCards, selectIdCard, saveSelectedId, openManualEntry, saveManualEntry,
    // Inventory
    handleSearch, setFilter, toggleTagFilter, setLocationFilter, setSort, toggleFilterDropdown, showItemDetail, showLinkedBug, deleteItem, exportJSON, exportCSV, clearAllData, showNativesDB,
    // Features
    toggleTag, removeTag, addCustomTag, toggleBugPlantLink, saveBugPlantLink, togglePlantStatus, setLocationZone, setLocationHabitat, savePlantStatus, refreshCareProfile, toggleCareProfile,
    toggleHealthHistory, loadMoreHealthHistory,
    // Reminders
    toggleReminderDone, addCustomReminder, removeReminder, toggleRemindersSection,
    // Modal
    openModal, closeModal,
});
