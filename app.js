// ── Supabase ───────────────────────────────────────────────────
const SUPABASE_URL     = 'https://itjvgruwvlrrlhsknwiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0anZncnV3dmxycmxoc2tud2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTgzMTgsImV4cCI6MjA4OTY3NDMxOH0.I9nrbtfZqvd4Q9V9GIbUv1vWYWB9OfQwucGhBU8UP6c';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Native plant database ──────────────────────────────────────
const NATIVE_PLANTS = [
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
const PRESET_TAGS = ['Grass', 'Vine', 'Shrub', 'Wildflower', 'Tree', 'Palm', 'Cycad', 'Fern', 'Herb'];
const LOCATION_ZONES = ['Front', 'Back', 'Side', 'Pot'];
const LOCATION_HABITATS = ['Hammock', 'Sandhill'];

// ── State ──────────────────────────────────────────────────────
let currentUser     = null;
let allInventory    = [];
let currentFilter   = 'all';
let currentSearch   = '';
let activeTagFilters = [];
let activeLocationFilter = '';
let currentSort     = 'date-desc';
let pendingIdResults = [];
let selectedIdIndex  = null;

// ── Helpers ────────────────────────────────────────────────────
function getSeason(monthIndex) {
    if (monthIndex >= 2 && monthIndex <= 4) return 'Spring';
    if (monthIndex >= 5 && monthIndex <= 7) return 'Summer';
    if (monthIndex >= 8 && monthIndex <= 10) return 'Fall';
    return 'Winter';
}

function getCurrentSeason() { return getSeason(new Date().getMonth()); }

function confidenceClass(pct) {
    if (pct >= 70) return 'high';
    if (pct >= 40) return 'mid';
    return 'low';
}

function matchNative(commonName = '', scientificName = '') {
    const haystack = (commonName + ' ' + scientificName).toLowerCase();
    return NATIVE_PLANTS.find(p => {
        if (haystack.includes(p.scientific.toLowerCase())) return true;
        return p.aliases.some(a => haystack.includes(a));
    }) || null;
}

// ── Welcome screen quotes ───────────────────────────────────────
const GARDEN_QUOTES = [
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
    { text: "In joy or sadness, flowers are our constant friends.", author: "Kakuzō Okakura", source: "The Book of Tea" },
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
const GARDEN_FACTS = [
    "Tampa Bay sits in USDA Hardiness Zone 9b–10a, meaning average winter lows rarely dip below 30°F — perfect for tropical and subtropical plants year-round.",
    "Florida's state wildflower, the Coreopsis, blooms in brilliant yellows and oranges along Tampa Bay roadsides from spring through fall.",
    "Coontie (Zamia integrifolia) is the only native cycad in North America and the sole host plant for the rare Atala butterfly.",
    "Tampa Bay's sandy, acidite soil drains quickly. Most native plants here have adapted to thrive in nutrient-poor conditions that would starve garden cultivars.",
    "The Southern magnolia can live for over 120 years and its flowers are among the most ancient on Earth — fossils date magnolia-like plants to 95 million years ago.",
    "Florida has more native plant species (about 4,200) than any other state east of the Mississippi River.",
    "Saw palmettos can live for 500 to 700 years, making them among the longest-lived plants in the southeastern United States.",
    "Spanish moss isn't moss at all — it's an epiphytic bromeliad (Tillandsia usneoides) related to pineapples. It takes all its nutrients from air and rain.",
    "Pollinators are responsible for one out of every three bites of food we eat. A single honeybee colony can pollinate 300 million flowers each day.",
    "Tampa Bay's live oaks (Quercus virginiana) are semi-evergreen: they drop their old leaves in spring just as new ones emerge, so they're never truly bare.",
    "Fireflies in Tampa Bay gardens are actually beetles (family Lampyridae). Their bioluminescence is the most efficient light production known — nearly 100% of the energy becomes light.",
    "Florida's native Beautyberry produces vivid purple fruit clusters that are not only ornamental but can be made into jelly, and the crushed leaves are a traditional insect repellent.",
    "The term 'hammock' in Florida ecology refers to a dense stand of hardwood trees, not a hanging bed. Tampa Bay has both coastal and inland hammock habitats.",
    "Butterfly gardens in Tampa should include both nectar plants (for adults) and host plants (for caterpillars). Passionvine hosts Gulf Fritillary and Zebra Longwing butterflies.",
    "Mycorrhizal fungi form symbiotic networks with plant roots, extending their reach for water and nutrients. About 90% of plant species depend on these fungal partnerships.",
    "Tampa Bay receives about 46 inches of rain per year, with 60% falling between June and September during the afternoon thunderstorm season.",
    "Mulch should be kept 2–3 inches away from tree trunks to prevent rot. This gap is called a 'mulch volcano' prevention zone.",
    "Florida's state tree, the Sabal palmetto (cabbage palm), can withstand hurricane-force winds because its trunk bends rather than breaks.",
    "The Zebra Longwing is Florida's state butterfly. It's unusual because adults can digest pollen (not just nectar), giving them a lifespan of up to 6 months.",
    "Native plants typically require 60% less water than non-native ornamentals once established, making them ideal for Florida's dry winters.",
    "Composting in Tampa's heat works fast — a well-maintained pile can produce usable compost in as little as 4–6 weeks during summer.",
    "The word 'garden' comes from Old English 'geard' meaning 'enclosure.' The Garden of Eden literally means 'enclosed delight.'",
    "Blanket flowers (Gaillardia) are one of the few wildflowers that thrive in pure Florida sand with virtually no amendments or irrigation.",
    "Lightning fixes atmospheric nitrogen into a form plants can absorb. Florida — the lightning capital of the US — gets a natural fertilizer boost with every storm.",
    "Resurrection fern (Pleopeltis polypodioides), common on Tampa Bay live oaks, can lose up to 97% of its water content and revive completely within hours of rain.",
    "The average garden soil contains more living organisms in a single tablespoon than there are people on Earth.",
    "Tampa Bay's mangrove forests are among the most productive ecosystems on the planet, generating more organic material per acre than most temperate forests.",
    "Coral honeysuckle (Lonicera sempervirens) is one of the best hummingbird plants for Tampa Bay — it blooms for months and never becomes invasive like Japanese honeysuckle.",
    "Florida scrub-jays, found near Tampa Bay, are the only bird species endemic to Florida. They depend on scrub habitat with saw palmetto and scrub oaks.",
    "Earthworms aren't native to Florida. The worms in Tampa gardens are introduced species — native soil organisms like beetle larvae and millipedes did the decomposition work first.",
    "The firebush (Hamelia patens) is one of the top butterfly-attracting plants in Florida, visited by at least 18 species of butterflies.",
    "pH matters: most Florida native plants prefer slightly acidic soil (pH 5.5–6.5). Tampa's sandy soils naturally tend toward this range.",
    "A single mature live oak can transpire over 40,000 gallons of water per year, cooling the surrounding air like a natural air conditioner.",
    "Muhly grass (Muhlenbergia capillaris) puts on its spectacular pink-purple display in October and November — one of the showiest native grasses in the Southeast.",
    "Florida's native wild coffee (Psychotria nervosa) is not in the same genus as commercial coffee but gets its name from similar-looking red berries.",
    "Dragonflies, common in Tampa Bay gardens, are among the most efficient predators on Earth — they catch up to 95% of the prey they pursue.",
    "The first botanical garden in the Americas was established in 1545 in Padua, Italy. It still exists today and is a UNESCO World Heritage Site.",
    "Rain barrels connected to a standard roof gutter can collect about 600 gallons of water from just one inch of rainfall on a 1,000-square-foot roof.",
    "Ladybugs (lady beetles) can eat up to 5,000 aphids in their lifetime, making them one of the most effective natural pest controls in any garden.",
    "Tampa Bay's subtropical climate means you can grow two or three successive vegetable crops per year — cool-season, warm-season, and a fall planting.",
    "Bald cypress trees in Florida can live for over 1,000 years. Their 'knees' that poke above water are thought to help with gas exchange and stability.",
    "Native wildflower meadows support 10 to 50 times more pollinators than manicured lawns of the same size.",
    "The term 'companion planting' goes back to Indigenous agricultural traditions. The 'Three Sisters' method (corn, beans, squash) is one of the oldest known examples.",
    "Florida's sandhill ecosystem, found in parts of Tampa Bay, features longleaf pines and wiregrass and depends on periodic fire to maintain its health.",
    "Sunflowers exhibit heliotropism — young flower heads track the sun across the sky during the day and reset east overnight. Mature heads face east permanently.",
    "A healthy square yard of garden soil can contain over 1,000 earthworms, 100,000 springtails, and millions of nematodes.",
    "The scent of freshly cut grass is actually a chemical distress signal — plants release volatile organic compounds to warn neighboring plants of damage.",
    "Simpson's stopper (Myrcianthes fragrans), a Tampa Bay native, produces tiny aromatic fruits that attract mockingbirds, catbirds, and cedar waxwings.",
    "Butterflies taste with their feet. When a butterfly lands on a flower, receptors on its legs detect sugars in the nectar.",
    "Native bunch grasses like wiregrass and muhly grass have root systems that can extend 6 feet deep, far outperforming sod grass for erosion control.",
    "The practice of 'chop and drop' mulching — cutting spent plants and leaving them where they fall — returns nutrients to the soil and mimics natural forest floor processes.",
    "Green anoles, the small lizards common in Tampa gardens, can change color from bright green to brown depending on temperature, stress, and social signals.",
    "Florida's rainy season (June–September) is when most native wildflowers and grasses put on their best growth. Plant them in early summer to let rain do the watering.",
    "Bat houses in Tampa Bay gardens can attract evening bats and Brazilian free-tailed bats. A single bat can eat 1,000 mosquitoes per hour.",
    "The oldest known cultivated garden is the Tomb Garden of Sennefer in ancient Egypt, dating to around 1400 BCE.",
    "Native beach sunflower (Helianthus debilis) is one of the best ground covers for sunny Florida gardens — it blooms year-round and tolerates salt, drought, and poor soil.",
    "Leaf cutter ants, sometimes seen in Tampa Bay, don't eat the leaves they cut. They use them to cultivate a fungus underground — they're fungus farmers.",
    "Passion fruit vine flowers have an elaborate structure that inspired early Spanish missionaries to name them after the Passion of Christ — the corona as the crown of thorns.",
    "The average American lawn uses 10 times more chemical pesticide per acre than farmland. Replacing even part of a lawn with natives eliminates this entirely.",
    "Tampa Bay's gulf breezes carry salt spray inland, which is why salt-tolerant natives like sea grape, beach sunflower, and railroad vine thrive near the coast.",
    "The world's largest organism is a honey fungus (Armillaria ostoyae) network spanning 2,385 acres in Oregon — the underground networks in your garden soil work on the same principle.",
    "Bromeliads, which grow naturally on Tampa Bay trees, are 'tank plants' — their overlapping leaves form cups that hold water, creating entire micro-ecosystems for frogs and insects.",
    "Morning dew is more than decoration: many plants, especially in Florida's dry winters, absorb moisture directly through their leaves from condensation.",
    "The concept of a 'butterfly garden' was popularized in the 1980s, but Indigenous peoples throughout the Americas had been managing pollinator habitat for thousands of years.",
];

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

function initWelcomeScreen() {
    const qi = getDailyIndex(GARDEN_QUOTES, 0);
    const fi = getDailyIndex(GARDEN_FACTS, 17);
    const q = GARDEN_QUOTES[qi];

    document.getElementById('welcome-greeting').textContent = getGreeting();
    document.getElementById('welcome-quote-text').textContent = q.text;
    document.getElementById('welcome-quote-attr').textContent = q.source
        ? `— ${q.author}, ${q.source}`
        : `— ${q.author}`;
    document.getElementById('welcome-fact-text').textContent = GARDEN_FACTS[fi];
}

function dismissWelcome() {
    document.getElementById('welcome-screen').classList.remove('active-screen');
    document.getElementById('tab-capture').classList.add('active-screen');
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.querySelector('.nav-label').textContent === 'Capture');
    });
}

// ── Auth ───────────────────────────────────────────────────────
sb.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    if (currentUser) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app').style.display = 'block';
        document.getElementById('settings-email').textContent = currentUser.email;
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

function showAuthTab(tab) {
    document.getElementById('signin-form').style.display = tab === 'signin' ? 'block' : 'none';
    document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
    document.getElementById('magic-form').style.display  = tab === 'magic'  ? 'block' : 'none';
    document.getElementById('reset-form').style.display  = tab === 'reset'  ? 'block' : 'none';
    document.getElementById('tab-signin').classList.toggle('active', tab === 'signin');
    document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
    document.getElementById('tab-magic').classList.toggle('active', tab === 'magic');
    setAuthMsg('', '');
}

function setAuthMsg(text, type) {
    const el = document.getElementById('auth-msg');
    el.textContent = text;
    el.className = 'auth-msg' + (type ? ' ' + type : '');
}

async function handleSignIn() {
    const email    = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    if (!email || !password) { setAuthMsg('Please enter email and password.', ''); return; }
    const btn = document.getElementById('signin-btn');
    btn.disabled = true; btn.textContent = 'Signing in...';
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setAuthMsg(error.message, ''); btn.disabled = false; btn.textContent = 'Sign in'; }
}

async function handleSignUp() {
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    if (!email || !password) { setAuthMsg('Please fill in all fields.', ''); return; }
    if (password.length < 6) { setAuthMsg('Password must be at least 6 characters.', ''); return; }
    const btn = document.getElementById('signup-btn');
    btn.disabled = true; btn.textContent = 'Creating...';
    const { error } = await sb.auth.signUp({ email, password });
    btn.disabled = false; btn.textContent = 'Create account';
    if (error) setAuthMsg(error.message, '');
    else setAuthMsg('Check your email to confirm your account, then sign in.', 'success');
}

let otpEmail = '';

async function handleSendCode() {
    const email = document.getElementById('magic-email').value.trim();
    if (!email) { setAuthMsg('Please enter your email.', ''); return; }
    const btn = document.getElementById('magic-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    const { error } = await sb.auth.signInWithOtp({ email });
    btn.disabled = false; btn.textContent = 'Send code';
    if (error) { setAuthMsg(error.message, ''); return; }
    otpEmail = email;
    document.getElementById('otp-section').style.display = 'block';
    document.getElementById('otp-code').focus();
    setAuthMsg('Code sent! Check your email.', 'success');
}

async function handleVerifyCode() {
    const code = document.getElementById('otp-code').value.trim();
    if (!code || code.length < 6) { setAuthMsg('Please enter the code from your email.', ''); return; }
    const btn = document.getElementById('otp-btn');
    btn.disabled = true; btn.textContent = 'Verifying...';
    const { error } = await sb.auth.verifyOtp({ email: otpEmail, token: code, type: 'email' });
    btn.disabled = false; btn.textContent = 'Verify code';
    if (error) setAuthMsg(error.message, '');
}

async function handlePasswordReset() {
    const email = document.getElementById('reset-email').value.trim();
    if (!email) { setAuthMsg('Please enter your email.', ''); return; }
    const btn = document.getElementById('reset-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
    btn.disabled = false; btn.textContent = 'Send reset link';
    if (error) setAuthMsg(error.message, '');
    else setAuthMsg('Check your email for a password reset link!', 'success');
}

async function handleSignOut() {
    await sb.auth.signOut();
}

// ── Navigation ─────────────────────────────────────────────────
function showScreen(name, btnEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active-screen');
    if (btnEl) btnEl.classList.add('active');
    document.getElementById('welcome-screen').classList.remove('active-screen');
}

// ── Photo capture ──────────────────────────────────────────────
function handlePhoto(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => renderPreview(e.target.result);
    reader.readAsDataURL(file);
    resetIdResults();
}

function renderPreview(src) {
    const canvas = document.getElementById('preview-canvas');
    const ctx    = canvas.getContext('2d');
    const img    = new Image();
    img.onload = () => {
        const max = 900;
        let w = img.width, h = img.height;
        if (w > h) { if (w > max) { h = h * max / w; w = max; } }
        else        { if (h > max) { w = w * max / h; h = max; } }
        canvas.width  = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.style.display = 'block';
        document.getElementById('capture-placeholder').style.display = 'none';
        document.getElementById('remove-btn').style.display = 'flex';
        document.getElementById('identify-btn').style.display = 'flex';
    };
    img.src = src;
}

function removeImage() {
    const canvas = document.getElementById('preview-canvas');
    canvas.style.display = 'none';
    document.getElementById('capture-placeholder').style.display = 'block';
    document.getElementById('remove-btn').style.display = 'none';
    document.getElementById('identify-btn').style.display = 'none';
    document.getElementById('camera-input').value  = '';
    document.getElementById('gallery-input').value = '';
    resetIdResults();
}

function resetIdResults() {
    pendingIdResults  = [];
    selectedIdIndex   = null;
    document.getElementById('id-results').style.display    = 'none';
    document.getElementById('id-cards').innerHTML          = '';
}

// ── Image upload ───────────────────────────────────────────────
async function uploadImage(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(async blob => {
            const path = `${currentUser.id}/${Date.now()}.jpg`;
            const { error } = await sb.storage.from('garden-images').upload(path, blob, { contentType: 'image/jpeg' });
            if (error) { reject(error); return; }
            const { data: { publicUrl } } = sb.storage.from('garden-images').getPublicUrl(path);
            resolve(publicUrl);
        }, 'image/jpeg', 0.82);
    });
}

// ── Temp image upload for identification ───────────────────────
async function uploadTempImage(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(async blob => {
            const path = `${currentUser.id}/temp_${Date.now()}.jpg`;
            const { error } = await sb.storage
                .from('garden-images')
                .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
            if (error) { reject(error); return; }
            const { data: { publicUrl } } = sb.storage
                .from('garden-images')
                .getPublicUrl(path);
            resolve(publicUrl);
        }, 'image/jpeg', 0.5);
    });
}

// ── Species identification via Supabase Edge Function ──────────
async function identifySpecies() {
    const canvas = document.getElementById('preview-canvas');
    if (canvas.style.display === 'none') { alert('Please take or upload a photo first.'); return; }

    const btn = document.getElementById('identify-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Identifying...';

    document.getElementById('id-results').style.display = 'block';
    document.getElementById('id-cards').innerHTML = `
        <div class="spinner-wrap">
            <div class="spinner"></div>
            <p class="spinner-label">Analyzing with Claude AI...</p>
        </div>`;

    try {
        const tempUrl = await uploadTempImage(canvas);

      const fnResponse = await fetch(
    SUPABASE_URL + '/functions/v1/identify-species',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ imageUrl: tempUrl }),
    }
);
const data = await fnResponse.json();
if (data.error) throw new Error(data.error);
if (!data?.identifications?.length) throw new Error('No species identified. Try a clearer photo.');

        const top3 = data.identifications.slice(0, 3).map(r => {
            const nativeMatch = matchNative(r.common, r.scientific);
            return {
                ...r,
                common:   nativeMatch?.name || r.common,
                bloom:    r.bloom || nativeMatch?.bloom || null,
                category: r.category || nativeMatch?.type || (r.type === 'plant' ? 'Plant' : 'Insect'),
                isNative: r.isNative || !!nativeMatch,
                source:   'Claude AI'
            };
        });

        pendingIdResults = top3;
        selectedIdIndex  = null;
        renderIdCards(top3);

    } catch (err) {
        document.getElementById('id-cards').innerHTML = `
            <div class="id-card" style="border-color:var(--terra)">
                <p style="color:var(--terra);font-weight:600;">Identification failed</p>
                <p style="font-size:0.85em;color:var(--ink-mid);margin-top:6px;">${err.message}</p>
            </div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">🔍</span> Identify species';
    }
}

// ── Identification result cards ────────────────────────────────
function renderIdCards(results) {
    const container = document.getElementById('id-cards');
    container.innerHTML = results.map((r, i) => `
        <div class="id-card ${i === 0 ? 'selected' : ''}" onclick="selectIdCard(${i})">
            <div style="display:flex;justify-content:space-between;align-items:start;">
                <div>
                    <div class="id-card-name">${r.common}</div>
                    <div class="id-card-sci">${r.scientific || ''}</div>
                </div>
                <span class="confidence-badge ${confidenceClass(r.confidence)}">${r.confidence}%</span>
            </div>
            <div class="id-card-desc">${r.description || ''}</div>
            <div class="id-card-tags">
                ${r.isNative ? '<span class="tag native">⭐ Native</span>' : ''}
                <span class="tag">${r.category || r.type}</span>
                ${r.bloom ? `<span class="tag season">🌸 ${r.bloom.join(', ')}</span>` : ''}
            </div>
        </div>
    `).join('');

    selectedIdIndex = 0;

    container.innerHTML += `
        <textarea id="id-notes" class="id-notes" placeholder="Add notes (optional)..." rows="2"></textarea>
        <button class="btn-primary" onclick="saveSelectedId()" style="width:100%;margin-top:8px;">
            <span class="btn-icon">💾</span> Save to garden
        </button>`;
}

function selectIdCard(index) {
    selectedIdIndex = index;
    document.querySelectorAll('.id-card').forEach((card, i) => {
        card.classList.toggle('selected', i === index);
    });
}

async function saveSelectedId() {
    if (selectedIdIndex === null || !pendingIdResults.length) return;

    const result = pendingIdResults[selectedIdIndex];
    const notes = (document.getElementById('id-notes')?.value || '').trim();
    const canvas = document.getElementById('preview-canvas');

    const btn = document.querySelector('#id-results .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const imageUrl = await uploadImage(canvas);
        const entry = buildEntry(result, imageUrl, notes);
        const { data: inserted, error } = await sb.from('inventory').insert(entry).select().single();
        if (error) throw error;

        alert(`${result.common} added to your garden!`);
        removeImage();
        await loadInventory();

        // Generate care profile in background (non-blocking)
        if (inserted && inserted.type === 'plant') {
            generateCareProfile(inserted.id, inserted.common, inserted.scientific, inserted.type, inserted.category);
        }
    } catch (err) {
        alert('Error saving: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">💾</span> Save to garden';
    }
}

function buildEntry(result, imageUrl, notes) {
    // Auto-populate tags from category
    const autoTags = [];
    if (result.category && PRESET_TAGS.includes(result.category)) {
        autoTags.push(result.category);
    }
    return {
        user_id:     currentUser.id,
        common:      result.common || '',
        scientific:  result.scientific || '',
        type:        result.type || 'plant',
        category:    result.category || '',
        confidence:  result.confidence || null,
        description: result.description || '',
        care:        result.care || null,
        bloom:       result.bloom || null,
        season:      result.season || null,
        is_native:   result.isNative || false,
        source:      result.source || 'Claude AI',
        image_url:   imageUrl || null,
        notes:       notes || '',
        tags:        autoTags,
    };
}

// ── Manual entry ───────────────────────────────────────────────
function openManualEntry() {
    ['manual-common','manual-scientific','manual-category','manual-notes'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('manual-type').value = 'plant';
    document.querySelectorAll('.bloom-check').forEach(cb => cb.checked = false);
    openModal('manual-modal');
}

async function saveManualEntry() {
    const common = document.getElementById('manual-common').value.trim();
    if (!common) { alert('Common name is required.'); return; }

    const scientific = document.getElementById('manual-scientific').value.trim();
    const type       = document.getElementById('manual-type').value;
    const category   = document.getElementById('manual-category').value.trim();
    const notes      = document.getElementById('manual-notes').value.trim();
    const bloom      = [...document.querySelectorAll('.bloom-check:checked')].map(cb => cb.value);

    const nativeMatch = matchNative(common, scientific);

    const result = {
        common:     nativeMatch?.name || common,
        scientific: scientific || nativeMatch?.scientific || '',
        type,
        category:   category || nativeMatch?.type || (type === 'plant' ? 'Plant' : 'Insect'),
        bloom:      bloom.length ? bloom : (nativeMatch?.bloom || null),
        season:     type === 'bug' ? ['Year-round'] : null,
        isNative:   !!nativeMatch,
        source:     'Manual'
    };

    const btn = document.querySelector('#manual-modal .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const entry = buildEntry(result, null, notes);
        const { data: inserted, error } = await sb.from('inventory').insert(entry).select().single();
        if (error) throw error;

        if (nativeMatch) alert(`Saved! ${result.common} is a Florida native plant.`);
        else alert(`${result.common} added to your garden.`);

        closeModal('manual-modal');
        await loadInventory();

        // Generate care profile in background (non-blocking)
        if (inserted && inserted.type === 'plant') {
            generateCareProfile(inserted.id, inserted.common, inserted.scientific, inserted.type, inserted.category);
        }
    } catch (err) {
        alert('Error saving: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save entry';
    }
}

// ── Inventory ──────────────────────────────────────────────────
async function loadInventory() {
    const { data, error } = await sb.from('inventory')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false });
    if (error) { console.error(error); return; }
    allInventory = data || [];
    updateStats();
    renderInventory();
    renderTimeline();
}

function updateStats() {
    document.getElementById('stat-plants').textContent  = allInventory.filter(i => i.type === 'plant').length;
    document.getElementById('stat-bugs').textContent    = allInventory.filter(i => i.type === 'bug').length;
    document.getElementById('stat-natives').textContent = allInventory.filter(i => i.is_native).length;
}

function handleSearch(val) {
    currentSearch = val.toLowerCase().trim();
    renderInventory();
}

function setFilter(filter, btnEl) {
    currentFilter = filter;
    document.querySelectorAll('.filter-row .chip').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderInventory();
}

function toggleTagFilter(tag) {
    const idx = activeTagFilters.indexOf(tag);
    if (idx === -1) activeTagFilters.push(tag);
    else activeTagFilters.splice(idx, 1);
    renderTagFilterDropdown();
    renderInventory();
}

function setLocationFilter(loc) {
    activeLocationFilter = activeLocationFilter === loc ? '' : loc;
    renderLocationFilterDropdown();
    renderInventory();
}

function setSort(sort) {
    currentSort = sort;
    renderInventory();
}

function getAllTags() {
    const tags = new Set();
    allInventory.forEach(i => (i.tags || []).forEach(t => tags.add(t)));
    return [...tags].sort();
}

function getAllLocations() {
    const locs = new Set();
    allInventory.forEach(i => { if (i.location) locs.add(i.location); });
    return [...locs].sort();
}

function renderTagFilterDropdown() {
    const el = document.getElementById('tag-filter-dropdown');
    if (!el) return;
    const tags = getAllTags();
    if (!tags.length) { el.innerHTML = '<p style="font-size:0.8em;color:var(--ink-light);padding:8px;">No tags yet</p>'; return; }
    el.innerHTML = tags.map(t =>
        `<button class="chip ${activeTagFilters.includes(t) ? 'active' : ''}" onclick="toggleTagFilter('${t}')" style="font-size:0.78em;">${t}</button>`
    ).join('');
}

function renderLocationFilterDropdown() {
    const el = document.getElementById('location-filter-dropdown');
    if (!el) return;
    const locs = getAllLocations();
    if (!locs.length) { el.innerHTML = '<p style="font-size:0.8em;color:var(--ink-light);padding:8px;">No locations yet</p>'; return; }
    el.innerHTML = locs.map(l =>
        `<button class="chip ${activeLocationFilter === l ? 'active' : ''}" onclick="setLocationFilter('${l}')" style="font-size:0.78em;">${l}</button>`
    ).join('');
}

function toggleFilterDropdown(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOpen = el.style.display !== 'none';
    // Close all dropdowns first
    document.querySelectorAll('.filter-dropdown').forEach(d => d.style.display = 'none');
    if (!isOpen) {
        el.style.display = 'flex';
        if (id === 'tag-filter-dropdown') renderTagFilterDropdown();
        if (id === 'location-filter-dropdown') renderLocationFilterDropdown();
    }
}

function renderInventory() {
    let items = [...allInventory];

    // Type/status filters
    if (currentFilter === 'plant')   items = items.filter(i => i.type === 'plant');
    if (currentFilter === 'bug')     items = items.filter(i => i.type === 'bug');
    if (currentFilter === 'native')  items = items.filter(i => i.is_native);
    if (currentFilter === 'blooming') {
        const season = getCurrentSeason();
        items = items.filter(i => i.bloom && (i.bloom.includes(season) || i.bloom.includes('Year-round')));
    }

    // Tag filters (AND: item must have all selected tags)
    if (activeTagFilters.length) {
        items = items.filter(i => activeTagFilters.every(t => (i.tags || []).includes(t)));
    }

    // Location filter
    if (activeLocationFilter) {
        items = items.filter(i => i.location === activeLocationFilter);
    }

    // Search
    if (currentSearch) {
        items = items.filter(i =>
            (i.common      || '').toLowerCase().includes(currentSearch) ||
            (i.scientific  || '').toLowerCase().includes(currentSearch) ||
            (i.category    || '').toLowerCase().includes(currentSearch) ||
            (i.notes       || '').toLowerCase().includes(currentSearch) ||
            (i.tags        || []).some(t => t.toLowerCase().includes(currentSearch)) ||
            (i.location    || '').toLowerCase().includes(currentSearch)
        );
    }

    // Sort
    if (currentSort === 'name-az') items.sort((a, b) => (a.common || '').localeCompare(b.common || ''));
    else if (currentSort === 'name-za') items.sort((a, b) => (b.common || '').localeCompare(a.common || ''));
    else if (currentSort === 'date-asc') items.sort((a, b) => new Date(a.date) - new Date(b.date));
    else if (currentSort === 'location') items.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
    // default: date-desc (already sorted from DB)

    const grid = document.getElementById('garden-grid');
    if (!items.length) {
        grid.innerHTML = `<div class="empty-state"><p>${currentSearch || currentFilter !== 'all' ? 'No matching entries.' : 'Your garden is empty.'}</p><p style="margin-top:4px;">${!currentSearch && currentFilter === 'all' ? 'Capture something to get started.' : ''}</p></div>`;
        return;
    }

    grid.innerHTML = '';
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'garden-card';
        card.onclick = () => showItemDetail(item);

        const imgEl = item.image_url
            ? `<img class="garden-card-img" src="${item.image_url}" alt="${item.common}" loading="lazy">`
            : `<div class="garden-card-img-placeholder">${item.type === 'plant' ? '🌿' : '🐛'}</div>`;

        const tags = [];
        if (item.is_native) tags.push('<span class="tag native" style="font-size:0.68em;padding:2px 7px;">⭐ Native</span>');
        if (item.tags && item.tags.length) tags.push(...item.tags.slice(0,2).map(t => `<span class="tag plant-tag" style="font-size:0.68em;padding:2px 7px;">${t}</span>`));
        if (item.bloom)     tags.push(`<span class="tag season" style="font-size:0.68em;padding:2px 7px;">🌸 ${item.bloom.slice(0,2).join(', ')}</span>`);
        if (item.location)  tags.push(`<span class="tag location-tag" style="font-size:0.68em;padding:2px 7px;">${item.location}</span>`);
        if (item.health && (item.health === 'stressed' || item.health === 'sick')) tags.push(`<span class="tag health-bad" style="font-size:0.68em;padding:2px 7px;">${item.health}</span>`);

        card.innerHTML = `
            ${imgEl}
            <div class="garden-card-info">
                <div class="garden-card-name">${item.common}</div>
                <div class="garden-card-sci">${item.scientific || ''}</div>
                <div class="garden-card-tags">${tags.join('')}</div>
            </div>`;
        grid.appendChild(card);
    });
}

// ── Item detail modal ──────────────────────────────────────────
function showItemDetail(item) {
    const body = document.getElementById('item-modal-body');

    const imgEl = item.image_url
        ? `<img class="detail-img" src="${item.image_url}" alt="${item.common}">`
        : `<div style="width:100%;height:160px;background:var(--cream-dark);border-radius:var(--radius);margin-bottom:16px;display:flex;align-items:center;justify-content:center;font-size:48px;">${item.type === 'plant' ? '🌿' : '🐛'}</div>`;

    const linkedPlantName = item.linked_plant_id === 'ground' ? 'Ground'
        : item.linked_plant_id ? (allInventory.find(p => p.id === item.linked_plant_id)?.common || null) : null;

    const rows = [
        ['Type', item.category || item.type],
        ['Location', item.location || null],
        linkedPlantName ? ['Found on', linkedPlantName] : null,
        ['Added', new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
        item.confidence ? ['ID confidence', item.confidence + '%'] : null,
        item.bloom   ? ['Blooming season', item.bloom.join(', ')] : null,
        item.season  ? ['Active season',   item.season.join(', ')] : null,
        item.care    ? ['Care',            item.care]              : null,
        item.source  ? ['Identified via',  item.source]           : null,
    ].filter(r => r && r[1]);

    const nativeBadge = item.is_native
        ? '<span class="tag native" style="display:inline-block;margin-bottom:12px;">⭐ Florida Native</span>'
        : '';

    const statusBadges = [];
    if (item.health) {
        const hClass = item.health === 'thriving' || item.health === 'healthy' ? 'health-good'
            : item.health === 'stressed' || item.health === 'sick' ? 'health-bad' : 'health-neutral';
        statusBadges.push(`<span class="tag ${hClass}">${item.health}</span>`);
    }
    if (item.flowering === 'yes') statusBadges.push('<span class="tag season">flowering</span>');
    if (item.flowering === 'budding') statusBadges.push('<span class="tag season">budding</span>');
    if (item.height) statusBadges.push(`<span class="tag" style="background:var(--cream-dark);color:var(--ink-mid);">${item.height}</span>`);

    body.innerHTML = `
        ${imgEl}
        <div class="detail-name">${item.common}</div>
        <div class="detail-sci">${item.scientific || ''}</div>
        ${nativeBadge}
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">${statusBadges.join('')}</div>
        ${rows.map(([k,v]) => `<div class="detail-row"><span class="detail-key">${k}</span><span class="detail-val">${v}</span></div>`).join('')}
        ${item.notes ? `<div class="detail-notes"><div class="detail-notes-label">Notes</div><div class="detail-notes-text">${item.notes}</div></div>` : ''}
        ${renderTagEditor(item)}
        ${item.type === 'bug' ? renderBugPlantLink(item) : ''}
        ${item.type === 'plant' ? renderPlantStatus(item) : ''}
        ${item.type === 'plant' ? renderLinkedBugs(item) : ''}
        ${renderCareProfile(item)}
        <div class="detail-delete">
            <button class="btn-danger" onclick="deleteItem('${item.id}', '${item.image_url || ''}')">Delete entry</button>
        </div>`;

    openModal('item-modal');
}

async function deleteItem(id, imageUrl) {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    const { error } = await sb.from('inventory').delete().eq('id', id).eq('user_id', currentUser.id);
    if (error) { alert('Error: ' + error.message); return; }
    if (imageUrl) {
        try {
            const path = imageUrl.split('/garden-images/')[1];
            if (path) await sb.storage.from('garden-images').remove([path]);
        } catch (e) { console.warn('Image delete failed:', e); }
    }
    closeModal('item-modal');
    await loadInventory();
}

// ── Timeline ───────────────────────────────────────────────────
function renderTimeline() {
    const seasons = ['Spring','Summer','Fall','Winter'];
    const container = document.getElementById('timeline-content');
    container.innerHTML = '';

    seasons.forEach(season => {
        const block = document.createElement('div');
        block.className = 'season-block';

        const bloomingPlants = allInventory.filter(i =>
            i.type === 'plant' && i.bloom &&
            (i.bloom.includes(season) || i.bloom.includes('Year-round'))
        );
        const activeInsects = allInventory.filter(i =>
            i.type === 'bug' && i.season &&
            (i.season.includes(season) || i.season.includes('Year-round'))
        );

        const entries = [
            ...bloomingPlants.map(p => `<div class="timeline-entry"><span class="timeline-icon">🌸</span><div><div class="timeline-name">${p.common}</div><div class="timeline-sci">${p.scientific || ''}</div></div></div>`),
            ...activeInsects.map(b => `<div class="timeline-entry"><span class="timeline-icon">🦋</span><div><div class="timeline-name">${b.common}</div><div class="timeline-sci">${b.scientific || ''}</div></div></div>`)
        ];

        block.innerHTML = `
            <div class="season-title">${season}</div>
            ${entries.length ? entries.join('') : '<p class="timeline-empty">Nothing logged yet for this season.</p>'}`;
        container.appendChild(block);
    });
}

// ── Export ─────────────────────────────────────────────────────
async function exportJSON() {
    const blob = new Blob([JSON.stringify({ version: '3.1', date: new Date().toISOString(), entries: allInventory }, null, 2)], { type: 'application/json' });
    download(blob, `garden-${today()}.json`);
}

async function exportCSV() {
    let csv = 'Common,Scientific,Type,Category,Date,Confidence,Bloom,Season,Native,Notes,Image URL\n';
    allInventory.forEach(i => {
        csv += `"${i.common}","${i.scientific}","${i.type}","${i.category}","${new Date(i.date).toLocaleDateString()}","${i.confidence || ''}","${(i.bloom||[]).join(', ')}","${(i.season||[]).join(', ')}","${i.is_native ? 'Yes':'No'}","${i.notes || ''}","${i.image_url || ''}"\n`;
    });
    download(new Blob([csv], { type: 'text/csv' }), `garden-${today()}.csv`);
}

function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

function today() { return new Date().toISOString().split('T')[0]; }

async function clearAllData() {
    if (!confirm('Delete ALL garden entries? This cannot be undone.')) return;
    const { error } = await sb.from('inventory').delete().eq('user_id', currentUser.id);
    if (error) { alert('Error: ' + error.message); return; }
    allInventory = [];
    updateStats();
    renderInventory();
    renderTimeline();
    alert('Garden cleared.');
}

// ── Native plant DB modal ──────────────────────────────────────
function showNativesDB() {
    const list = document.getElementById('natives-list');
    list.innerHTML = NATIVE_PLANTS.map(p => `
        <div class="native-item">
            <div class="native-item-name">${p.name}</div>
            <div class="native-item-sci">${p.scientific}</div>
            <div class="native-item-detail">${p.type} · Blooms: ${p.bloom.join(', ')}</div>
        </div>`).join('');
    openModal('natives-modal');
}

// ── Tag editor ────────────────────────────────────────────────
function renderTagEditor(item) {
    const currentTags = item.tags || [];
    const presetChips = PRESET_TAGS.map(t => {
        const active = currentTags.includes(t);
        return `<button class="tag-chip ${active ? 'active' : ''}" onclick="toggleTag('${item.id}', '${t}')">${t}</button>`;
    }).join('');

    const customTags = currentTags.filter(t => !PRESET_TAGS.includes(t));
    const customChips = customTags.map(t =>
        `<span class="tag-chip active">${t} <button onclick="removeTag('${item.id}', '${t}')" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 0 0 4px;font-size:1.1em;">&times;</button></span>`
    ).join('');

    return `
        <div class="tag-editor-section">
            <div class="care-profile-title" style="margin-bottom:8px;">Tags</div>
            <div class="tag-chips-row">${presetChips}</div>
            ${customChips ? `<div class="tag-chips-row" style="margin-top:6px;">${customChips}</div>` : ''}
            <div style="display:flex;gap:6px;margin-top:8px;">
                <input class="field" id="custom-tag-input" placeholder="Custom tag..." style="margin-bottom:0;flex:1;padding:8px 12px;">
                <button class="btn-secondary" onclick="addCustomTag('${item.id}')" style="padding:8px 14px;white-space:nowrap;">Add</button>
            </div>
        </div>`;
}

async function toggleTag(itemId, tag) {
    const idx = allInventory.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const item = allInventory[idx];
    let tags = [...(item.tags || [])];
    if (tags.includes(tag)) tags = tags.filter(t => t !== tag);
    else tags.push(tag);

    const { error } = await sb.from('inventory').update({ tags }).eq('id', itemId).eq('user_id', currentUser.id);
    if (error) { alert('Error: ' + error.message); return; }
    allInventory[idx].tags = tags;
    renderInventory();
    showItemDetail(allInventory[idx]);
}

async function removeTag(itemId, tag) {
    const idx = allInventory.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const tags = (allInventory[idx].tags || []).filter(t => t !== tag);

    const { error } = await sb.from('inventory').update({ tags }).eq('id', itemId).eq('user_id', currentUser.id);
    if (error) { alert('Error: ' + error.message); return; }
    allInventory[idx].tags = tags;
    renderInventory();
    showItemDetail(allInventory[idx]);
}

async function addCustomTag(itemId) {
    const input = document.getElementById('custom-tag-input');
    const tag = input.value.trim();
    if (!tag) return;
    const idx = allInventory.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const tags = [...(allInventory[idx].tags || [])];
    if (tags.includes(tag)) { input.value = ''; return; }
    tags.push(tag);

    const { error } = await sb.from('inventory').update({ tags }).eq('id', itemId).eq('user_id', currentUser.id);
    if (error) { alert('Error: ' + error.message); return; }
    allInventory[idx].tags = tags;
    input.value = '';
    renderInventory();
    showItemDetail(allInventory[idx]);
}

// ── Bug ↔ Plant linking ───────────────────────────────────────
function renderBugPlantLink(item) {
    const plants = allInventory.filter(i => i.type === 'plant');
    const currentVal = item.linked_plant_id || '';
    const linkedPlant = currentVal === 'ground' ? null : plants.find(p => p.id === currentVal);
    const displayText = currentVal === 'ground' ? 'Ground'
        : linkedPlant ? linkedPlant.common : '';

    let optionsHtml = '<option value="">-- None --</option>';
    optionsHtml += `<option value="ground" ${currentVal === 'ground' ? 'selected' : ''}>Ground</option>`;
    plants.sort((a, b) => a.common.localeCompare(b.common)).forEach(p => {
        optionsHtml += `<option value="${p.id}" ${currentVal === p.id ? 'selected' : ''}>${p.common}</option>`;
    });

    return `
        <div class="plant-status-section">
            <div class="plant-status-header" onclick="toggleBugPlantLink()">
                <h3 class="care-profile-title">Found On</h3>
                <span style="font-size:0.82em;color:var(--ink-mid);">${displayText ? displayText + ' ' : ''}<span class="care-toggle" id="bug-link-toggle-icon">▶</span></span>
            </div>
            <div id="bug-plant-link-body" style="display:none;">
                <label class="field-label">Plant or location</label>
                <select class="field" id="bug-plant-select">
                    ${optionsHtml}
                </select>
                <button class="btn-primary" id="save-bug-link-btn" onclick="saveBugPlantLink('${item.id}')" style="margin-top:8px;">Save</button>
            </div>
        </div>`;
}

function toggleBugPlantLink() {
    const body = document.getElementById('bug-plant-link-body');
    const icon = document.getElementById('bug-link-toggle-icon');
    if (!body) return;
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (icon) icon.textContent = isHidden ? '▼' : '▶';
}

async function saveBugPlantLink(itemId) {
    const val = document.getElementById('bug-plant-select').value || null;
    const btn = document.getElementById('save-bug-link-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const { error } = await sb.from('inventory')
            .update({ linked_plant_id: val })
            .eq('id', itemId)
            .eq('user_id', currentUser.id);
        if (error) throw error;

        const idx = allInventory.findIndex(i => i.id === itemId);
        if (idx !== -1) allInventory[idx].linked_plant_id = val;

        btn.textContent = 'Saved!';
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'Save';
        }, 1500);
        renderInventory();
    } catch (err) {
        alert('Error saving: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

function renderLinkedBugs(item) {
    const bugs = allInventory.filter(i => i.type === 'bug' && i.linked_plant_id === item.id);
    if (!bugs.length) return '';

    return `
        <div class="plant-status-section">
            <div class="detail-notes-label" style="margin-bottom:8px;">Insects found on this plant</div>
            ${bugs.map(b => `
                <div class="linked-bug-row" onclick="showItemDetail(allInventory.find(i=>i.id==='${b.id}'))">
                    <span class="linked-bug-icon">🐛</span>
                    <span class="linked-bug-name">${b.common}</span>
                    ${b.scientific ? `<span class="linked-bug-sci">${b.scientific}</span>` : ''}
                </div>
            `).join('')}
        </div>`;
}

// ── Plant status tracking ─────────────────────────────────────
function renderPlantStatus(item) {
    return `
        <div class="plant-status-section">
            <div class="plant-status-header" onclick="togglePlantStatus()">
                <h3 class="care-profile-title">Plant Status</h3>
                <span class="care-toggle" id="status-toggle-icon">▶</span>
            </div>
            <div class="plant-status-body" id="plant-status-body" style="display:none;">
                <label class="field-label">Health</label>
                <select class="field" id="status-health">
                    <option value="">-- Select --</option>
                    <option value="thriving" ${item.health === 'thriving' ? 'selected' : ''}>Thriving</option>
                    <option value="healthy" ${item.health === 'healthy' ? 'selected' : ''}>Healthy</option>
                    <option value="stressed" ${item.health === 'stressed' ? 'selected' : ''}>Stressed</option>
                    <option value="sick" ${item.health === 'sick' ? 'selected' : ''}>Sick</option>
                    <option value="dormant" ${item.health === 'dormant' ? 'selected' : ''}>Dormant</option>
                    <option value="new" ${item.health === 'new' ? 'selected' : ''}>Newly planted</option>
                </select>

                <label class="field-label">Flowering</label>
                <select class="field" id="status-flowering">
                    <option value="">-- Select --</option>
                    <option value="yes" ${item.flowering === 'yes' ? 'selected' : ''}>Yes, flowering</option>
                    <option value="budding" ${item.flowering === 'budding' ? 'selected' : ''}>Budding</option>
                    <option value="no" ${item.flowering === 'no' ? 'selected' : ''}>Not flowering</option>
                    <option value="fruiting" ${item.flowering === 'fruiting' ? 'selected' : ''}>Fruiting</option>
                </select>

                <label class="field-label">Height</label>
                <input class="field" id="status-height" placeholder="e.g. 3 feet, 18 inches" value="${item.height || ''}">

                <label class="field-label">Location</label>
                <div class="tag-chips-row" style="margin-bottom:4px;">
                    ${LOCATION_ZONES.map(z => `<button class="tag-chip loc-zone-chip ${parseLocation(item.location).zone === z ? 'active' : ''}" data-val="${z}" onclick="setLocationZone('${item.id}', '${z}')">${z}</button>`).join('')}
                </div>
                <label class="field-label" style="margin-top:6px;">Habitat</label>
                <div class="tag-chips-row">
                    ${LOCATION_HABITATS.map(h => `<button class="tag-chip loc-habitat-chip ${parseLocation(item.location).habitat === h ? 'active' : ''}" data-val="${h}" onclick="setLocationHabitat('${item.id}', '${h}')">${h}</button>`).join('')}
                </div>

                <label class="field-label">Features / observations</label>
                <textarea class="field" id="status-features" rows="3" placeholder="e.g. Attracting pollinators, new growth, needs staking...">${item.features || ''}</textarea>

                <button class="btn-primary" id="save-status-btn" onclick="savePlantStatus('${item.id}')" style="margin-top:10px;">Save status</button>
            </div>
        </div>`;
}

function togglePlantStatus() {
    const body = document.getElementById('plant-status-body');
    const icon = document.getElementById('status-toggle-icon');
    if (!body) return;
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (icon) icon.textContent = isHidden ? '▼' : '▶';
}

// Parse location string like "Front, Hammock" into { zone, habitat }
function parseLocation(loc) {
    if (!loc) return { zone: '', habitat: '' };
    const parts = loc.split(',').map(s => s.trim());
    let zone = '', habitat = '';
    for (const p of parts) {
        if (LOCATION_ZONES.includes(p)) zone = p;
        else if (LOCATION_HABITATS.includes(p)) habitat = p;
    }
    return { zone, habitat };
}

function buildLocation(zone, habitat) {
    return [zone, habitat].filter(Boolean).join(', ');
}

function setLocationZone(itemId, zone) {
    const idx = allInventory.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const parsed = parseLocation(allInventory[idx].location);
    parsed.zone = parsed.zone === zone ? '' : zone;
    allInventory[idx].location = buildLocation(parsed.zone, parsed.habitat);
    // Update chips visually
    document.querySelectorAll('.loc-zone-chip').forEach(c => c.classList.toggle('active', c.dataset.val === parsed.zone));
}

function setLocationHabitat(itemId, habitat) {
    const idx = allInventory.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const parsed = parseLocation(allInventory[idx].location);
    parsed.habitat = parsed.habitat === habitat ? '' : habitat;
    allInventory[idx].location = buildLocation(parsed.zone, parsed.habitat);
    // Update chips visually
    document.querySelectorAll('.loc-habitat-chip').forEach(c => c.classList.toggle('active', c.dataset.val === parsed.habitat));
}

async function savePlantStatus(itemId) {
    const health    = document.getElementById('status-health').value || null;
    const flowering = document.getElementById('status-flowering').value || null;
    const height    = document.getElementById('status-height').value.trim() || null;
    const features  = document.getElementById('status-features').value.trim() || null;
    const idx       = allInventory.findIndex(i => i.id === itemId);
    const location  = idx !== -1 ? (allInventory[idx].location || null) : null;

    const btn = document.getElementById('save-status-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const { error } = await sb.from('inventory')
            .update({ health, flowering, height, location, features })
            .eq('id', itemId)
            .eq('user_id', currentUser.id);

        if (error) throw error;

        // Update local cache
        const idx = allInventory.findIndex(i => i.id === itemId);
        if (idx !== -1) {
            Object.assign(allInventory[idx], { health, flowering, height, location, features });
        }

        btn.textContent = 'Saved!';
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'Save status';
        }, 1500);

        renderInventory();
    } catch (err) {
        alert('Error saving status: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Save status';
    }
}

// ── Care profile generation ───────────────────────────────────
async function generateCareProfile(itemId, common, scientific, type, category) {
    if (type !== 'plant') return null;

    try {
        const response = await fetch(
            SUPABASE_URL + '/functions/v1/garden-assistant',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                    action: 'care_profile',
                    data: { common, scientific, type, category }
                }),
            }
        );

        const result = await response.json();
        if (result.error) throw new Error(result.error);
        if (!result.care_profile) return null;

        const { error } = await sb.from('inventory')
            .update({ care_profile: result.care_profile })
            .eq('id', itemId)
            .eq('user_id', currentUser.id);

        if (error) console.error('Failed to save care profile:', error);

        // Update local cache
        const idx = allInventory.findIndex(i => i.id === itemId);
        if (idx !== -1) allInventory[idx].care_profile = result.care_profile;

        return result.care_profile;
    } catch (err) {
        console.error('Care profile generation failed:', err);
        return null;
    }
}

async function refreshCareProfile(itemId) {
    const item = allInventory.find(i => i.id === itemId);
    if (!item) return;

    const section = document.getElementById('care-profile-section');
    if (section) {
        section.innerHTML = `
            <div class="care-profile-header" style="margin-bottom:12px;">
                <h3 class="care-profile-title">Care Profile</h3>
            </div>
            <div class="spinner-wrap" style="padding:16px 0;">
                <div class="spinner"></div>
                <p class="spinner-label">Generating care profile...</p>
            </div>`;
    }

    const profile = await generateCareProfile(item.id, item.common, item.scientific, item.type, item.category);
    if (profile) {
        showItemDetail(item);
    } else {
        if (section) {
            section.innerHTML = `
                <div class="care-profile-header">
                    <h3 class="care-profile-title">Care Profile</h3>
                </div>
                <p style="color:var(--terra);font-size:0.85em;">Failed to generate care profile. Try again later.</p>
                <button class="btn-secondary" onclick="refreshCareProfile('${itemId}')" style="margin-top:8px;font-size:0.85em;">Retry</button>`;
        }
    }
}

function renderCareProfile(item) {
    if (item.type !== 'plant') return '';

    const cp = item.care_profile;

    if (!cp) {
        return `
            <div id="care-profile-section" class="care-profile-section">
                <div class="care-profile-header">
                    <h3 class="care-profile-title">Care Profile</h3>
                </div>
                <p style="color:var(--ink-light);font-size:0.85em;margin-bottom:8px;">No care profile yet.</p>
                <button class="btn-secondary" onclick="refreshCareProfile('${item.id}')" style="font-size:0.85em;">Generate care profile</button>
            </div>`;
    }

    const sections = [];

    // Watering
    if (cp.watering) {
        sections.push(`
            <div class="care-item">
                <span class="care-icon">💧</span>
                <div>
                    <div class="care-label">Watering</div>
                    <div class="care-value">${cp.watering.frequency || ''}</div>
                    ${cp.watering.notes ? `<div class="care-note">${cp.watering.notes}</div>` : ''}
                </div>
            </div>`);
    }

    // Sun
    if (cp.sun) {
        sections.push(`
            <div class="care-item">
                <span class="care-icon">☀️</span>
                <div>
                    <div class="care-label">Sun</div>
                    <div class="care-value">${cp.sun}</div>
                </div>
            </div>`);
    }

    // Soil
    if (cp.soil) {
        sections.push(`
            <div class="care-item">
                <span class="care-icon">🪴</span>
                <div>
                    <div class="care-label">Soil</div>
                    <div class="care-value">${cp.soil}</div>
                </div>
            </div>`);
    }

    // Fertilizing
    if (cp.fertilizing) {
        sections.push(`
            <div class="care-item">
                <span class="care-icon">🧪</span>
                <div>
                    <div class="care-label">Fertilizing</div>
                    <div class="care-value">${cp.fertilizing.schedule || ''}</div>
                    ${cp.fertilizing.type ? `<div class="care-note">Type: ${cp.fertilizing.type}</div>` : ''}
                </div>
            </div>`);
    }

    // Pruning
    if (cp.pruning) {
        sections.push(`
            <div class="care-item">
                <span class="care-icon">✂️</span>
                <div>
                    <div class="care-label">Pruning</div>
                    <div class="care-value">${cp.pruning.timing || ''}</div>
                    ${cp.pruning.method ? `<div class="care-note">${cp.pruning.method}</div>` : ''}
                </div>
            </div>`);
    }

    // Mature size
    if (cp.mature_size) {
        sections.push(`
            <div class="care-item">
                <span class="care-icon">📏</span>
                <div>
                    <div class="care-label">Mature Size</div>
                    <div class="care-value">Height: ${cp.mature_size.height || 'N/A'} · Spread: ${cp.mature_size.spread || 'N/A'}</div>
                </div>
            </div>`);
    }

    // Pests
    if (cp.pests && cp.pests.length) {
        sections.push(`
            <div class="care-item">
                <span class="care-icon">🐛</span>
                <div>
                    <div class="care-label">Pests & Diseases</div>
                    <div class="care-value">${cp.pests.join(', ')}</div>
                </div>
            </div>`);
    }

    // Companions
    if (cp.companions && cp.companions.length) {
        sections.push(`
            <div class="care-item">
                <span class="care-icon">🌱</span>
                <div>
                    <div class="care-label">Companion Plants</div>
                    <div class="care-value">${cp.companions.join(', ')}</div>
                </div>
            </div>`);
    }

    return `
        <div id="care-profile-section" class="care-profile-section">
            <div class="care-profile-header" onclick="toggleCareProfile()">
                <h3 class="care-profile-title">Care Profile</h3>
                <span class="care-toggle" id="care-toggle-icon">▼</span>
            </div>
            <div class="care-profile-body" id="care-profile-body">
                ${sections.join('')}
                <button class="btn-secondary" onclick="refreshCareProfile('${item.id}')" style="margin-top:12px;font-size:0.85em;width:100%;">Refresh care info</button>
            </div>
        </div>`;
}

function toggleCareProfile() {
    const body = document.getElementById('care-profile-body');
    const icon = document.getElementById('care-toggle-icon');
    if (!body) return;
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (icon) icon.textContent = isHidden ? '▼' : '▶';
}

// ── Modal helpers ──────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    document.body.style.overflow = '';
}
