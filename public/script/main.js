function checkPath() {
    try {
        if (window.location.pathname === '/catalog') {
            getFilter()
            .then(filter => {getDataProducts(filter), getDataProductsCategories(filter), fillMoreDataProductsFunction()})
            .catch(err => console.log(err))
            document.querySelector('#header-catalog').classList.add('header__content__contacts__item__decoration')
        }
        if (window.location.pathname === '/about') {
            document.querySelector('#header-about').classList.add('header__content__contacts__item__decoration')
        }
        if (window.location.pathname === '/basket') {
            document.querySelector('#header-basket').classList.add('header__content__contacts__item__decoration')
            getProductsBasket()
        }
        if (window.location.pathname == '/delivery') {
            document.querySelector('#header-delivery').classList.add('header__content__contacts__item__decoration')
        }
    } catch(err) {
        console.log(err);
    }
}

let currentFilter = ''

function getFilter() {
    return fetch('/getFilter')
    .then(response => response.json())
    .then(data => {
        currentFilter = data.filter
        return data.filter
    })
}

// Функция получени информации о продуктах, создание карточки товара и заполнение в контейнер
function getDataProducts(filter) {
    fetch(`/getDataProducts?filter=${encodeURIComponent(filter)}`).then(resolve => resolve.json())
    .then(data => {
        fillDataProducts(data.products, data.length)
    }).catch((err) =>  console.log(`Произошла ошибка при подключении к базе данных: ${err}`))
}

function createProductCard(product) {
    const cardProduct = document.createElement('div')
        cardProduct.classList.add('main__section__products__content__card')
        cardProduct.innerHTML = `<div class="main__section__products__content__card">
        <div class="main__section__products__content__card__wrapper">
            <img class="main__section__products__content__card__img" src="/img/${product.img}" alt="product">
            <h1 class="main__section__products__content__card__title">${product.title}</h1>
            <ul class="main__section__products__content__card__list">
            </ul>
            <p class="main__section__products__content__card__price">${product.price}</p>
        </div>
        <div class="main__section__products__content__card__links">
            <a href="" class="main__section__products__content__card__links__more" data-productDesc>Подробнее</a>
            <button class="main__section__products__content__card__links__add" data-productSave>+</button>
        </div>
        </div>`

        const cardProductDescription = cardProduct.querySelector('.main__section__products__content__card__list')

        product.description.forEach((desc) => {
            const cardProductDescriptionItem = document.createElement('li')
            cardProductDescriptionItem.classList.add('main__section__products__content__card__list__item')
            cardProductDescriptionItem.innerHTML = `<img src="/img/rectangle 56.svg" alt="point">${desc.item}`
            cardProductDescription.append(cardProductDescriptionItem)
        }
    )

    cardProduct.dataset.objectID = product.objectID

    return cardProduct
}

function fillDataProducts(data) {
    const productsContainer = document.querySelector('#product-container')
    productsContainer.innerHTML = ''

    data.forEach((product) => {
        cardProduct = createProductCard(product)
        productsContainer.append(cardProduct)
    })

    getProductDesc()
    saveProductsForBasketInfo()
}

// Обработка клика по загрузке информации о товаре
function getProductDesc() {
    const productButtonDescArray = document.querySelectorAll('[data-productdesc]')

    productButtonDescArray.forEach((link) => {
        const productID = link.parentNode.parentNode.querySelector('.main__section__products__content__card__title').innerHTML

        // link.setAttribute('href', `/catalog/product/${encodeURIComponent(productID)}`)
    })
}

document.addEventListener('DOMContentLoaded', checkPath, saveProductsForBasketInfo())

// Загрузка контента из БД при нажатии кнопки
function fillMoreDataProductsFunction() {
    const btnLoadMore = document.querySelector('#button-loadmore')
    const productsContainer = document.querySelector('#product-container')

    btnLoadMore.addEventListener('click', () => fillMoreDataProducts())
    function fillMoreDataProducts () {
        const lastObjectID = productsContainer.lastElementChild.dataset.objectID

        fetch(`/getDataProducts?skip=${encodeURIComponent(lastObjectID)}&filter=${encodeURIComponent(currentFilter)}`)
        .then(resolve => resolve.json())
        .then(data => data.products.forEach((product) => {
            const cardProduct = createProductCard(product)
            productsContainer.append(cardProduct)
        }))
        .then(() => (getProductDesc(), saveProductsForBasketInfo()))
        .catch(err => console.log(err))
    }
}

// Сохранение контента в LocalStorage 
function saveProductsForBasketInfo() {
    const btnProductSaveArray = document.querySelectorAll('[data-productSave]')

    btnProductSaveArray.forEach((btn) => {
        btn.addEventListener('click', (btn) => {
            const productCardInfoContainer = btn.currentTarget.parentNode.parentNode
            const productCardInfo = {
                "titleCard": productCardInfoContainer.querySelector('.main__section__products__content__card__title').innerHTML,
                "imgCard": productCardInfoContainer.querySelector('.main__section__products__content__card__img').src.replace(/http:\/\/localhost:3000/g, '').trim(),
                "priceCard": productCardInfoContainer.querySelector('.main__section__products__content__card__price').innerHTML,
                "descCard": []
            }

            const descCardArray = productCardInfoContainer.querySelectorAll('.main__section__products__content__card__list__item')
            descCardArray.forEach((desc) => {
                productCardInfo.descCard.push(desc.innerHTML.replace(/<img src="\/img\/rectangle 56.svg" alt="point">/g, '').trim())
            })

            let productsCardArray = JSON.parse(localStorage.getItem("productsCardArray")) || []
            productCardInfo ? saveProductsForBasketFunction(productCardInfo, productsCardArray) : null
        })
    })
}

function saveProductsForBasketFunction(productCardInfo, productsCardArray) {
    let isAdded = false
    productsCardArray.push(productCardInfo)
    
    if (localStorage.productsCardArray) {
        JSON.parse(localStorage.productsCardArray).forEach((product) => {
            if (product.titleCard === productCardInfo.titleCard) {
                isAdded = true
            }
        })
    }

    isAdded === false ? localStorage.setItem("productsCardArray", JSON.stringify(productsCardArray)) : null
}

// Загрузка контента в корзину и его обработка
function getProductsBasket() {
    const productsBasket = document.querySelector('#products-basket')
    const absenceContainer = document.querySelector('.main__section__basket__absence')
    const controlsBasket = document.querySelector('#controls-basket')
    
    fillPromocodeBasket(productsBasket)

    productsBasket.children.length === 0 ? renderingAbsence(absenceContainer, controlsBasket): renderingProductsBasket(absenceContainer, controlsBasket, productsBasket, absenceContainer, controlsBasket), getPromocodeBasket()
}

function fillPromocodeBasket(productsBasket) {
    const productCardArray = JSON.parse(localStorage.getItem("productsCardArray"))

    if (productCardArray === null) {
        return
    }

    productCardArray.forEach((product) => {
        const cardProduct = document.createElement('div')

        cardProduct.innerHTML = `<div class="main__section__basket__card" data-product>
        <div class="main__section__basket__card__info">
            <img class="main__section__basket__card__img" src="${product.imgCard}" alt="product">

            <div class="main__section__basket__card__info__text">
                <h1 class="main__section__basket__card__info__title">${product.titleCard}</h1>
                <ul class="main__section__basket__card__info__list">
                </ul>
            </div>
        </div>

        <div class="main__section__basket__card__counter">
            <button class="main__section__basket__card__counter__button main__section__basket__card__counter__button__left" type="button">-</button>
            <p class="main__section__basket__card__counter__text">1</p>
            <button class="main__section__basket__card__counter__button main__section__basket__card__counter__button__right" type="button">+</button>
        </div>
        
        <p class="main__section__basket__card__counter__sum">${product.priceCard}</p>

        <button class="main__section__basket__card__counter__button__delete" type="button"><img src="/img/++.svg" alt="close"> Удалить</button>
    </div>`

    const productCardDescList = cardProduct.querySelector('.main__section__basket__card__info__list')
    product.descCard.forEach((desc) => {
        const productCardItem = document.createElement('li')
        productCardItem.classList = 'main__section__basket__card__info__list__item'

        productCardItem.innerHTML = desc
        productCardDescList.appendChild(productCardItem)
    })

    productsBasket.appendChild(cardProduct)
    })
}

function renderingAbsence(absenceContainer, controlsBasket) {
    absenceContainer.style.display = 'flex'
    controlsBasket.style.display = 'none'
}

function renderingProductsBasket(absenceContainer, controlsBasket, productsBasket, absenceContainer, controlsBasket) {
    const productCardArray = document.querySelectorAll('[data-product]')

    absenceContainer.style.display = 'none'
    controlsBasket.style.display = 'flex'

    productCardArray.forEach((product) => {
        const deleteProductButton = product.querySelector('.main__section__basket__card__counter__button__delete')
        const counterButton = product.querySelectorAll('.main__section__basket__card__counter__button')
        const counter = product.querySelector('.main__section__basket__card__counter__text')
        
        toggleCounter(counterButton, counter)
        deleteProductButton.addEventListener('click', () => deleteProductCard(product.parentNode, productsBasket, absenceContainer, controlsBasket))
    })

    updateTotalPriceAndQuantity()
}

function toggleCounter(counterButton, counter) {
    counterButton.forEach((btn) => {
        btn.addEventListener('click', (el) => {
            const clickedElement = el.currentTarget
            let currentCounterValue = parseInt(counter.textContent)

            if (clickedElement.classList.contains('main__section__basket__card__counter__button__left') && parseInt(counter.innerHTML) > 1) {
                counter.innerHTML = currentCounterValue - 1
                updateTotalPriceAndQuantity()
            } else if (clickedElement.classList.contains('main__section__basket__card__counter__button__right') && parseInt(counter.innerHTML) < 10) {
                counter.innerHTML = currentCounterValue + 1
                updateTotalPriceAndQuantity()
            }
        })
    })
}

function updateTotalPriceAndQuantity() {
    fetch('/getStatePromocode')
    .then(response => response.json())
    .then(data => updateTotalPriceAndQuantityFunction(data))
    .catch(err => console.log(err))

    const productCardArray = document.querySelectorAll('[data-product]')
    const totalPrice = document.querySelector('#total-price')
    const quantityProducts = document.querySelector('#quantity-products')

    let quantityProductsValue = 0
    let totalPriceValue = 0

    function updateTotalPriceAndQuantityFunction(data) {
        let statusPromocode = data.statusPromocode
        let discountPercentagePromocodeValue = statusPromocode !== 0 ? discountPercentage = parseInt(statusPromocode) / 100 : discountPercentage = statusPromocode

        productCardArray.forEach((product) => {
            let priceText = product.querySelector('.main__section__basket__card__counter__sum').textContent.replace(/[₽\/шт]/g, '')
            let quantityProducts = product.querySelector('.main__section__basket__card__counter__text')
    
            totalPriceValue += parseInt(priceText.replace(/\s/g, '')) * parseInt(quantityProducts.textContent)
            quantityProductsValue += parseInt(quantityProducts.textContent)
        })

        let totalPriceValueText = parseInt(totalPriceValue - totalPriceValue * discountPercentagePromocodeValue)

        totalPrice.innerHTML = totalPriceValueText.toLocaleString('ru-RU') + '₽'
        quantityProducts.innerHTML = quantityProductsValue
    }
}

function deleteProductCard(product, productsBasket, absenceContainer, controlsBasket) {
    product.remove()
    updateTotalPriceAndQuantity()
    productsBasket.children.length === 0 ? renderingAbsence(absenceContainer, controlsBasket) : null

    const productTitle = product.children[0].querySelector('.main__section__basket__card__info__title').innerHTML
    
    const newProductsCardArray = JSON.parse(localStorage.productsCardArray).filter(
        (product) => product.titleCard !== productTitle
    )

    localStorage.productsCardArray = JSON.stringify(newProductsCardArray)
}

function getPromocodeBasket() {
    const formPromocode = document.querySelector('#get-promocode')
    const promocodeInput = document.querySelector('#get-promocode-input')
    const promocodeButton = document.querySelector('#get-promocode-button')
    const totalPrice = document.querySelector('#total-price')

    let lastRequestTime = 0
    const requestDelay = 2500

    formPromocode.addEventListener('submit', (event) => {
        event.preventDefault() 

        if (Date.now() - lastRequestTime < requestDelay) {
            return
        }

        lastRequestTime = Date.now()
        
        fetch('/getPromocodeBasket', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({promocode: promocodeInput.value.toUpperCase(), totalPrice: totalPrice.innerHTML})})
        .then(response => response.json())
        .then(data => {
            renderingPromocodeBasket(data, formPromocode, promocodeInput, promocodeButton)
        })
        .catch(err => console.log(err))
    })

}

function renderingPromocodeBasket(data, formPromocode, promocodeInput, promocodeButton) {
    const totalPrice = document.querySelector('#total-price')
    const discountPercentage = document.querySelector('#discount-percentage')
    const promocodeError = document.querySelector('#promocode-error')
    const promocodeSuccess = document.querySelector('#promocode-success')

    if (data.status === 'success') {
        totalPrice.innerHTML = data.discountTotalPrice.toLocaleString('ru-RU') + '₽'

        promocodeSuccess.classList.remove('main__section__basket__wrapper__promocode__text__non')
        promocodeError.classList.add('main__section__basket__wrapper__promocode__text__non')
        discountPercentage.innerHTML = data.discountPercentage

        promocodeInput.disabled = true
        promocodeButton.classList.remove('main__section__basket__wrapper__promocode__button__close__content__non')

        promocodeButton.addEventListener('click', () => deletePromocodeBasket(formPromocode, promocodeSuccess, promocodeInput, promocodeButton, totalPrice))
    } else if (data.status === 'error') {
        totalPrice.innerHTML = data.totalPrice.toLocaleString('ru-RU') + '₽'
        
        promocodeSuccess.classList.add('main__section__basket__wrapper__promocode__text__non')
        promocodeError.classList.remove('main__section__basket__wrapper__promocode__text__non')

        promocodeInput.blur()
    }
}

function deletePromocodeBasket(formPromocode, promocodeSuccess, promocodeInput, promocodeButton, totalPrice) {
    fetch(`/deletePromocodeBasket?promocode=${encodeURIComponent(promocodeInput.value.toUpperCase())}&totalPrice=${encodeURIComponent(totalPrice.innerHTML)}`)
    .then(response => response.json())
    .then(data => {
        totalPrice.innerHTML = data.initialPrice.toLocaleString('ru-RU') + '₽'
    })
    .catch(err => console.log(err))

    formPromocode.reset()
    promocodeSuccess.classList.add('main__section__basket__wrapper__promocode__text__non')
    promocodeInput.disabled = false
    promocodeButton.classList.add('main__section__basket__wrapper__promocode__button__close__content__non')
}

// Обработка клика по элементам каталога
const btnCatalogArray = document.querySelectorAll('[data-catalog]')

btnCatalogArray.forEach((el) => {
    el.addEventListener('click', () => {
        const isActive = el.children[0].classList.contains('main__section__catalog__wrapper__list__link__title__active');

        btnCatalogArray.forEach((event) => {
            event.children[0].classList.add('main__section__catalog__wrapper__list__link__title');
            event.children[0].classList.remove('main__section__catalog__wrapper__list__link__title__active');
            event.parentNode.children[1].classList.add('main__section__catalog__wrapper__list__link__content');
        });

        if (!isActive) {
            el.children[0].classList.remove('main__section__catalog__wrapper__list__link__title');
            el.children[0].classList.add('main__section__catalog__wrapper__list__link__title__active');
            el.parentNode.children[1].classList.remove('main__section__catalog__wrapper__list__link__content');
            el.parentNode.children[1].classList.add('animationOpacity')
        }
    });
});

// Обработка клика по элементам услуг
const btnServicesArray = document.querySelectorAll('[data-services]');

btnServicesArray.forEach((el) => {
    el.addEventListener('click', (event) => {
        const clickedElement = event.currentTarget;
        const isActive = clickedElement.parentNode.children[1].classList.contains('main__section__services__content__card__info__desc__hidden');

        btnServicesArray.forEach((element) => {
            const description = element.parentNode.children[1];
            const arrowIcon = element.parentNode.children[2].children[0];

            description.classList.add('main__section__services__content__card__info__desc__hidden');
            arrowIcon.classList.add('main__section__services__content__card__info__element');
            arrowIcon.classList.remove('main__section__services__content__card__info__element__rotate');
        });
        
        if (isActive) {
            const description = clickedElement.parentNode.children[1];
            const arrowIcon = clickedElement.parentNode.children[2].children[0];

            description.classList.remove('main__section__services__content__card__info__desc__hidden');
            description.classList.add('animationOpacity');
            arrowIcon.classList.remove('main__section__services__content__card__info__element');
            arrowIcon.classList.add('main__section__services__content__card__info__element__rotate');
        }
    });
});

// Обработка клика по категории товаров
function getDataProductsCategories(filter) {
    const btnCategoriesArray = document.querySelectorAll('[data-categories]')

    btnCategoriesArray.forEach((el) => {
        if (el.dataset.categories === filter) {
            el.classList.add('main__content__categories__button__active')
            el.classList.remove('main__content__categories__button')
        }
    })

    btnCategoriesArray.forEach((el) => {
        el.addEventListener('click', (event) => {
            const clickedElement = event.currentTarget

            if (!clickedElement.classList.contains('main__content__categories__button__active')) {
                const clickedElementFilter = clickedElement.dataset.categories
                currentFilter = clickedElementFilter

                fetch(`/getDataProducts?filter=${encodeURIComponent(clickedElementFilter)}`)
                .then(resolve => resolve.json())
                .then(data => fillDataProducts(data.products))
                .catch(err => console.log(err))
    
                btnCategoriesArray.forEach((el) => {
                    el.classList.add('main__content__categories__button')
                    el.classList.remove('main__content__categories__button__active')
                })
    
                clickedElement.classList.add('main__content__categories__button__active')
                clickedElement.classList.remove('main__content__categories__button')
            }
        })
    })
}

// Обработка клика по категории услуг
const btnAboutArray = document.querySelectorAll('[data-about]')
const btnAboutInfoArray = document.querySelectorAll('[data-aboutinfo]')

btnAboutArray.forEach((el) => {
    el.addEventListener('click',(el) => {
        const clickedElement = el.currentTarget

        if (!clickedElement.classList.contains('main__section__about__links__button__active')) {
            btnAboutInfoArray.forEach((info) => {
                info.classList.add('main__section__about__content__list__content__non')

                if (info.dataset.aboutinfo === clickedElement.dataset.about) {
                    info.classList.remove('main__section__about__content__list__content__non')
                }
            })

            btnAboutArray.forEach((el) => {
                el.classList.add('main__section__about__links__button')
                el.classList.remove('main__section__about__links__button__active')
            })

            clickedElement.classList.add('main__section__about__links__button__active')
            clickedElement.classList.remove('main__section__about__links__button__')
        }
    })
})

// Обработка клика по категориям решений
const btnSolutionsArray = document.querySelectorAll('[data-solutions]')
let imgSolution = document.querySelector('#img-solutions')

btnSolutionsArray.forEach((el) => {
    el.addEventListener('click', (el) => {
        const clickedElement = el.currentTarget

        if (!clickedElement.classList.contains('main__section__about__content__solutions__text__links__button__active')) {
            btnSolutionsArray.forEach((el) => {
                el.classList.add('main__section__about__content__solutions__text__links__button')
                el.classList.remove('main__section__about__content__solutions__text__links__button__active')

                if (el.dataset.solutions !== 'none-border') {   
                    el.classList.add('main__section__about__content__solutions__text__links__button__border')
                }
            })

            imgSolution.setAttribute('src', `/img/art-design${clickedElement.dataset.solutionstag}.svg`)
            clickedElement.classList.add('main__section__about__content__solutions__text__links__button__active')
            clickedElement.classList.remove('main__section__about__content__solutions__text__links__button')
            clickedElement.classList.remove('main__section__about__content__solutions__text__links__button__border')
        }
    })
})

// Валидация инпутов в доставка и оплата
const formInputContactsPerson = document.querySelector('#formInputContactsPerson')
const inputContactsPersonArray = document.querySelectorAll('[data-contactsPerson]')

inputContactsPersonArray.length !== 0 && formInputContactsPerson ? (validationInputContactsPerson(), requestServerInputContactsPerson()) : null

function validationInputContactsPerson() {
    inputContactsPersonArray.forEach((input) => {
        if (input.dataset.contactsperson === 'phone') {
            input.addEventListener('click', () => {
                input.value.length === 0 ? input.value = '+7' : null
            })
            input.addEventListener('blur', () => {
                input.value.length === 2 ? input.value = '' : null
            })
        }

        input.addEventListener('input', () => {
            if (input.dataset.contactsperson === 'name') {
                if (input.value.length <= 10) {
                    input.value = validationInputContactsPersonName(input.value)
                } else {
                    input.value = input.value.slice(0, 10)
                }
            } else if (input.dataset.contactsperson === 'phone') {
                if (input.value.length <= 11) {
                    if (input.value.slice(0, 1) !== '+') {
                        const inputValueSaved = input.value
                        input.value = '+' + inputValueSaved
                    } else if (input.value.slice(0, 2) !== '7') {
                        input.value = '+7' + input.value.slice(2)
                    }

                    input.value = validationInputContactsPersonPhone(input.value)
                } else {
                    input.value = input.value.slice(0, 12)
                }
            }
        })
    })
}

function validationInputContactsPersonName(inputValue) {
    const formattedString = inputValue.replace(/[^а-яА-Яё]/g, '')
    return formattedString
}

function validationInputContactsPersonPhone(inputValue) {
    let formattedString = inputValue.slice(0, 2) + inputValue.slice(2).replace(/[^0-9]/g, '')
    return formattedString
}

function requestServerInputContactsPerson() {
    const InputContactsPersonName = document.querySelector('#InputContactsPersonName')
    const InputContactsPersonPhone = document.querySelector('#InputContactsPersonPhone')

    formInputContactsPerson.addEventListener('submit', (event) => {
        event.preventDefault()

        inputContactsPersonArray.forEach((input) => {
            input.blur()
        })

        InputContactsPersonPhone.value.length < 11 ? showInputContactsPersonError(inputElement = InputContactsPersonPhone, placeholderError = 'Номер телефона не может быть короче 11 цифр!', placeholderDefault= 'Ваш телефон*') : null
        InputContactsPersonName.value.length < 3 ? showInputContactsPersonError(inputElement = InputContactsPersonName, placeholderError = 'Введенное имя не может быть короче 3 букв!', placeholderDefault= 'Ваше имя*') : null
    })
}

function showInputContactsPersonError(inputElement, placeholderError, placeholderDefault) {
    inputElement.value = ''
    inputElement.placeholder = placeholderError
    inputElement.classList.add('main__section__delivery__content__regions__form__input--red--color')
    inputElement.style.borderBottom = '1px solid #ff0000'
    inputElement.disabled = true
    setTimeout(() => {
        inputElement.placeholder = placeholderDefault
        inputElement.classList.remove('main__section__delivery__content__regions__form__input--red--color')
        inputElement.style.borderBottom = '1px solid #C4C4C4'
        inputElement.disabled = false
    }, 4000)
}
