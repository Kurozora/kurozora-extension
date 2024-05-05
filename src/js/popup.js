import browser from 'webextension-polyfill'
<<<<<<< HEAD
let selectedType = "";
let result;
=======

let selectedType = 'shows'

>>>>>>> 399769c05d3d3d2741ae2c8a2f074486e719ee46
document.addEventListener('DOMContentLoaded', function() {
    loadApp()
})

function loadApp() {
    browser.storage.local.get(['token'], async function(result) {
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

function configureSearchTypes() {
    const buttons = document.querySelectorAll("button[id^='type-']")

    buttons.forEach(button => {
        button.addEventListener('click', function () {
            const type = button.id.replace('type-', '')
            toggleSearchType(type)
        })
    })

    // Initial toggle
    toggleSearchType(selectedType)
}
async function loadSearchContent() {
    const res =  await fetch('views/search.html')
    document.getElementById('app').innerHTML = await res.text()

<<<<<<< HEAD
                //
                ans.data[selectedType].data.forEach(async(search)=> {
                    const container = document.createElement('div')
                    container.id = 'container'
                    
                    //just the basic information that is created for each data
                    const details = document.createElement('div')
                    details.id = 'details'
                    const poster = document.createElement('img')
                    
                    poster.id = 'poster'
                    const title = document.createElement('p')
                    title.id = 'title'
                    const genre = document.createElement('p')
                    genre.id = 'genre'

                    const href = search.href;
                    const name = await fetch('https://api.kurozora.app' + href) //getting the indivdual search data
                    const item = await name.json();

                     //conditional statements for the individual search processes 
                    //might be removed if a better solution is implemented
                    if(selectedType == 'characters'){
                        poster.src = item.data[0].attributes.profile.url
                        container.appendChild(poster)
                        title.textContent = item.data[0].attributes.name
                        details.appendChild(title)
                    } else if(selectedType == `studios`){
                        poster.src = item.data[0].attributes.banner.url
                        container.appendChild(poster)
                        title.textContent = item.data[0].attributes.name
                        details.appendChild(title)
                    }  else if(selectedType == `episodes`){
                        poster.src = item.data[0].attributes.poster.url
                        container.appendChild(poster)
                        title.textContent = item.data[0].attributes.title
                        details.appendChild(title)
                    }
                    else if(selectedType == 'shows' || selectedType == 'games' || selectedType == 'literature'){
                        poster.src = item.data[0].attributes.poster.url
                        title.textContent = item.data[0].attributes.title
                        genre.textContent = item.data[0].attributes.genres
                        details.appendChild(title)
                        details.appendChild(genre)
                        container.appendChild(poster)
                    } else if(selectedType == 'users'){
                        poster.src = item.data[0].attributes.profile.url
                        details.appendChild(title)
                        container.appendChild(poster)
                        title.textContent = item.data[0].attributes.username
                        details.appendChild(title)
                    } else if(selectedType == 'people'){
                        title.textContent = item.data[0].attributes.fullName
                        poster.src = item.data[0].attributes.profile.url
                        details.appendChild(title)
                        container.appendChild(poster)
                    } else if(selectedType == 'songs'){
                        title.innerHTML = item.data[0].attributes.title
                        genre.innerHTML = item.data[0].attributes.artist
                        details.appendChild(title)
                        details.appendChild(genre)
                    }
                    container.appendChild(details)
                    
                    poster.addEventListener('click', () => landingPage(item.data[0]))
                    //appending all to the main HTML
                    document.getElementById('searchData').appendChild(container)
                })
=======
    configureSearchTypes()

    document.getElementById('search').addEventListener('keydown', async (e)=>{
        if (e.key === 'Enter') {
            e.preventDefault()
            const options = {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
>>>>>>> 399769c05d3d3d2741ae2c8a2f074486e719ee46
            }

<<<<<<< HEAD
    

function toggleSearchType(type) {
    selectedType = type //assigning selectedType to the name of the id
    const buttons = document.querySelectorAll("button[id^='types[]=']")
    buttons.forEach(button => {
            if (button.id === `types[]=${type}`) {
                button.classList.add('bg-orange-500')
                button.classList.add('text-white')
                
            } else{
                button.classList.add('text-orange-500')
                button.classList.remove('text-white')
                button.classList.add('border-orange-500')
                button.classList.remove('bg-orange-500')
=======
            // Creates a blank environment when making a new search
            document.getElementById('searchData').innerHTML = ""
            const searchItem = document.getElementById('search').value
            const res2 = await fetch(`https://api.kurozora.app/v1/search?scope=kurozora&types[]=${selectedType}&query=${searchItem}&limit=25`, options)
            const ans = await res2.json()
            const smallLockupTemplateResponse =  await fetch('views/components/lockups/small-lockup.html')
            const smallLockupTemplate = await smallLockupTemplateResponse.text()
            const containerElement = document.createElement('div')
            containerElement.className = 'flex gap-4 justify-between flex-wrap'
            document.getElementById('searchData').appendChild(containerElement)

            for(let i = 0; i < ans.data[selectedType].data.length; i++) {
                const anime = ans.data[selectedType].data[i].href
                const name = await fetch('https://api.kurozora.app' + anime)
                const result = await name.json()

                // Clone the template HTML, so we can reuse it
                const smallLockup = document.createElement('div');
                smallLockup.innerHTML = smallLockupTemplate

                let data = result.data[0]
                let poster
                let title
                let subtitle
                let tvRating

                // Conditional statements for the individual search processes.
                switch(selectedType) {
                    case 'characters':
                        poster = data.attributes.profile?.url ?? ''
                        title = data.attributes.name
                        subtitle = ''
                        tvRating = ''
                        break
                    case 'shows' || selectedType === 'games' || selectedType === 'literature':
                        poster = data.attributes.poster?.url ?? ''
                        title = data.attributes.title
                        subtitle = data.attributes.tagline ?? data.attributes.genres ?? data.attributes.themes
                        tvRating = data.attributes.tvRating.name
                        break
                    case 'episodes':
                        poster = data.attributes.banner?.url ?? ''
                        title = data.attributes.title
                        subtitle = ''
                        tvRating = ''
                        break
                    case 'people':
                        poster = data.attributes.profile?.url ?? ''
                        title = data.attributes.fullName
                        subtitle = ''
                        tvRating = ''
                        break
                    case 'songs':
                        poster = ''
                        title = data.attributes.title
                        subtitle = ''
                        tvRating = ''
                        break
                    case 'studios':
                        poster = data.attributes.banner?.url ?? ''
                        title = data.attributes.name
                        subtitle = ''
                        tvRating = ''
                        break
                    case 'users':
                        poster = data.attributes.profile?.url ?? ''
                        title = data.attributes.username
                        subtitle = ''
                        tvRating = ''
                        break
                    default: // Unsupported type
                        break
                }

                // Configure the lockup
                const posterElement = smallLockup.querySelector('#poster')
                posterElement.id = ''
                posterElement.src = poster
                const titleElement = smallLockup.querySelector('#title')
                titleElement.id = ''
                titleElement.innerHTML = title
                const subtitleElement = smallLockup.querySelector('#subtitle')
                subtitleElement.id = ''
                subtitleElement.innerHTML = subtitle
                const tvRatingElement = smallLockup.querySelector('#tvRating')
                tvRatingElement.id = ''
                tvRatingElement.innerHTML = tvRating

                //appending all to the main HTML
                containerElement.appendChild(smallLockup)
>>>>>>> 399769c05d3d3d2741ae2c8a2f074486e719ee46
            }
        }
    })
}

<<<<<<< HEAD
async function landingPage(item){
    const res =  await fetch(`views/${selectedType}/landing.html`)
    document.getElementById('app').innerHTML = await res.text()
    const landingContainer = document.getElementById('landingContainer')
    const profileImg = document.createElement('img')
    switch (selectedType) {
      case 'games':
        profileImg.src = item.attributes.poster.url
        profileImg.id = 'profileImg'
        document.getElementById('about').innerHTML = item.attributes.synopsis
        document.getElementById('title').innerHTML = item.attributes.title
        landingContainer.appendChild(profileImg)
        break;
     case 'characters':
        profileImg.src = item.attributes.profile.url
        profileImg.id = 'profileImg'
        document.getElementById('about').innerHTML = item.attributes.about
        document.getElementById('title').innerHTML = item.attributes.name
        document.getElementById('picture').appendChild(profileImg)
        break; 
    case 'people':
        profileImg.src = item.attributes.profile.url
        profileImg.id = 'profileImg'
        document.getElementById('about').innerHTML = item.attributes.about
        document.getElementById('title').innerHTML = item.attributes.name
        document.getElementById('picture').appendChild(profileImg)
        break; 
    case 'studios':
        profileImg.src = item.attributes.banner.url
        profileImg.id = 'profileImg'
        document.getElementById('title').innerHTML = item.attributes.name
        document.getElementById('picture').appendChild(profileImg)
        break; 
    case 'songs':
        profileImg.src = item.attributes.profile.url
        profileImg.id = 'profileImg'
        document.getElementById('about').innerHTML = item.attributes.about
        document.getElementById('title').innerHTML = item.attributes.name
        document.getElementById('picture').appendChild(profileImg)
        break; 
    }
}

=======
function toggleSearchType(type) {
    selectedType = type // Assigning selectedType to the name of the id

    const buttons = document.querySelectorAll("button[id^='type-']")
    buttons.forEach(button => {
        if (button.id === `type-${type}`) {
            button.className = 'inline-flex items-center justify-center pl-2 pr-2 pt-1 pb-1 bg-orange-500 border border-transparent rounded-md text-xs text-white font-semibold uppercase tracking-widest transition ease-in-out duration-150 hover:bg-orange-400 active:bg-orange-600 focus:outline-none active:border-orange-600 active:ring-orange disabled:bg-gray-200 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-default sm:px-4 sm:py-2'
        } else {
            button.className = 'inline-flex items-center pl-2 pr-2 pt-1 pb-1 bg-white border border-orange-500 rounded-md font-semibold text-xs text-orange-500 uppercase tracking-widest shadow-sm transition ease-in-out duration-150 hover:bg-orange-400 hover:border-orange-400 hover:text-white focus:outline-none focus:border-orange-600 focus:ring-orange active:text-white active:bg-orange-600 disabled:bg-gray-200 disabled:border-gray-200 disabled:text-gray-300 disabled:cursor-default sm:px-4 sm:py-2'
        }
    })
}

// //switch between dark mode and light mode
// function modeSwitch() {
//     let click = 0
//     document.getElementById('mode').addEventListener('click', () => {
//
//         if (document.getElementById('searchPage').style.backgroundColor = 'white') {
//             click = 0
//         } else if (document.getElementById('searchPage').style.backgroundColor = 'black') {
//             click = 1
//         }
//
//         if (click === 0) {
//             document.getElementById('searchPage').style.backgroundColor = 'black'
//             document.getElementById('searchPage').style.color = 'white'
//             console.log("Yay black")
//         } else if (click === 1) {
//             document.getElementById('searchPage').style.backgroundColor = 'white'
//             document.getElementById('searchPage').style.color = 'black'
//             console.log("Yay white")
//         }
//     })
// }
>>>>>>> 399769c05d3d3d2741ae2c8a2f074486e719ee46
