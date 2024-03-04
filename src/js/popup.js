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


    
async function loadSearchContent(){

    const res =  await fetch('views/search.html')
    document.getElementById('app').innerHTML = await res.text()

    document.getElementById('search').addEventListener('keydown', async (e)=>{ 
        if(e.key === 'Enter'){
            e.preventDefault()
    const options = {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    }
    
    
//creates a blank environment when making a new search
    document.getElementById('searchData').innerHTML = "";
    const searchItem = document.getElementById('search').value
    document.getElementById('search').value = '';
    const res2 = await fetch(`https://api.kurozora.app/v1/search?scope=kurozora&types%5B%5D=shows&query=${searchItem}&limit=25`, options)
    const ans = await res2.json()

    for(let i = 0; i < ans.data.shows.data.length; i++){
        const animeContainer = document.createElement('div')
        animeContainer.id = 'animeContainer'
        const anime = ans.data.shows.data[i].href;
        const animeName = await fetch('https://api.kurozora.app' + anime)
        const animeResult = await animeName.json()
        const animeDetails = document.createElement('div')
        animeDetails.id = 'animeDetails'
        const animePoster = document.createElement('img')
        const animeTitle = document.createElement('p')
        animeTitle.id = 'animeTitle'
        const animeGenre = document.createElement('p')
        animeGenre.id = 'animeGenre'
        animeGenre.textContent = animeResult.data[0].attributes.genres
        animeTitle.textContent = animeResult.data[0].attributes.title
        animePoster.id = 'animePoster'
        animePoster.src = animeResult.data[0].attributes.poster.url
        animeDetails.appendChild(animeTitle)
        animeDetails.appendChild(animeGenre)
        animeContainer.appendChild(animePoster)
        animeContainer.appendChild(animeDetails)
        
        document.getElementById('searchData').appendChild(animeContainer)
    }
        }

})

}

const buttons = document.querySelectorAll('button')

buttons.forEach(button => {
    button.addEventListener('click', function () {
        toggle(this.id)
    })
})
function toggle(id){

   buttons.forEach((button) =>{
    if(button.id === id){
        button.classList.add('bg-orange-500')
    } else{
        button.classList.remove('bg-orange-500')
    }
   }
)}

