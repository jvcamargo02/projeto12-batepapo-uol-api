import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import joi from 'joi'
import dayjs from "dayjs";
import "dayjs/locale/pt-br.js";

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())

const dbClient = new MongoClient(process.env.MONGO_URL);
let db;

/* JOI SCHEMAS */
const userSchema = joi.object({
    name: joi.string().required()
});


function dataBaseConnect() {

    dbClient.connect()
    db = dbClient.db("BatePapo_UOL")
}

function dataBaseDisconnect() {

    dbClient.close()
}

/* Se conecta ao banco dbClient.connect() */
/* Se conecta ao documento dbClient.db("BatePapo_UOL") */
/* Insere item a uma coleção db.collection('users').insertOne */
/* Retorna o conteudo do banco db.collection('users').find().toArray()*/


app.post("/participants", async (req, res) => {

    const { name } = req.body
    const validation = userSchema.validate({ name })
    const users = await db.collection("users").find({ name }).toArray();
    const reqTime = dayjs().locale('pt-br').format("HH:mm:ss");
    
    dataBaseConnect()

    /* Valida String */
    if ((validation.error) || !(isNaN(parseInt(name)))) {
        return res.status(422).send("Confira o seu nome")
    }

    /* Valida username disponivel */
    if (users.length !== 0) {
        return res.status(409).send("Este username já está em uso")
    }


    try {
        await db.collection("users").insertOne({
            name,
            lastStatus: Date.now()
        })

        await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: reqTime
        })

        res.status(201).send("Usuário Logado")
    } catch {
        res.sendStatus(500)
    }

    dataBaseDisconnect()

})

app.get("/participants", async (req, res) => {
    
    dataBaseConnect()

    const users = await db.collection("users").find().toArray()

    res.status(200).send(users)
})



app.listen(process.env.SERVER_PORT, () => {
    console.log("Servidor ON")
})