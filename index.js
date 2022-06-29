import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import joi from 'joi'
import dayjs from "dayjs";
import "dayjs/locale/pt-br.js";
import { text } from 'stream/consumers'

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())

const dbClient = new MongoClient(process.env.MONGO_URL);
let db;

/* JOI SCHEMAS */
const nameSchema = joi.object({
    name: joi.string().required()
});

const TextAndToSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required()
});

const typeSchema = joi.object({
    type: joi.string().valid('message', 'private_message').required()
})





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

    dataBaseConnect()

    const { name } = req.body
    const validation = nameSchema.validate({ name })
    const users = await db.collection("users").find({ name }).toArray();
    const reqTime = dayjs().locale('pt-br').format("HH:mm:ss");



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

    dataBaseDisconnect()
})

app.post("/messages", async (req, res) => {

    dataBaseConnect()

    const { user } = req.headers
    const { to, text, type } = req.body
    const users = await db.collection("users").find().toArray()
    const validationToText = TextAndToSchema.validate({ to, text })
    const validationType = typeSchema.validate({ type })
    const reqTime = dayjs().locale('pt-br').format("HH:mm:ss");
    const usernameArrays = users.map(user => user.name);
 
    if (validationToText.error || validationType.error || !(usernameArrays.includes(user))) {
/*         console.log(validationToText.error.details) */
        console.log(validationType.error.details)
        console.log(usernameArrays.includes(user))
        return res.status(422).send()
    }
 
    try {

        await db.collection("messages").insertOne({
            from: user,
            to,
            text,
            type,
            time: reqTime
        })

        res.status(201).send()
        dataBaseDisconnect()

    } catch {
        res.sendStatus(500)
        dataBaseDisconnect()

    }
})

app.get("/messages", async (req, res) => {

    dataBaseConnect()

    const limitPrintMessage = parseInt(req.query.limit)
    const messages = await db.collection("messages").find().toArray()
    const { user } = req.headers

    if (!(isNaN(limitPrintMessage)) && (limitPrintMessage < messages.length) && limitPrintMessage !== 0) {

        let printMessages = []
        const messageNumber = messages.length
        const printMessagesNumber = messageNumber - limitPrintMessage

        for (let i = messageNumber; i > printMessagesNumber; i = i - 1) {

            if ((messages[i - 1].to === "Todos") || (messages[i - 1].to === user) || (messages[i - 1].from === user)) {
                printMessages.unshift(messages[i - 1])
            }
        }

        /* falta conferir se o usuário pode ou não receber essa mensagem */


        return res.send(printMessages)
    }

    res.send(messages)

    dataBaseDisconnect()
})

app.listen(process.env.SERVER_PORT, () => {
    console.log("Servidor ON")
})