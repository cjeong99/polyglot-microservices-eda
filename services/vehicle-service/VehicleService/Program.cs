using System.Text.Json;
using Confluent.Kafka;

// ---- Config from environment variables (Docker)
var broker = Environment.GetEnvironmentVariable("KAFKA_BROKER") ?? "redpanda:9092";
var groupId = Environment.GetEnvironmentVariable("KAFKA_GROUP_ID") ?? "vehicle-service-group";
var inputTopic = Environment.GetEnvironmentVariable("TOPIC_RIDE_REQUESTED") ?? "ride.requested";
var outputTopic = Environment.GetEnvironmentVariable("TOPIC_VEHICLE_ASSIGNED") ?? "vehicle.assigned";

Console.WriteLine($"[vehicle-service] Starting...");
Console.WriteLine($"[vehicle-service] Broker: {broker}");
Console.WriteLine($"[vehicle-service] GroupId: {groupId}");
Console.WriteLine($"[vehicle-service] Consume: {inputTopic}");
Console.WriteLine($"[vehicle-service] Produce: {outputTopic}");

// ---- Consumer config
var consumerConfig = new ConsumerConfig
{
    BootstrapServers = broker,
    GroupId = groupId,
    AutoOffsetReset = AutoOffsetReset.Earliest,
    EnableAutoCommit = true,
};

// ---- Producer config
var producerConfig = new ProducerConfig
{
    BootstrapServers = broker,
};

// ---- Create consumer + producer
using var consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
using var producer = new ProducerBuilder<string, string>(producerConfig).Build();

// Subscribe to ride.requested
consumer.Subscribe(inputTopic);

// Simple driver/vehicle assignment generator
string AssignDriverId() => $"driver-{Random.Shared.Next(1, 50):D3}";
string AssignVehicleId() => $"vehicle-{Random.Shared.Next(1, 200):D3}";

Console.WriteLine("[vehicle-service] Listening for events...");

try
{
    while (true)
    {
        var cr = consumer.Consume(TimeSpan.FromSeconds(1));
        if (cr == null) continue;

        Console.WriteLine($"[vehicle-service] Received message:");
        Console.WriteLine($"  Topic: {cr.Topic}, Partition: {cr.Partition}, Offset: {cr.Offset}");
        Console.WriteLine($"  Value: {cr.Message.Value}");

        // Parse rideId from the incoming JSON (best effort)
        string? rideId = null;
        try
        {
            using var doc = JsonDocument.Parse(cr.Message.Value);
            if (doc.RootElement.TryGetProperty("rideId", out var rideIdProp))
                rideId = rideIdProp.GetString();
        }
        catch
        {
            // ignore parsing errors; still publish assigned event without parsing
        }

        rideId ??= $"ride-unknown-{cr.Offset.Value}";
        var driverId = AssignDriverId();
        var vehicleId = AssignVehicleId();

        var assignedEvent = new
        {
            eventType = "VehicleAssigned",
            rideId,
            driverId,
            vehicleId,
            assignedAt = DateTime.UtcNow.ToString("o")
        };

        var assignedJson = JsonSerializer.Serialize(assignedEvent);

        // Publish vehicle.assigned
        await producer.ProduceAsync(outputTopic, new Message<string, string>
        {
            Key = rideId,
            Value = assignedJson
        });

        Console.WriteLine($"[vehicle-service] Published VehicleAssigned for rideId={rideId}");
    }
}
catch (OperationCanceledException)
{
    Console.WriteLine("[vehicle-service] Cancelled.");
}
finally
{
    consumer.Close();
}
