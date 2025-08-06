package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/segmentio/kafka-go"
	"github.com/streadway/amqp"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Structs
type Item struct {
	ID          primitive.ObjectID `json:"_id,omitempty" bson:"_id,omitempty"`
	Name        string             `json:"name" bson:"name"`
	Description string             `json:"description" bson:"description"`
	Price       float64            `json:"price" bson:"price"`
	Category    string             `json:"category" bson:"category"`
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt" bson:"updatedAt"`
}

type KafkaMessage struct {
	Event     string      `json:"event"`
	Data      interface{} `json:"data"`
	Timestamp string      `json:"timestamp"`
}

type RabbitMessage struct {
	Action    string      `json:"action"`
	Item      interface{} `json:"item,omitempty"`
	ItemID    string      `json:"itemId,omitempty"`
	Timestamp string      `json:"timestamp"`
}

type NotificationMessage struct {
	Message   string `json:"message"`
	Recipient string `json:"recipient"`
	Timestamp string `json:"timestamp"`
}

// Global variables
var (
	mongoClient    *mongo.Client
	kafkaReader    *kafka.Reader
	kafkaWriter    *kafka.Writer
	rabbitConn     *amqp.Connection
	rabbitChannel  *amqp.Channel
	itemCollection *mongo.Collection
)

// Configuration
type Config struct {
	MongoURI    string
	KafkaBroker string
	RabbitURI   string
	Port        string
}

func loadConfig() *Config {
	godotenv.Load()

	return &Config{
		MongoURI:    getEnv("MONGO_URI", "mongodb://root:example@localhost:27017"),
		KafkaBroker: getEnv("KAFKA_BROKER", "localhost:9092"),
		RabbitURI:   getEnv("RABBITMQ_URI", "amqp://guest:guest@localhost:5672"),
		Port:        getEnv("PORT", "8080"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Database connection
func connectMongoDB(uri string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Test connection
	if err := client.Ping(ctx, nil); err != nil {
		return fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	mongoClient = client
	itemCollection = client.Database("goservice").Collection("items")
	log.Println("Connected to MongoDB successfully")
	return nil
}

// Kafka connection
func connectKafka(broker string) error {
	// Kafka reader for consuming messages
	kafkaReader = kafka.NewReader(kafka.ReaderConfig{
		Brokers:  []string{broker},
		Topic:    "item-events",
		GroupID:  "go-service-group",
		MinBytes: 10e3, // 10KB
		MaxBytes: 10e6, // 10MB
	})

	// Kafka writer for producing messages
	kafkaWriter = &kafka.Writer{
		Addr:     kafka.TCP(broker),
		Topic:    "go-events",
		Balancer: &kafka.LeastBytes{},
	}

	log.Println("Connected to Kafka successfully")
	return nil
}

// RabbitMQ connection
func connectRabbitMQ(uri string) error {
	conn, err := amqp.Dial(uri)
	if err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		return fmt.Errorf("failed to open RabbitMQ channel: %w", err)
	}

	// Declare queues
	queues := []string{"items_queue", "notifications_queue", "go_events_queue"}
	for _, queue := range queues {
		_, err := ch.QueueDeclare(
			queue, // name
			true,  // durable
			false, // delete when unused
			false, // exclusive
			false, // no-wait
			nil,   // arguments
		)
		if err != nil {
			return fmt.Errorf("failed to declare queue %s: %w", queue, err)
		}
	}

	rabbitConn = conn
	rabbitChannel = ch
	log.Println("Connected to RabbitMQ successfully")
	return nil
}

// Message consumers
func startKafkaConsumer() {
	go func() {
		for {
			message, err := kafkaReader.ReadMessage(context.Background())
			if err != nil {
				log.Printf("Error reading Kafka message: %v", err)
				continue
			}

			var kafkaMsg KafkaMessage
			if err := json.Unmarshal(message.Value, &kafkaMsg); err != nil {
				log.Printf("Error unmarshaling Kafka message: %v", err)
				continue
			}

			log.Printf("Received Kafka message: %s - %s", kafkaMsg.Event, kafkaMsg.Timestamp)
			
			// Process the message based on event type
			processKafkaMessage(kafkaMsg)
		}
	}()
}

func startRabbitConsumer() {
	go func() {
		msgs, err := rabbitChannel.Consume(
			"items_queue", // queue
			"go-service",  // consumer
			true,          // auto-ack
			false,         // exclusive
			false,         // no-local
			false,         // no-wait
			nil,           // args
		)
		if err != nil {
			log.Printf("Error setting up RabbitMQ consumer: %v", err)
			return
		}

		for msg := range msgs {
			var rabbitMsg RabbitMessage
			if err := json.Unmarshal(msg.Body, &rabbitMsg); err != nil {
				log.Printf("Error unmarshaling RabbitMQ message: %v", err)
				continue
			}

			log.Printf("Received RabbitMQ message: %s - %s", rabbitMsg.Action, rabbitMsg.Timestamp)
			
			// Process the message based on action type
			processRabbitMessage(rabbitMsg)
		}
	}()

	// Also consume notification messages
	go func() {
		msgs, err := rabbitChannel.Consume(
			"notifications_queue", // queue
			"go-service-notify",   // consumer
			true,                  // auto-ack
			false,                 // exclusive
			false,                 // no-local
			false,                 // no-wait
			nil,                   // args
		)
		if err != nil {
			log.Printf("Error setting up RabbitMQ notification consumer: %v", err)
			return
		}

		for msg := range msgs {
			var notifyMsg NotificationMessage
			if err := json.Unmarshal(msg.Body, &notifyMsg); err != nil {
				log.Printf("Error unmarshaling notification message: %v", err)
				continue
			}

			log.Printf("Received notification: %s for %s", notifyMsg.Message, notifyMsg.Recipient)
			// Here you could send email, SMS, push notification etc.
			processNotification(notifyMsg)
		}
	}()
}

// Message processors
func processKafkaMessage(msg KafkaMessage) {
	// Send response to Kafka
	response := map[string]interface{}{
		"original_event": msg.Event,
		"processed_by":   "go-service",
		"timestamp":      time.Now().Format(time.RFC3339),
		"status":         "processed",
	}

	responseBytes, _ := json.Marshal(response)
	kafkaWriter.WriteMessages(context.Background(), kafka.Message{
		Value: responseBytes,
	})
}

func processRabbitMessage(msg RabbitMessage) {
	// Send response to RabbitMQ
	response := map[string]interface{}{
		"original_action": msg.Action,
		"processed_by":    "go-service",
		"timestamp":       time.Now().Format(time.RFC3339),
		"status":          "processed",
	}

	responseBytes, _ := json.Marshal(response)
	rabbitChannel.Publish(
		"",               // exchange
		"go_events_queue", // routing key
		false,            // mandatory
		false,            // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        responseBytes,
		},
	)
}

func processNotification(msg NotificationMessage) {
	// Simulate notification processing
	log.Printf("Processing notification: %s", msg.Message)
	
	// Here you could integrate with:
	// - Email service (SendGrid, AWS SES)
	// - SMS service (Twilio)
	// - Push notification service (Firebase)
	// - Slack, Discord webhooks
	
	// For now, just log it
	response := map[string]interface{}{
		"notification_id": primitive.NewObjectID().Hex(),
		"recipient":       msg.Recipient,
		"status":          "sent",
		"processed_by":    "go-service",
		"timestamp":       time.Now().Format(time.RFC3339),
	}

	responseBytes, _ := json.Marshal(response)
	rabbitChannel.Publish(
		"",               // exchange
		"go_events_queue", // routing key
		false,            // mandatory
		false,            // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        responseBytes,
		},
	)
}

// HTTP handlers
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "OK",
		"service":   "go-service",
		"timestamp": time.Now().Format(time.RFC3339),
		"version":   "1.0.0",
	})
}

func getItems(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := itemCollection.Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch items",
		})
		return
	}
	defer cursor.Close(ctx)

	var items []Item
	if err := cursor.All(ctx, &items); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to decode items",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    items,
		"count":   len(items),
	})
}

func getItemByID(c *gin.Context) {
	id := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid item ID",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var item Item
	err = itemCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&item)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Item not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch item",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    item,
	})
}

func getStats(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Count total items
	totalItems, _ := itemCollection.CountDocuments(ctx, bson.M{})

	// Count items by category
	pipeline := []bson.M{
		{
			"$group": bson.M{
				"_id":   "$category",
				"count": bson.M{"$sum": 1},
			},
		},
	}

	cursor, err := itemCollection.Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get statistics",
		})
		return
	}
	defer cursor.Close(ctx)

	var categoryStats []bson.M
	cursor.All(ctx, &categoryStats)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_items":      totalItems,
			"category_stats":   categoryStats,
			"service":          "go-service",
			"last_updated":     time.Now().Format(time.RFC3339),
		},
	})
}

func sendEvent(c *gin.Context) {
	var requestBody map[string]interface{}
	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	// Send to Kafka
	event := map[string]interface{}{
		"event":      "custom_event",
		"data":       requestBody,
		"timestamp":  time.Now().Format(time.RFC3339),
		"source":     "go-service",
	}

	eventBytes, _ := json.Marshal(event)
	kafkaWriter.WriteMessages(context.Background(), kafka.Message{
		Value: eventBytes,
	})

	// Send to RabbitMQ
	rabbitChannel.Publish(
		"",               // exchange
		"go_events_queue", // routing key
		false,            // mandatory
		false,            // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        eventBytes,
		},
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Event sent successfully",
	})
}

// Setup routes
func setupRoutes() *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Routes
	router.GET("/health", healthCheck)
	router.GET("/api/items", getItems)
	router.GET("/api/items/:id", getItemByID)
	router.GET("/api/stats", getStats)
	router.POST("/api/events", sendEvent)

	return router
}

// Graceful shutdown
func gracefulShutdown(server *http.Server) {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Shutdown HTTP server
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	// Close connections
	if kafkaReader != nil {
		kafkaReader.Close()
	}
	if kafkaWriter != nil {
		kafkaWriter.Close()
	}
	if rabbitChannel != nil {
		rabbitChannel.Close()
	}
	if rabbitConn != nil {
		rabbitConn.Close()
	}
	if mongoClient != nil {
		mongoClient.Disconnect(context.Background())
	}

	log.Println("Server exited")
}

func main() {
	// Load configuration
	config := loadConfig()

	// Connect to services
	if err := connectMongoDB(config.MongoURI); err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	if err := connectKafka(config.KafkaBroker); err != nil {
		log.Fatalf("Failed to connect to Kafka: %v", err)
	}

	if err := connectRabbitMQ(config.RabbitURI); err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}

	// Start message consumers
	startKafkaConsumer()
	startRabbitConsumer()

	// Setup HTTP server
	router := setupRoutes()
	server := &http.Server{
		Addr:    ":" + config.Port,
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Go service starting on port %s", config.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for shutdown signal
	gracefulShutdown(server)
}
