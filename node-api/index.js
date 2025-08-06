const express = require('express');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');
const amqp = require('amqplib');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://root:example@localhost:27017';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  authSource: 'admin'
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// MongoDB Schema
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: Number,
  category: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', itemSchema);

// Kafka configuration
const kafka = new Kafka({
  clientId: 'node-api',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'node-api-group' });

// RabbitMQ connection
let rabbitChannel = null;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URI || 'amqp://guest:guest@localhost:5672');
    rabbitChannel = await connection.createChannel();
    
    // Declare queues
    await rabbitChannel.assertQueue('items_queue', { durable: true });
    await rabbitChannel.assertQueue('notifications_queue', { durable: true });
    
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
  }
}

// Message publishing helper function
async function publishItemEvent(event, data) {
  try {
    // Send Kafka message
    await producer.send({
      topic: 'item-events',
      messages: [{
        value: JSON.stringify({
          event: event,
          data: data,
          timestamp: new Date().toISOString()
        })
      }]
    });
    
    // Send RabbitMQ message
    if (rabbitChannel) {
      const rabbitMessage = {
        action: event.replace('item_', ''), // item_created -> created
        ...(event === 'item_deleted' ? { itemId: data.id } : { item: data }),
        timestamp: new Date().toISOString()
      };
      
      await rabbitChannel.sendToQueue('items_queue', 
        Buffer.from(JSON.stringify(rabbitMessage)),
        { persistent: true }
      );
    }
    
    console.log(`Published ${event} event successfully`);
  } catch (error) {
    console.error(`Error publishing ${event} event:`, error);
    // Don't throw error to avoid breaking the main operation
  }
}

// Initialize message services
async function initializeServices() {
  try {
    // Initialize Kafka producer
    await producer.connect();
    console.log('Kafka producer connected');
    
    // Initialize Kafka consumer
    await consumer.connect();
    await consumer.subscribe({ topic: 'item-events' });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`Received Kafka message: ${message.value.toString()}`);
        // Process the message here
      },
    });
    
    console.log('Kafka consumer connected');
    
    // Initialize RabbitMQ
    await connectRabbitMQ();
    
  } catch (error) {
    console.error('Error initializing services:', error);
  }
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'node-api'
  });
});

// Get all items
app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get item by ID
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new item
app.post('/api/items', async (req, res) => {
  try {
    const item = new Item(req.body);
    const savedItem = await item.save();
    
    // Publish event to message queues
    await publishItemEvent('item_created', savedItem);
    
    res.status(201).json({
      success: true,
      data: savedItem
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update item
app.put('/api/items/:id', async (req, res) => {
  try {
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    // Publish event to message queues
    await publishItemEvent('item_updated', updatedItem);
    
    res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);
    
    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    // Publish event to message queues
    await publishItemEvent('item_deleted', { id: req.params.id });
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search items
app.get('/api/items/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const items = await Item.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ]
    });
    
    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send notification endpoint
app.post('/api/notify', async (req, res) => {
  try {
    const { message, recipient } = req.body;
    
    if (rabbitChannel) {
      await rabbitChannel.sendToQueue('notifications_queue', 
        Buffer.from(JSON.stringify({
          message,
          recipient,
          timestamp: new Date().toISOString()
        })),
        { persistent: true }
      );
      
      res.json({
        success: true,
        message: 'Notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'RabbitMQ not connected'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Node API server running on port ${PORT}`);
  await initializeServices();
});

// Graceful shutdown function
async function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`);
  
  try {
    await producer.disconnect();
    await consumer.disconnect();
    await mongoose.connection.close();
    
    if (rabbitChannel) {
      await rabbitChannel.close();
    }
    
    console.log('All connections closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));