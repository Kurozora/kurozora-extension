import browser from 'webextension-polyfill';

async function signIn(email, password) {
    const url = 'https://api.kurozora.app/v1/users/signin'
    const userAgent = navigator.userAgent

    // Extracting browser vendor and version information from userAgent
    const match = userAgent.match(/(Chrome|Firefox|Safari)\/(\S+)/)
    const browserVendor = match ? match[1] : 'Unknown'
    const browserVersion = match ? match[2] : 'Unknown'

    const deviceInfoMatch = userAgent.match(/\(([^)]+)\)/)
    const deviceInfo = deviceInfoMatch ? deviceInfoMatch[1] : ''
    const [deviceModel] = deviceInfo.split(';').map(part => part.trim())

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                email: email,
                password: password,
                platform: 'Web',
                platform_version: browserVersion,
                device_vendor: 'Apple', // For now, since the API has to be updated.
                device_model: deviceModel || 'Unknown',
            })
        })

        const record = await res.json()
        // Handle the response as needed

        // Send the response back to the popup
        browser.runtime.sendMessage({
            action: 'signInResponse',
            success: true,
            authToken: record.authenticationToken
        })
    } catch (error) {
        console.error('Error:', error)

        // Send an error response back to the popup
        browser.runtime.sendMessage({
            action: 'signInResponse',
            success: false,
            error: error.message
        })
    }
}

// Listen for messages from the popup
browser.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === 'signIn') {
            signIn(request.email, request.password)
        }
    }
)

/*
 Called when the item has been created, or when creation failed due to an error.
 We'll just log success/failure here.
 */
function onCreated() {
    if (browser.runtime.lastError) {
        console.log(`Error: ${browser.runtime.lastError}`);
    } else {
        console.log("Item created successfully");
    }
}

browser.contextMenus.create(
    {
        id: `search-anime`,
        title: `Search for Anime`,
        contexts: ['selection'],
        icons: {
            '16': 'img/symbols/tv.svg'
        }
    },
    onCreated,
)

browser.contextMenus.create(
    {
        id: `search-manga`,
        title: `Search for Manga`,
        contexts: ['selection'],
        icons: {
            '16': 'img/symbols/book.svg'
        }
    },
    onCreated,
)

browser.contextMenus.create(
    {
        id: `search-game`,
        title: `Search for Game`,
        contexts: ['selection'],
        icons: {
            '16': 'img/symbols/gamecontroller.svg'
        }
    },
    onCreated,
)

browser.contextMenus.create(
    {
        id: `search-song`,
        title: `Search for Song`,
        contexts: ['selection'],
        icons: {
            '16': 'img/symbols/music_note.svg'
        }
    },
    onCreated,
)

browser.contextMenus.create(
    {
        id: `search-character`,
        title: `Search for Character`,
        contexts: ['selection'],
        icons: {
            '16': 'img/symbols/totoro.svg'
        }
    },
    onCreated,
)

browser.contextMenus.create(
    {
        id: `search-person`,
        title: `Search for Person`,
        contexts: ['selection'],
        icons: {
            '16': 'img/symbols/person.svg'
        }
    },
    onCreated,
)

browser.contextMenus.create(
    {
        id: `search-studio`,
        title: `Search for Studio`,
        contexts: ['selection'],
        icons: {
            '16': 'img/symbols/building_2.svg'
        }
    },
    onCreated,
)

browser.contextMenus.onClicked.addListener((info, tab) => {
    browser.contextMenus.remove(info.menuItemId)

    switch (info.menuItemId) {
        case 'search-anime': {
            let query = info.selectionText
            return searchOnKurozora(query, 'shows')
        }
        case 'search-manga': {
            let query = info.selectionText
            return searchOnKurozora(query, 'literatures')
        }
        case 'search-game': {
            let query = info.selectionText
            return searchOnKurozora(query, 'games')
        }
        case 'search-song': {
            let query = info.selectionText
            return searchOnKurozora(query, 'songs')
        }
        case 'search-character': {
            let query = info.selectionText
            return searchOnKurozora(query, 'characters')
        }
        case 'search-person': {
            let query = info.selectionText
            return searchOnKurozora(query, 'people')
        }
        case 'search-studio': {
            let query = info.selectionText
            return searchOnKurozora(query, 'studios')
        }
    }
})

function searchOnKurozora(query, type) {
    browser.windows.create({
        url: `https://kurozora.app/search?q=${query}&type=${type}`
    });
}
