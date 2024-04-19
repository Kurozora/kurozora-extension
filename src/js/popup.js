import browser from 'webextension-polyfill'
let selectedType = "";
let result;
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



function configureSearchTypes() {
    const buttons = document.querySelectorAll("button[id^='types[]=']")

    buttons.forEach(button => {
        button.addEventListener('click', function () {
             //splits the string into an array of 2 string and uses the '=' as a separator 
            const type = button.id.split('=')[1] //the value of type is the index of 1 of the array
            toggleSearchType(type) //function to toggle the different buttons
        })
    })
}
    async function loadSearchContent(){
        const res =  await fetch('views/search.html')
        document.getElementById('app').innerHTML = await res.text()
    
        configureSearchTypes()
    
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
                const res2 = await fetch(`https://api.kurozora.app/v1/search?scope=kurozora&types[]=${selectedType}&query=${searchItem}&limit=25`, options)
                const ans = await res2.json()

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
            }
        })
    }

    

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
            }
        }
    )
}

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
        document.getElementById('about').innerHTML = item.attributes.about
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

