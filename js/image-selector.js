/**
 * image-selector.js
 *
 * Image Selection Modal for MotionMaker
 * Handles image selection and custom URLs with categorized images
 *
 * Dependencies:
 * - Global variables: imageCategories object
 * - Functions: addLayer(), showToast(), saveState()
 */

// Helper function to create emoji SVG data URL
// Uses URL encoding instead of base64 to support Unicode emojis
function createEmojiUrl(emoji) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text y="70" font-size="80">${emoji}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Categorized images - using emoji as data URLs for reliability
const imageCategories = {
    'Animals': [
        { name: 'Cat', emoji: '🐱' },
        { name: 'Dog', emoji: '🐶' },
        { name: 'Bear', emoji: '🐻' },
        { name: 'Panda', emoji: '🐼' },
        { name: 'Koala', emoji: '🐨' },
        { name: 'Tiger', emoji: '🐯' },
        { name: 'Lion', emoji: '🦁' },
        { name: 'Cow', emoji: '🐮' },
        { name: 'Pig', emoji: '🐷' },
        { name: 'Mouse', emoji: '🐭' },
        { name: 'Hamster', emoji: '🐹' },
        { name: 'Rabbit', emoji: '🐰' },
        { name: 'Fox', emoji: '🦊' },
        { name: 'Wolf', emoji: '🐺' },
        { name: 'Monkey', emoji: '🐵' },
        { name: 'Chicken', emoji: '🐔' },
        { name: 'Penguin', emoji: '🐧' },
        { name: 'Bird', emoji: '🐦' },
        { name: 'Eagle', emoji: '🦅' },
        { name: 'Owl', emoji: '🦉' },
        { name: 'Duck', emoji: '🦆' },
        { name: 'Swan', emoji: '🦢' },
        { name: 'Frog', emoji: '🐸' },
        { name: 'Turtle', emoji: '🐢' },
        { name: 'Lizard', emoji: '🦎' },
        { name: 'Snake', emoji: '🐍' },
        { name: 'Dragon', emoji: '🐉' },
        { name: 'Whale', emoji: '🐋' },
        { name: 'Dolphin', emoji: '🐬' },
        { name: 'Fish', emoji: '🐟' },
        { name: 'Tropical Fish', emoji: '🐠' },
        { name: 'Octopus', emoji: '🐙' },
        { name: 'Crab', emoji: '🦀' },
        { name: 'Butterfly', emoji: '🦋' },
        { name: 'Bee', emoji: '🐝' },
        { name: 'Ladybug', emoji: '🐞' },
        { name: 'Snail', emoji: '🐌' },
        { name: 'Spider', emoji: '🕷️' },
        { name: 'Unicorn', emoji: '🦄' }
    ],
    'Food & Drinks': [
        { name: 'Apple', emoji: '🍎' },
        { name: 'Orange', emoji: '🍊' },
        { name: 'Lemon', emoji: '🍋' },
        { name: 'Banana', emoji: '🍌' },
        { name: 'Watermelon', emoji: '🍉' },
        { name: 'Grapes', emoji: '🍇' },
        { name: 'Strawberry', emoji: '🍓' },
        { name: 'Cherry', emoji: '🍒' },
        { name: 'Peach', emoji: '🍑' },
        { name: 'Pineapple', emoji: '🍍' },
        { name: 'Coconut', emoji: '🥥' },
        { name: 'Avocado', emoji: '🥑' },
        { name: 'Carrot', emoji: '🥕' },
        { name: 'Corn', emoji: '🌽' },
        { name: 'Pizza', emoji: '🍕' },
        { name: 'Hamburger', emoji: '🍔' },
        { name: 'Hot Dog', emoji: '🌭' },
        { name: 'Taco', emoji: '🌮' },
        { name: 'Burrito', emoji: '🌯' },
        { name: 'Sandwich', emoji: '🥪' },
        { name: 'Bread', emoji: '🍞' },
        { name: 'Croissant', emoji: '🥐' },
        { name: 'Cake', emoji: '🍰' },
        { name: 'Birthday Cake', emoji: '🎂' },
        { name: 'Cupcake', emoji: '🧁' },
        { name: 'Cookie', emoji: '🍪' },
        { name: 'Donut', emoji: '🍩' },
        { name: 'Chocolate', emoji: '🍫' },
        { name: 'Candy', emoji: '🍬' },
        { name: 'Lollipop', emoji: '🍭' },
        { name: 'Ice Cream', emoji: '🍦' },
        { name: 'Shaved Ice', emoji: '🍧' },
        { name: 'Coffee', emoji: '☕' },
        { name: 'Tea', emoji: '🍵' },
        { name: 'Milk', emoji: '🥛' },
        { name: 'Juice', emoji: '🧃' },
        { name: 'Soda', emoji: '🥤' }
    ],
    'Nature': [
        { name: 'Flower', emoji: '🌸' },
        { name: 'Blossom', emoji: '🌼' },
        { name: 'Sunflower', emoji: '🌻' },
        { name: 'Rose', emoji: '🌹' },
        { name: 'Tulip', emoji: '🌷' },
        { name: 'Hibiscus', emoji: '🌺' },
        { name: 'Tree', emoji: '🌲' },
        { name: 'Deciduous Tree', emoji: '🌳' },
        { name: 'Palm Tree', emoji: '🌴' },
        { name: 'Cactus', emoji: '🌵' },
        { name: 'Leaf', emoji: '🍃' },
        { name: 'Maple Leaf', emoji: '🍁' },
        { name: 'Mushroom', emoji: '🍄' },
        { name: 'Earth', emoji: '🌍' },
        { name: 'Mountain', emoji: '⛰️' },
        { name: 'Volcano', emoji: '🌋' },
        { name: 'Beach', emoji: '🏖️' },
        { name: 'Desert', emoji: '🏜️' }
    ],
    'Weather': [
        { name: 'Sun', emoji: '☀️' },
        { name: 'Cloud', emoji: '☁️' },
        { name: 'Rain Cloud', emoji: '🌧️' },
        { name: 'Storm', emoji: '⛈️' },
        { name: 'Lightning', emoji: '⚡' },
        { name: 'Snowflake', emoji: '❄️' },
        { name: 'Snowman', emoji: '⛄' },
        { name: 'Comet', emoji: '☄️' },
        { name: 'Rainbow', emoji: '🌈' },
        { name: 'Moon', emoji: '🌙' },
        { name: 'Star', emoji: '⭐' },
        { name: 'Sparkles', emoji: '✨' },
        { name: 'Fire', emoji: '🔥' },
        { name: 'Droplet', emoji: '💧' },
        { name: 'Wave', emoji: '🌊' }
    ],
    'Seasons': [
        // Spring
        { name: 'Cherry Blossom', emoji: '🌸' },
        { name: 'Tulip', emoji: '🌷' },
        { name: 'Hibiscus', emoji: '🌺' },
        { name: 'Sunflower', emoji: '🌻' },
        { name: 'Blossom', emoji: '🌼' },
        { name: 'Seedling', emoji: '🌱' },
        { name: 'Sprout', emoji: '🌿' },
        { name: 'Four Leaf Clover', emoji: '🍀' },
        { name: 'Bee', emoji: '🐝' },
        { name: 'Butterfly', emoji: '🦋' },
        { name: 'Lady Bug', emoji: '🐞' },
        { name: 'Rainbow', emoji: '🌈' },
        { name: 'Umbrella', emoji: '☂️' },
        { name: 'Rain', emoji: '🌧️' },
        { name: 'Droplet', emoji: '💧' },
        { name: 'Baby Chick', emoji: '🐤' },
        { name: 'Hatching Chick', emoji: '🐣' },
        { name: 'Nest with Eggs', emoji: '🪺' },
        // Summer
        { name: 'Sun', emoji: '☀️' },
        { name: 'Sunglasses', emoji: '🕶️' },
        { name: 'Beach Umbrella', emoji: '⛱️' },
        { name: 'Beach', emoji: '🏖️' },
        { name: 'Palm Tree', emoji: '🌴' },
        { name: 'Coconut', emoji: '🥥' },
        { name: 'Watermelon', emoji: '🍉' },
        { name: 'Ice Cream', emoji: '🍦' },
        { name: 'Shaved Ice', emoji: '🍧' },
        { name: 'Popsicle', emoji: '🍭' },
        { name: 'Tropical Drink', emoji: '🍹' },
        { name: 'Surfing', emoji: '🏄' },
        { name: 'Swimming', emoji: '🏊' },
        { name: 'Shorts', emoji: '🩳' },
        { name: 'Sandal', emoji: '🩴' },
        { name: 'Camping', emoji: '🏕️' },
        { name: 'Tent', emoji: '⛺' },
        { name: 'Campfire', emoji: '🔥' },
        { name: 'Fireworks', emoji: '🎆' },
        { name: 'Sparkler', emoji: '🎇' },
        // Fall/Autumn
        { name: 'Fallen Leaf', emoji: '🍂' },
        { name: 'Maple Leaf', emoji: '🍁' },
        { name: 'Jack-O-Lantern', emoji: '🎃' },
        { name: 'Ghost', emoji: '👻' },
        { name: 'Spider', emoji: '🕷️' },
        { name: 'Spider Web', emoji: '🕸️' },
        { name: 'Bat', emoji: '🦇' },
        { name: 'Black Cat', emoji: '🐈‍⬛' },
        { name: 'Candy', emoji: '🍬' },
        { name: 'Apple', emoji: '🍎' },
        { name: 'Grapes', emoji: '🍇' },
        { name: 'Pear', emoji: '🍐' },
        { name: 'Corn', emoji: '🌽' },
        { name: 'Chestnut', emoji: '🌰' },
        { name: 'Mushroom', emoji: '🍄' },
        { name: 'Acorn', emoji: '🌰' },
        { name: 'Turkey', emoji: '🦃' },
        { name: 'Pie', emoji: '🥧' },
        { name: 'Hot Beverage', emoji: '☕' },
        { name: 'Squirrel', emoji: '🐿️' },
        { name: 'Hedgehog', emoji: '🦔' },
        { name: 'Raccoon', emoji: '🦝' },
        { name: 'Owl', emoji: '🦉' },
        { name: 'Wind Face', emoji: '🌬️' },
        { name: 'Fog', emoji: '🌫️' },
        { name: 'Cloud', emoji: '☁️' },
        // Winter
        { name: 'Snowflake', emoji: '❄️' },
        { name: 'Snowman', emoji: '⛄' },
        { name: 'Snowman Without Snow', emoji: '☃️' },
        { name: 'Snow-Capped Mountain', emoji: '🏔️' },
        { name: 'Skier', emoji: '⛷️' },
        { name: 'Snowboarder', emoji: '🏂' },
        { name: 'Ice Skate', emoji: '⛸️' },
        { name: 'Sled', emoji: '🛷' },
        { name: 'Christmas Tree', emoji: '🎄' },
        { name: 'Santa', emoji: '🎅' },
        { name: 'Mrs. Claus', emoji: '🤶' },
        { name: 'Elf', emoji: '🧝' },
        { name: 'Reindeer', emoji: '🦌' },
        { name: 'Wrapped Gift', emoji: '🎁' },
        { name: 'Ribbon', emoji: '🎀' },
        { name: 'Bell', emoji: '🔔' },
        { name: 'Snowglobe', emoji: '🎄' },
        { name: 'Candle', emoji: '🕯️' },
        { name: 'Fireplace', emoji: '🔥' },
        { name: 'Hot Chocolate', emoji: '☕' },
        { name: 'Soup', emoji: '🍲' },
        { name: 'Mittens', emoji: '🧤' },
        { name: 'Scarf', emoji: '🧣' },
        { name: 'Coat', emoji: '🧥' },
        { name: 'Boot', emoji: '🥾' },
        { name: 'Penguin', emoji: '🐧' },
        { name: 'Polar Bear', emoji: '🐻‍❄️' },
        { name: 'Seal', emoji: '🦭' },
        { name: 'Moon', emoji: '🌙' },
        { name: 'Stars', emoji: '✨' },
        { name: 'Comet', emoji: '☄️' }
    ],
    'Objects': [
        { name: 'Trophy', emoji: '🏆' },
        { name: 'Medal', emoji: '🏅' },
        { name: 'Crown', emoji: '👑' },
        { name: 'Diamond', emoji: '💎' },
        { name: 'Ring', emoji: '💍' },
        { name: 'Gem', emoji: '💠' },
        { name: 'Gift', emoji: '🎁' },
        { name: 'Balloon', emoji: '🎈' },
        { name: 'Party Popper', emoji: '🎉' },
        { name: 'Confetti', emoji: '🎊' },
        { name: 'Magic Wand', emoji: '🪄' },
        { name: 'Crystal Ball', emoji: '🔮' },
        { name: 'Key', emoji: '🔑' },
        { name: 'Lock', emoji: '🔒' },
        { name: 'Bomb', emoji: '💣' },
        { name: 'Scissors', emoji: '✂️' },
        { name: 'Hammer', emoji: '🔨' },
        { name: 'Wrench', emoji: '🔧' },
        { name: 'Gear', emoji: '⚙️' },
        { name: 'Magnet', emoji: '🧲' },
        { name: 'Light Bulb', emoji: '💡' },
        { name: 'Flashlight', emoji: '🔦' },
        { name: 'Candle', emoji: '🕯️' },
        { name: 'Book', emoji: '📖' },
        { name: 'Notebook', emoji: '📓' },
        { name: 'Pencil', emoji: '✏️' },
        { name: 'Paintbrush', emoji: '🖌️' },
        { name: 'Camera', emoji: '📷' },
        { name: 'Movie Camera', emoji: '🎥' },
        { name: 'Telephone', emoji: '📞' },
        { name: 'Computer', emoji: '💻' },
        { name: 'Keyboard', emoji: '⌨️' },
        { name: 'Joystick', emoji: '🕹️' },
        { name: 'Battery', emoji: '🔋' },
        { name: 'Hourglass', emoji: '⏳' },
        { name: 'Clock', emoji: '⏰' }
    ],
    'Sports': [
        { name: 'Soccer Ball', emoji: '⚽' },
        { name: 'Basketball', emoji: '🏀' },
        { name: 'Football', emoji: '🏈' },
        { name: 'Baseball', emoji: '⚾' },
        { name: 'Tennis', emoji: '🎾' },
        { name: 'Volleyball', emoji: '🏐' },
        { name: 'Bowling', emoji: '🎳' },
        { name: 'Golf', emoji: '⛳' },
        { name: '8-Ball', emoji: '🎱' },
        { name: 'Ping Pong', emoji: '🏓' },
        { name: 'Badminton', emoji: '🏸' },
        { name: 'Hockey', emoji: '🏒' },
        { name: 'Boxing Glove', emoji: '🥊' },
        { name: 'Skateboard', emoji: '🛹' },
        { name: 'Sled', emoji: '🛷' },
        { name: 'Skis', emoji: '🎿' },
        { name: 'Swimming', emoji: '🏊' },
        { name: 'Surfing', emoji: '🏄' },
        { name: 'Fishing', emoji: '🎣' },
        { name: 'Dart', emoji: '🎯' }
    ],
    'Vehicles': [
        { name: 'Car', emoji: '🚗' },
        { name: 'Taxi', emoji: '🚕' },
        { name: 'Bus', emoji: '🚌' },
        { name: 'Truck', emoji: '🚚' },
        { name: 'Fire Engine', emoji: '🚒' },
        { name: 'Police Car', emoji: '🚓' },
        { name: 'Ambulance', emoji: '🚑' },
        { name: 'Bicycle', emoji: '🚲' },
        { name: 'Motorcycle', emoji: '🏍️' },
        { name: 'Scooter', emoji: '🛴' },
        { name: 'Train', emoji: '🚂' },
        { name: 'Tram', emoji: '🚋' },
        { name: 'Airplane', emoji: '✈️' },
        { name: 'Helicopter', emoji: '🚁' },
        { name: 'Rocket', emoji: '🚀' },
        { name: 'UFO', emoji: '🛸' },
        { name: 'Boat', emoji: '⛵' },
        { name: 'Ship', emoji: '🚢' },
        { name: 'Anchor', emoji: '⚓' }
    ],
    'Faces': [
        { name: 'Smiley', emoji: '😀' },
        { name: 'Grin', emoji: '😁' },
        { name: 'Laughing', emoji: '😆' },
        { name: 'Wink', emoji: '😉' },
        { name: 'Heart Eyes', emoji: '😍' },
        { name: 'Kiss', emoji: '😘' },
        { name: 'Thinking', emoji: '🤔' },
        { name: 'Cool', emoji: '😎' },
        { name: 'Star Eyes', emoji: '🤩' },
        { name: 'Party', emoji: '🥳' },
        { name: 'Shocked', emoji: '😲' },
        { name: 'Surprised', emoji: '😮' },
        { name: 'Sleepy', emoji: '😴' },
        { name: 'Dizzy', emoji: '😵' },
        { name: 'Angry', emoji: '😠' },
        { name: 'Crying', emoji: '😢' },
        { name: 'Scared', emoji: '😱' },
        { name: 'Robot', emoji: '🤖' },
        { name: 'Alien', emoji: '👽' },
        { name: 'Ghost', emoji: '👻' },
        { name: 'Skull', emoji: '💀' },
        { name: 'Pumpkin', emoji: '🎃' }
    ],
    'Symbols': [
        { name: 'Heart', emoji: '❤️' },
        { name: 'Broken Heart', emoji: '💔' },
        { name: 'Two Hearts', emoji: '💕' },
        { name: 'Check Mark', emoji: '✅' },
        { name: 'X Mark', emoji: '❌' },
        { name: 'Warning', emoji: '⚠️' },
        { name: 'Question', emoji: '❓' },
        { name: 'Exclamation', emoji: '❗' },
        { name: 'Plus', emoji: '➕' },
        { name: 'Minus', emoji: '➖' },
        { name: 'Multiply', emoji: '✖️' },
        { name: 'Divide', emoji: '➗' },
        { name: 'Infinity', emoji: '♾️' },
        { name: 'Up Arrow', emoji: '⬆️' },
        { name: 'Down Arrow', emoji: '⬇️' },
        { name: 'Left Arrow', emoji: '⬅️' },
        { name: 'Right Arrow', emoji: '➡️' },
        { name: 'Peace', emoji: '☮️' },
        { name: 'Recycle', emoji: '♻️' },
        { name: 'Yin Yang', emoji: '☯️' },
        { name: 'Music Note', emoji: '🎵' },
        { name: 'Musical Notes', emoji: '🎶' }
    ],
    'Hands': [
        { name: 'Thumbs Up', emoji: '👍' },
        { name: 'Thumbs Down', emoji: '👎' },
        { name: 'OK Hand', emoji: '👌' },
        { name: 'Victory', emoji: '✌️' },
        { name: 'Crossed Fingers', emoji: '🤞' },
        { name: 'Love You', emoji: '🤟' },
        { name: 'Rock', emoji: '🤘' },
        { name: 'Wave', emoji: '👋' },
        { name: 'Clap', emoji: '👏' },
        { name: 'Fist', emoji: '👊' },
        { name: 'Punch', emoji: '👊' },
        { name: 'Point Up', emoji: '☝️' },
        { name: 'Point Down', emoji: '👇' },
        { name: 'Point Left', emoji: '👈' },
        { name: 'Point Right', emoji: '👉' },
        { name: 'Raised Hand', emoji: '✋' },
        { name: 'Folded Hands', emoji: '🙏' },
        { name: 'Writing Hand', emoji: '✍️' }
    ]
};

// Track currently active category
let activeCategory = 'Animals';

// Image selection
function showImageSelector() {
    const modal = document.getElementById('image-modal');
    const tabsContainer = document.getElementById('category-tabs');

    // Render category tabs if not already rendered
    if (tabsContainer && tabsContainer.children.length === 0) {
        renderCategoryTabs();
    }

    // Show images for the active category
    showCategoryImages(activeCategory);

    modal.classList.add('active');
}

// Render category tabs
function renderCategoryTabs() {
    const tabsContainer = document.getElementById('category-tabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = '';

    Object.keys(imageCategories).forEach(category => {
        const tab = document.createElement('button');
        tab.className = 'category-tab';
        tab.textContent = category;
        tab.onclick = () => switchCategory(category);

        if (category === activeCategory) {
            tab.classList.add('active');
        }

        tabsContainer.appendChild(tab);
    });
}

// Switch to a different category
function switchCategory(category) {
    activeCategory = category;

    // Update active tab styling
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent === category);
    });

    // Show images for this category
    showCategoryImages(category);
}

// Show images for a specific category
function showCategoryImages(category) {
    const grid = document.getElementById('default-images');
    const images = imageCategories[category];

    if (!grid || !images) return;

    grid.innerHTML = '';

    images.forEach(img => {
        const div = document.createElement('div');
        div.className = 'image-option';
        div.title = img.name;

        const url = createEmojiUrl(img.emoji);
        div.innerHTML = `<img src="${url}" alt="${img.name}">`;
        div.onclick = () => selectImage(url, img.name);
        grid.appendChild(div);
    });
}

function closeImageSelector() {
    document.getElementById('image-modal').classList.remove('active');
}

// Helper function to close modal when clicking outside (on backdrop)
function closeModalOnBackdropClick(event, modalId) {
    // Only close if the click is directly on the modal backdrop, not on its children
    if (event.target.id === modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
}

function selectImage(url, name) {
    addLayer(url, name);
    closeImageSelector();
}

function applyCustomImage() {
    const url = document.getElementById('custom-image-url').value.trim();
    if (!url) {
        showToast('Please enter an image URL', 'error');
        return;
    }
    addLayer(url, 'Custom Image');
    closeImageSelector();
}

// Background color
function updateBackgroundColor() {
    // Save state before changing background color
    saveState('Change Background Color');

    const color = document.getElementById('bg-color').value;
    animationData.settings.backgroundColor = color;
}
