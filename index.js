import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'

const app = express()
app.use(cors())
app.use(express.json())

const dbClient = new MongoClient("mongodb://127.0.0.1:27017");
let db;

/* Se conecta ao banco dbClient.connect() */
/* Se conecta ao documento dbClient.db("BatePapo_UOL") */
/* Insere item a uma coleção db.collection('users').insertOne */
/* Retorna o conteudo do banco db.collection('users').find().toArray()*/


app.get('/', async (req, res) => {

    await dbClient.connect()
    db = dbClient.db("BatePapo_UOL")

    await db.collection('users').insertOne({
        name: "joão4"
    })

    const users = await db.collection('users').find().toArray()
    console.log(users)

    res.send(users).status(201)
})

app.listen("5000", () => {
    console.log("Servidor em andamento")
})