console.log("RUNNING FILE:", __filename);
console.log("KAFKA_BROKER ENV:", process.env.KAFKA_BROKER);

const express = require("express");
const { Kafka } = require("kafkajs");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// ---- Config (will come from env in Docker later)
const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER || "ridedb";
const DB_PASSWORD = process.env.DB_PASSWORD || "ridedb";
const DB_NAME = process.env.DB_NAME || "ridedb";

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
console.log("Using Kafka broker:", KAFKA_BROKER);
const TOPIC_RIDE_REQUESTED = "ride.requested";

// ---- Postgres pool
const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

// ---- Kafka producer
const kafka = new Kafka({ clientId: "ride-service", brokers: [KAFKA_BROKER] });
const producer = kafka.producer();

// ---- DB init: create table if not exists
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rides (
      ride_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pickup_lat DOUBLE PRECISION NOT NULL,
      pickup_lng DOUBLE PRECISION NOT NULL,
      dropoff_lat DOUBLE PRECISION NOT NULL,
      dropoff_lng DOUBLE PRECISION NOT NULL,
      requested_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

app.get("/health", async (req, res) => {
  res.json({ status: "ride-service ok" });
});

app.post("/rides/request", async (req, res) => {
  try {
    const { rideId, userId, pickup, dropoff } = req.body;

    if (!rideId || !userId || !pickup || !dropoff) {
      return res.status(400).json({
        error: "Missing fields. Required: rideId, userId, pickup{lat,lng}, dropoff{lat,lng}",
      });
    }

    // 1) Save to DB
    await pool.query(
      `INSERT INTO rides (ride_id, user_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (ride_id) DO NOTHING`,
      [rideId, userId, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]
    );


    // 2) Publish event
    const event = {
      rideId,
      userId,
      pickup,
      dropoff,
      requestedAt: new Date().toISOString(),
    };
    console.log("Publishing to Kafka broker:", KAFKA_BROKER);
    await producer.send({
      topic: TOPIC_RIDE_REQUESTED,
      messages: [{ value: JSON.stringify(event) }],
    });

    res.json({ ok: true, published: TOPIC_RIDE_REQUESTED, event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error", details: err.message });
  }
});

async function start() {
  await initDb();
  await producer.connect();
  app.listen(PORT, () => console.log(`Ride service listening on ${PORT}`));
}

start();

