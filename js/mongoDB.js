const { MongoClient,ServerApiVersion } = require("mongodb");

const client = new MongoClient(process.env.MONGO_URL,{
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    }
});

const database = client.db("twitter_trend");

const connectClient = async () => {
    try{
        await client.connect();
    }
    catch(err){
        console.log(err);
    }
}

//fetching latest data from databse.
const getTrends = async () => {
    let res = await database.collection("fetched_data").findOne({},{sort:{$natural:-1}});
    return res;
}

//add new data to database.
const addData = async (obj) => {
    let res = await database.collection("fetched_data").insertOne({
        _id: Date.now(),
        trends: obj.trends,
        date: obj.date,
        time: obj.time,
        ip_addr: obj.ip
    })
    return res;
}

const closeConnection = async () => {
    try{
        await client.close();
    }
    catch(err){
        console.log(err);
    }
}

module.exports = {connectClient,getTrends,addData,closeConnection};
