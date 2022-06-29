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
setInterval(offUsersRemove, 5000)

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

async function offUsersRemove() {

    dataBaseConnect()
    const dateNow = Date.now()
    const users = await db.collection("users").find().toArray()

    console.log(users)

    users.map(user => {

        if ((dateNow - user.lastStatus) > 10000) {
            const userId = user._id;
            const remove = db.collection("users").deleteOne({ _id: userId })
            return remove
        }
    })
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

})

app.get("/participants", async (req, res) => {

    dataBaseConnect()

    const users = await db.collection("users").find().toArray()

    res.status(200).send(users)

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



    try {

        if (validationToText.error || validationType.error || !(usernameArrays.includes(user))) {
            return res.status(422).send()
        }

        await db.collection("messages").insertOne({
            from: user,
            to,
            text,
            type,
            time: reqTime
        })

        res.status(201).send()


    } catch {
        res.sendStatus(500)


    }
})

app.get("/messages", async (req, res) => {
 
    dataBaseConnect()

    const limitPrintMessage = parseInt(req.query.limit)
    const messages = await db.collection("messages").find().toArray()
    const { user } = req.headers
    const userMessages = []

    messages.map((message) => {

        if ((message.type === "message") || (message.type === "status") || (message.to === user) || (message.from === user)) {
            userMessages.push(message)
        }})

        if (!(isNaN(limitPrintMessage)) && (limitPrintMessage < userMessages.length) && limitPrintMessage !== 0) {

            let printMessages = []
            const messageNumber = userMessages.length
            const printMessagesNumber = messageNumber - limitPrintMessage

            for (let i = messageNumber; i > printMessagesNumber; i = i - 1) {

                if ((userMessages[i - 1].type === "message") || (userMessages[i - 1].to === user) || (userMessages[i - 1].from === user)) {
                    printMessages.unshift(userMessages[i - 1])
                }
            }

            return res.send(printMessages)
        }

        res.send(userMessages)

    })


app.post("/status", async (req, res) => {

    dataBaseConnect()

    const { user } = req.headers
    const userFind = await db.collection("users").find({
        name: user
    }).toArray()

    if (userFind.length === 0) {
        res.status(404).send()
    }

    try {
        const userId = userFind[0]._id
        const update = await db.collection("users").updateOne({ _id: userId }, { $set: { lastStatus: Date.now() } })

        res.status(200).send(update)
    } catch {
        res.status(500).send()
    }
})


app.listen(process.env.SERVER_PORT, () => {
    console.log("Servidor ON")
})