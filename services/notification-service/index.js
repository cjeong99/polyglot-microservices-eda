const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: [process.env.KAFKA_BROKER || "redpanda:9092"],
});

const consumer = kafka.consumer({ groupId: "notification-group" });
const producer = kafka.producer();

const TOPIC_VEHICLE_ASSIGNED = "vehicle.assigned";
const TOPIC_NOTIFICATION_SENT = "notification.sent";

async function run() {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({ topic: TOPIC_VEHICLE_ASSIGNED });

  console.log("Notification service listening...");

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());

      console.log("Vehicle assigned:", event);

      // Simulate sending notification
      const notificationEvent = {
        userId: event.userId,
        rideId: event.rideId,
        message: "Your vehicle is on the way 🚗",
        sentAt: new Date().toISOString(),
      };

      await producer.send({
        topic: TOPIC_NOTIFICATION_SENT,
        messages: [{ value: JSON.stringify(notificationEvent) }],
      });

      console.log("Notification sent event published.");
    },
  });
}

run().catch(console.error);
