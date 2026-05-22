const dns = require("dns");

// Force Node.js to use Google and Cloudflare DNS servers for all lookups
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

const uri =
  process.env.MONGODB_URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    //Created database
    const db = client.db("paw-heaven");
    const animalCollection = db.collection("animals");
    const adoptionCollection = db.collection("adoptions");

    //Add animals
    app.post("/animals", async (req, res) => {
      const animal = req.body;
      console.log(animal);
      const result = await animalCollection.insertOne(animal);
      res.send(result);
    });
    //getting all the animals
    app.get("/animals", async (req, res) => {
      console.log("Query received:", req.query); 
      const {name , species} = req.query;

      const query = {};
      if(name) query.petName = { $regex: name, $options: "i" };
      if(species) query.species = {$regex : species , $options : "i"}

      const result = await animalCollection.find(query).toArray();
      res.send(result);
    });

    // Get all animals added by a specific user
    app.get("/animals/user/:email", async (req, res) => {
      const email = decodeURIComponent(req.params.email);
      const query = { ownerEmail: email }; // ✅ changed from userEmail to ownerEmail
      const result = await animalCollection.find(query).toArray();
      res.send(result);
    });

    //get one animal data
    app.get("/animals/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await animalCollection.findOne(query);
      res.send(result);
    });
    //edit one animal data
    app.patch("/animals/:id", async (req, res) => {
      const { id } = req.params;
      const updatedAnimal = req.body;
      const result = await animalCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedAnimal },
      );
      res.send(result);
    });
    //delete one animal
    app.delete("/animals/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await animalCollection.deleteOne(query);
      res.send(result);
    });

    // Ensure you have required ObjectId at the top of your backend server file:
    // const { ObjectId } = require('mongodb');

    // 1. POST an adoption request
    app.post("/adoptions", async (req, res) => {
      try {
        const adoption = req.body;
        console.log("Received Adoption Data:", adoption);
        const result = await adoptionCollection.insertOne(adoption);
        res.send(result);
      } catch (error) {
        console.error("Error inserting adoption:", error);
        res.status(500).send({ error: true, message: "Internal Server Error" });
      }
    });

    // 2. GET all adoption requests for the LOGGED-IN USER (For My Requests Page)
    app.get("/adoptions/user/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { userEmail: email };
        const result = await adoptionCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching user adoptions:", error);
        res.status(500).send({ error: true, message: "Internal Server Error" });
      }
    });

    // 3. GET all adoption requests for a SPECIFIC PET (For the Requests Modal in My Listings)
    app.get("/adoptions/pet/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { petId: id };
        const result = await adoptionCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching pet adoptions:", error);
        res.status(500).send({ error: true, message: "Internal Server Error" });
      }
    });
    
    // GET /adoptions/check?petId=xxx&email=yyy
    app.get("/adoptions/check", async (req, res) => {
      try {
        const { petId, email } = req.query;

        if (!petId || !email) {
          return res
            .status(400)
            .json({ error: true, message: "petId and email are required" });
        }

        const existing = await adoptionCollection.findOne({
          petId: petId,
          userEmail: email, // ✅ matches your actual field name
        });

        res.json({ hasApplied: !!existing });
      } catch (error) {
        console.error("Error checking adoption:", error);
        res.status(500).json({ error: true, message: "Internal Server Error" });
      }
    });
    // 4. PUT (Update) the status of an adoption request (Approve/Reject)
    app.put("/adoptions/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: { status: status },
        };
        const result = await adoptionCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating adoption status:", error);
        res.status(500).send({ error: true, message: "Internal Server Error" });
      }
    });

    // DELETE an adoption request (Cancel Request)
    app.delete("/adoptions/:id", async (req, res) => {
      try {
        const id = req.params.id;
        // Make sure to use ObjectId!
        const query = { _id: new ObjectId(id) };
        const result = await adoptionCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          res.send({ success: true, message: "Request successfully deleted" });
        } else {
          res.status(404).send({ error: true, message: "Request not found" });
        }
      } catch (error) {
        console.error("Error deleting request:", error);
        res.status(500).send({ error: true, message: "Internal Server Error" });
      }
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
