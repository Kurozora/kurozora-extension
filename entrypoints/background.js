import browser from 'webextension-polyfill'
import {setupContextMenu} from '/app/components/context menu/index'

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

// Setup context menus
browser.runtime.onInstalled.addListener(async (details) => {
    await setupContextMenu()
})
browser.storage.sync.onChanged.addListener(setupContextMenu)
