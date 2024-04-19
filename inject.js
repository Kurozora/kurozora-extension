const goToKurozora = document.createElement('button')
const container = document.createElement('section')
const addToKurozora = document.createElement('button')

class Color {
    constructor(color){
        this.color = color
    }
}

const whiteColor = new Color('white')
const orangeColor = new Color('orange')



container.style.width = "215px"
container.style.height = "35px"
container.style.display = "flex"
container.style.borderRadius = "5px"
container.style.alignItems = "center"
container.style.justifyContent = "space-between"
container.style.position = "absolute"
container.style.bottom = "5px"

goToKurozora.style.backgroundColor = orangeColor.color
goToKurozora.style.color= whiteColor.color
goToKurozora.style.width = "35px"
goToKurozora.style.height= "35px"
goToKurozora.textContent = ">"
goToKurozora.style.borderRadius = "5px"
goToKurozora.style.padding = "5px"
goToKurozora.style.border = "none"

addToKurozora.textContent = "Add To Kurozora"
addToKurozora.style.backgroundColor = orangeColor.color
addToKurozora.style.color= whiteColor.color
addToKurozora.style.width = "170px"
addToKurozora.style.height= "35px"
addToKurozora.style.borderRadius = "5px"
addToKurozora.style.font = "1rem"
addToKurozora.style.textAlign = "center"
addToKurozora.style.border = "none"

container.appendChild(addToKurozora)

const kurozoraLink = document.createElement('a')
kurozoraLink.href = "https://kurozora.app/anime/" + window.location.host + window.location.pathname
kurozoraLink.target = "blank"
kurozoraLink.appendChild(goToKurozora)
container.appendChild(kurozoraLink)

addToKurozora.addEventListener('click', ()=>{
console.log('Added')
})

const site = window.location.hostname
switch(site){
    case 'anilist.co': {
        const sidebar = document.querySelector(".cover-wrap")
        sidebar.style.position = "relative" //adding a position relative to the anilist sidebar 
        sidebar.appendChild(container)
    }
}

