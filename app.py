from flask import Flask, request, jsonify, send_from_directory, session, render_template, redirect, url_for
from flask_cors import CORS
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
import secrets
from functools import wraps

app = Flask(__name__, 
    static_folder='public',
    static_url_path='',
    template_folder='templates'
)
CORS(app, supports_credentials=True)
app.secret_key = secrets.token_hex(16)  # For session management

# SQLite database setup
engine = create_engine('sqlite:///ev_sharing.db')
Base = declarative_base()
Session = sessionmaker(bind=engine)

# Database Models
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    password = Column(String(100), nullable=False)  # In a real app, use proper password hashing
    is_driver = Column(Boolean, default=False)
    vehicles = relationship("Vehicle", back_populates="owner")
    trips_as_driver = relationship("Trip", back_populates="driver", foreign_keys="Trip.driver_id")
    trips_as_passenger = relationship("TripPassenger", back_populates="passenger")

class Vehicle(Base):
    __tablename__ = 'vehicles'
    id = Column(Integer, primary_key=True)
    make = Column(String(50), nullable=False)
    model = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)
    battery_capacity = Column(Float, nullable=False)
    current_battery = Column(Float, nullable=False)
    owner_id = Column(Integer, ForeignKey('users.id'))
    owner = relationship("User", back_populates="vehicles")

class Trip(Base):
    __tablename__ = 'trips'
    id = Column(Integer, primary_key=True)
    driver_id = Column(Integer, ForeignKey('users.id'))
    start_location_address = Column(String(200), nullable=False)
    start_location_lat = Column(Float)
    start_location_lng = Column(Float)
    end_location_address = Column(String(200), nullable=False)
    end_location_lat = Column(Float)
    end_location_lng = Column(Float)
    departure_time = Column(DateTime, nullable=False)
    arrival_time = Column(DateTime, nullable=False)
    available_seats = Column(Integer, nullable=False)
    status = Column(String(20), default='scheduled')
    driver = relationship("User", back_populates="trips_as_driver")
    passengers = relationship("TripPassenger", back_populates="trip")

class TripPassenger(Base):
    __tablename__ = 'trip_passengers'
    id = Column(Integer, primary_key=True)
    trip_id = Column(Integer, ForeignKey('trips.id'))
    passenger_id = Column(Integer, ForeignKey('users.id'))
    pickup_location_address = Column(String(200), nullable=False)
    pickup_location_lat = Column(Float)
    pickup_location_lng = Column(Float)
    dropoff_location_address = Column(String(200), nullable=False)
    dropoff_location_lat = Column(Float)
    dropoff_location_lng = Column(Float)
    seats_requested = Column(Integer, default=1)
    trip = relationship("Trip", back_populates="passengers")
    passenger = relationship("User", back_populates="trips_as_passenger")

# Create tables
Base.metadata.create_all(engine)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def home():
    if 'user_id' in session:
        return redirect(url_for('trips'))
    return render_template('home.html')

@app.route('/login')
def login_page():
    if 'user_id' in session:
        return redirect(url_for('trips'))
    return render_template('login.html')

@app.route('/register')
def register_page():
    if 'user_id' in session:
        return redirect(url_for('trips'))
    return render_template('register.html')

@app.route('/trips')
def trips():
    print("Trips route accessed")  # Debug log
    if 'user_id' not in session:
        print("No user_id in session, redirecting to login")  # Debug log
        return redirect(url_for('login_page'))
    
    db_session = Session()
    try:
        current_user = db_session.query(User).get(session['user_id'])
        if not current_user:
            print("User not found in database")  # Debug log
            return redirect(url_for('login_page'))
        print(f"Current user: {current_user.name}")  # Debug log
        return render_template('trips.html', current_user=current_user)
    finally:
        db_session.close()

@app.route('/profile')
@login_required
def profile():
    db_session = Session()
    try:
        user = db_session.query(User).get(session['user_id'])
        if not user:
            return redirect(url_for('login_page'))
            
        # Get user's trips as driver
        driver_trips = db_session.query(Trip).filter_by(driver_id=user.id).all()
        
        # Get user's trips as passenger
        passenger_trips = db_session.query(Trip).join(TripPassenger).filter(
            TripPassenger.passenger_id == user.id
        ).all()
        
        # Combine and sort trips
        all_trips = driver_trips + passenger_trips
        upcoming_trips = [trip for trip in all_trips if trip.departure_time > datetime.now()]
        past_trips = [trip for trip in all_trips if trip.departure_time <= datetime.now()]
        
        return render_template('profile.html', 
            current_user=user,
            upcoming_trips=upcoming_trips,
            past_trips=past_trips
        )
    finally:
        db_session.close()

# Serve static files
@app.route('/<path:path>')
def serve_static(path):
    if path.startswith('public/'):
        return send_from_directory('.', path)
    return send_from_directory('public', path)

# API Routes
@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    db_session = Session()
    
    # Check if email already exists
    existing_user = db_session.query(User).filter_by(email=data['email']).first()
    if existing_user:
        db_session.close()
        return jsonify({'error': 'Email already registered'}), 400
    
    try:
        user = User(
            name=data['name'],
            email=data['email'],
            phone=data['phone'],
            password=data['password'],  # In a real app, hash this password
            is_driver=data.get('is_driver', False)
        )
        db_session.add(user)
        db_session.commit()
        
        # Automatically log in the user after registration
        session['user_id'] = user.id
        session['user_type'] = 'driver' if user.is_driver else 'passenger'
        
        return jsonify({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'is_driver': user.is_driver
        }), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db_session.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')  # In a real app, you'd hash this
    
    db_session = Session()
    user = db_session.query(User).filter_by(email=email).first()
    db_session.close()
    
    if user and user.password == password:  # In a real app, use proper password hashing
        session['user_id'] = user.id
        session['user_type'] = 'driver' if user.is_driver else 'passenger'
        return jsonify({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'is_driver': user.is_driver
        })
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/current_user')
def get_current_user():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    db_session = Session()
    try:
        user = db_session.query(User).get(session['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'is_driver': user.is_driver
        })
    finally:
        db_session.close()

@app.route('/api/trips')
def get_trips():
    db_session = Session()
    try:
        trips = db_session.query(Trip).all()
        trips_data = []
        for trip in trips:
            trips_data.append({
                'id': trip.id,
                'start_location': trip.start_location_address,
                'end_location': trip.end_location_address,
                'departure_time': trip.departure_time.isoformat(),
                'available_seats': trip.available_seats
            })
        return jsonify(trips_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db_session.close()

@app.route('/api/trips', methods=['POST'])
def create_trip():
    db_session = Session()
    try:
        data = request.json
        trip = Trip(
            driver_id=session.get('user_id', 1),  # Default to user 1 for testing
            start_location_address=data['start_location'],
            end_location_address=data['end_location'],
            departure_time=datetime.fromisoformat(data['departure_time']),
            arrival_time=datetime.fromisoformat(data['departure_time']),  # Same as departure for now
            available_seats=data['available_seats']
        )
        db_session.add(trip)
        db_session.commit()
        return jsonify({'id': trip.id}), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db_session.close()

@app.route('/api/trips/<int:trip_id>/join', methods=['POST'])
def join_trip(trip_id):
    db_session = Session()
    try:
        trip = db_session.query(Trip).get(trip_id)
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404
        
        if trip.available_seats <= 0:
            return jsonify({'error': 'No available seats'}), 400
        
        trip.available_seats -= 1
        db_session.commit()
        return jsonify({'message': 'Successfully joined trip'}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db_session.close()

@app.route('/api/add_user', methods=['POST'])
def add_user():
    db_session = Session()
    try:
        data = request.json
        user = User(
            name=data['name'],
            email=data['email'],
            phone=data['phone'],
            password=data['password'],
            is_driver=data.get('is_driver', False)
        )
        db_session.add(user)
        db_session.commit()
        return jsonify({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'is_driver': user.is_driver
        })
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db_session.close()

# Simple login that just sets the user in session
@app.route('/api/simple_login', methods=['POST'])
def simple_login():
    data = request.json
    db_session = Session()
    try:
        user = db_session.query(User).filter_by(email=data['email']).first()
        if user and user.password == data['password']:
            session['user_id'] = user.id
            session['user_type'] = 'driver' if user.is_driver else 'passenger'
            return jsonify({
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'is_driver': user.is_driver
            })
        return jsonify({'error': 'Invalid credentials'}), 401
    finally:
        db_session.close()

@app.route('/api/debug/trips')
def debug_trips():
    db_session = Session()
    try:
        trips = db_session.query(Trip).all()
        trips_data = []
        for trip in trips:
            trips_data.append({
                'id': trip.id,
                'start_location': trip.start_location_address,
                'end_location': trip.end_location_address,
                'departure_time': trip.departure_time.isoformat(),
                'arrival_time': trip.arrival_time.isoformat(),
                'available_seats': trip.available_seats,
                'driver_id': trip.driver_id
            })
        return jsonify({
            'total_trips': len(trips),
            'trips': trips_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db_session.close()

if __name__ == '__main__':
    app.run(debug=True) 