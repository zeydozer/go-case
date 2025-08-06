# Go Case - Microservices Architecture

## Services Status
- ✅ MongoDB
- ✅ Zookeeper
- ✅ Kafka
- ✅ RabbitMQ
- ✅ Node API
- ✅ Go Service
- ✅ React App

## Architecture Flow

### Message Queue Communication
```
Node.js API ←→ Kafka ←→ Go Service
Node.js API ←→ RabbitMQ ←→ Go Service
```

### Database Communication
```
Go Service ←→ MongoDB ←→ Node.js API
```

### Frontend Communication
```
React App → Node.js API → MongoDB
React App → Go Service → MongoDB
React App → Test Events → Kafka/RabbitMQ
```