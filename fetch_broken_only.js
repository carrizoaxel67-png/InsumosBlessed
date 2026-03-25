const https = require('https');
const fs = require('fs');

const inventoryPath = 'c:/Users/carri/Desktop/Blessed/assets/js/inventory.js';
let content = fs.readFileSync(inventoryPath, 'utf8');

// The 18 perfumes the DOM inspector found to be broken or returning 'No disponible'
const brokenNames = [
    "Al Wataniah Sabah",
    "Armaf Eter Desert Breeze",
    "Fakhar Black",
    "Khamrah",
    "Musamam Men",
    "Odissey Aqua",
    "Odissey Spectra",
    "Taskeen Lactea Divina",
    "Yara Blanco",
    "Yara Candy",
    "Yara Rosa",
    "Yara Tous",
    "9 am Afnan",
    "9 pm Afnan",
    "Al Haramain Amber Oud Gold",
    "Asad",
    "Bharara King",
    "Club de Nuit Intense"
];

const delay = ms => new Promise(res => setTimeout(res, ms));

function fetchAlternativeImage(q) {
    return new Promise((resolve) => {
        // Try to get a clean image from fragranceX or Fragrantica style searches via Bing
        const query = encodeURIComponent(`Perfume ${q} fragrantica`);
        const url = `https://www.bing.com/images/search?q=${query}&form=HDRSC2&first=1&cw=1127&ch=802`;

        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    // Get all matches and pick the 3rd one to avoid the exact same hotlink protected one
                    const matches = [...data.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)];
                    if (matches && matches.length > 2) {
                        resolve(matches[2][1]);
                    } else if (matches && matches.length > 0) {
                        resolve(matches[0][1]);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

async function run() {
    let modified = content;
    let successCount = 0;

    for (let name of brokenNames) {
        // Find the block for this name
        const blockRegex = new RegExp(`\\{[^\\}]*name:\\s*"${name}"[^\\}]*\\}`);
        const match = modified.match(blockRegex);

        if (match) {
            const block = match[0];

            console.log(`Buscando link alternativo para: ${name}`);
            let newUrl = await fetchAlternativeImage(name);

            if (!newUrl) {
                let shortName = name.replace(/ \d+%| Dupe| Intens/gi, '').trim();
                newUrl = await fetchAlternativeImage(shortName);
            }

            if (newUrl) {
                console.log(`-> Encontrada alternativa: ${newUrl.substring(0, 50)}...`);
                let safeUrl = newUrl.replace(/'/g, "\\'");
                const newBlock = block.replace(/img:\s*('[^']+'|"[^"]+"|[^,]+)/, `img: '${safeUrl}'`);
                modified = modified.replace(block, newBlock);
                successCount++;
            } else {
                console.log(`-> ❌ NO ENCONTRADA.`);
            }

            await delay(500);
        }
    }

    fs.writeFileSync(inventoryPath, modified);
    console.log(`¡Corregidos ${successCount} de los ${brokenNames.length} caídos!`);
}

run();
