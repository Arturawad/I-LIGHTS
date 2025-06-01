const express = require('express');
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient;
const session = require('express-session');

const app = express();
app.set('views', './public/views')
app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(bodyParser.json())

app.use(session({
    secret: '962-473Kk',
    resave: false,
    saveUninitialized: false
}))

// Данные сервера и базы данных
const PORT = 3000;
const urldb = 'mongodb+srv://artur:2007@cluster0.ezeapwz.mongodb.net/I-LIGHT?retryWrites=true&w=majority&appName=Cluster0';
const namedb = 'I-LIGHT'
let db;

// Подключение к базе данных
async function ConnectToDb() {
    try {
        const connect = await MongoClient.connect(urldb);
        db = connect.db(namedb);
        console.log(`Подключение к базе данных ${namedb} по адресу ${urldb} было установлено успешно!`);
    } catch(err) {
        console.log(`Произошла ошибка при подключении к базе данных: ${err}`);
        process.exit(1)
    }
}

// Обработка ответа сервера
app.get('/', async (req, res) => {
    try {
        if (!db) {
            await ConnectToDb();
        }

        const getDataProducts = await db.collection('products').find({}).limit(4)
        const dataProducts = await getDataProducts.toArray()
        
        res.render('index', {data: dataProducts})
    } catch(err) {
        console.log(`Произошла ошибка при подключении к базе данных: ${err}`);
    }
})

app.get('/catalog', async (req, res) => {
    try {
        if (!db) {
            await ConnectToDb()
        }

        const filter = req.query.filter || ''

        req.session.filterSearch = filter
        req.session.save()

        res.render('catalog')
    } catch(err) {
        console.log(`Произошла ошибка при подключении к базе данных: ${err}`);
    }
})

app.get('/catalog/product/:productID', async (req, res) => {
    if (!db) {
        await ConnectToDb()
    }

    const productID = req.params.productID ? decodeURIComponent(req.params.productID) : {}

    if (productID) {
        const productData = await db.collection('products').findOne({"title": productID})
        res.render('product', {productID: productID, productData: productData})
    } else {
        res.status(404).render('404', {root: __dirname})
    }
})

app.get('/about', async (req, res) => {
    res.render('about')
})

app.get('/basket', async (req, res) => {
    delete req.session.usedPromocodes
    req.session.save()

    res.render('basket')
})

app.get('/delivery', (req, res) => {
    res.render('delivery')
})

// Обработка ответа сервера на запрос из клиентского скрипта
app.get('/getDataProducts', async (req, res) => {
    try {
        const filterProducts = req.query.filter ? decodeURIComponent(req.query.filter): {}
        let filterObject = filterProducts && filterProducts.length ? {"filter": filterProducts}: {}
        const skipProducts = req.query.skip ? parseInt(decodeURIComponent(req.query.skip)): 0

        if (skipProducts > 0) {
            filterObject.objectID = {$gt: skipProducts}
        }
        
        const dataProducts = await db.collection('products').find(filterObject).limit(8).toArray()
        const dataProudctsLength = await db.collection('products').countDocuments()
        res.json({products: dataProducts, length: dataProudctsLength, filter: filterProducts})
    } catch(err) {
        console.log(`Произошла ошибка при подключении к базе данных: ${err}`);
    } 
})
app.get('/getFilter', async (req, res) => {
    try {
        res.json({filter: req.session.filterSearch})
    } catch(err) {
        console.log(`Произошла ошибка при подключении к базе данных: ${err}`);
    }
})
app.post('/getPromocodeBasket', async (req, res) => {
    try {
        if (!db) {
            await ConnectToDb()
        }

        const promocodeValue = req.body.promocode ? req.body.promocode : {}
        const dataPromocodes = await db.collection('promocodes').findOne({[`promocode.${promocodeValue}`]: {$exists: true}})

        const totalPriceText = req.body.totalPrice ? req.body.totalPrice : ''
        const totalPrice = parseInt(totalPriceText.replace(/&nbsp/g, '').replace(/[;\/₽]/g, '').trim())

        let status
        
        if (dataPromocodes && dataPromocodes.promocode && dataPromocodes.promocode[promocodeValue]) {            
            if (req.session.usedPromocodes && req.session.usedPromocodes[promocodeValue]) {
                return
            } else {
                const discountPercentage = dataPromocodes.promocode[promocodeValue]
                const discount = (totalPrice - (totalPrice * (discountPercentage / 100)))
                
                status = 'success'

                req.session.usedPromocodes = req.session.usedPromocodes || {}
                req.session.usedPromocodes[promocodeValue] = discountPercentage
                req.session.save()
                
                res.json({status: status, discountTotalPrice: discount, discountPercentage: dataPromocodes.promocode[promocodeValue]})
            }
        } else {
            status = 'error'
            res.json({status: status, totalPrice: totalPrice})
        }
    } catch(err) {
        console.log(err);
    }
})
app.get('/getStatePromocode', (req, res) => {
    let promocodeDiscountValue = req.session.usedPromocodes
    
    promocodeDiscountValue === undefined ? promocodeDiscountValue = 0 : findPromocodeValue()

    function findPromocodeValue() {
        for (const key in req.session.usedPromocodes) {
            promocodeDiscountValue = req.session.usedPromocodes[key]
        }
    }

    res.json({statusPromocode: promocodeDiscountValue})
})
app.get('/deletePromocodeBasket', async (req, res) => {
    try {
        if (!db) {
            await ConnectToDb()
        }

        const inputValue = req.query.promocode ? decodeURIComponent(req.query.promocode) : ''
    
        const totalPriceText = req.query.totalPrice ? req.query.totalPrice : ''
        const totalPrice = parseInt(totalPriceText.replace(/&nbsp/g, '').replace(/[;\/₽]/g, '').trim())

        const dataPromocodes = await db.collection('promocodes').find({[`promocode.${inputValue}`]: {$exists: true}}).toArray()
        const dataPromocodeDiscountValue = dataPromocodes[0].promocode[inputValue]
    
        inputValue !== '' && totalPrice !== '' ? renderingDeletePromcode() : null;
    
        function renderingDeletePromcode() {
            const initialPrice = parseInt(totalPrice) / (1 - parseInt(dataPromocodeDiscountValue) / 100)

            delete req.session.usedPromocodes
            req.session.save()
    
            res.json({initialPrice: initialPrice})
        }
    } catch (err) {
        console.log(err);
    }
}) 

// Обработка статусов
app.use((req, res) => {
    res.status(404).render('404', {root: __dirname})
})


// Создаем сервер
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту: ${PORT}`);
})
