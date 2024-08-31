import browser from 'webextension-polyfill'

document.addEventListener('DOMContentLoaded', function() {
    loadApp()
})

function loadApp() {
    browser.storage.local.get(['token'], async function(result){
        if (result.token === undefined) {
            await loadSignInContent()
        } else {
            await loadSearchContent()
        }
    })
}

async function submitForm() {
    // Get email and password values
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    // Send a message to the background script to initiate the signIn function
    browser.runtime.sendMessage({ action: 'signIn', email: email, password: password })
}

// Listen for the response from the background script
browser.runtime.onMessage.addListener(
    function(response, sender, sendResponse) {
        if (response.action === 'signInResponse') {
            if (response.success) {
                browser.storage.local.set({
                    'token': response.authToken
                }, function () {
                    console.log('Token Stored')
                })

                loadApp()
            }
        }

        if (response.error) {
            console.error(response.action + ' error: ' + response.error)
        }
    }
)

async function loadSignInContent() {
    const res =  await fetch('views/signin.html')
    document.getElementById('app').innerHTML = await res.text()
    document.getElementById('loginButton').addEventListener('click', submitForm)
}

async function loadSearchContent() {
    const res =  await fetch('views/search.html')
    document.getElementById('app').innerHTML = await res.text()
}
