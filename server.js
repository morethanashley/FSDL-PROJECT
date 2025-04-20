require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Models
const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    }
}));

const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({
    make: String,
    model: String,
    year: Number,
    batteryCapacity: Number,
    currentBattery: Number,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}));

const Trip = mongoose.model('Trip', new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    startLocation: {
        address: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    endLocation: {
        address: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    departureTime: Date,
    arrivalTime: Date,
    availableSeats: Number,
    passengers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        pickupLocation: {
            address: String,
            coordinates: {
                lat: Number,
                lng: Number
            }
        },
        dropoffLocation: {
            address: String,
            coordinates: {
                lat: Number,
                lng: Number
            }
        }
    }],
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
        default: 'scheduled'
    }
}));

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
// Get all trips
app.get('/api/trips', async (req, res) => {
    try {
        const trips = await Trip.find()
            .populate('driver', 'name email')
            .populate('passengers.user', 'name email');
        res.json(trips);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching trips' });
    }
});

// Create a new trip
app.post('/api/trips', async (req, res) => {
    try {
        const trip = new Trip(req.body);
        await trip.save();
        res.status(201).json(trip);
    } catch (error) {
        res.status(400).json({ error: 'Error creating trip' });
    }
});

// Join a trip
app.post('/api/trips/:tripId/join', async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.tripId);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        
        if (trip.passengers.length >= trip.availableSeats) {
            return res.status(400).json({ error: 'No available seats' });
        }
        
        trip.passengers.push(req.body);
        await trip.save();
        res.json(trip);
    } catch (error) {
        res.status(400).json({ error: 'Error joining trip' });
    }
});

// Get user's trips
app.get('/api/users/:userId/trips', async (req, res) => {
    try {
        const trips = await Trip.find({
            $or: [
                { driver: req.params.userId },
                { 'passengers.user': req.params.userId }
            ]
        })
        .populate('driver', 'name email')
        .populate('passengers.user', 'name email');
        
        res.json(trips);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching user trips' });
    }
});

// Create a new user
app.post('/api/users', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: 'Error creating user' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 