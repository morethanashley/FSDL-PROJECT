// Global state
let currentUser = null;
let selectedTripId = null;

// Authentication functions
async function login(email, password) {
    try {
        console.log('Attempting login with:', { email });
        
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });
        
        console.log('Login response status:', response.status);
        const data = await response.json();
        console.log('Login response data:', data);
        
        if (response.ok) {
            currentUser = data;
            updateUIForLoggedInUser();
            window.location.href = '/trips';
        } else {
            console.error('Login failed:', data.error);
            alert('Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login. Please try again.');
    }
}

async function registerUser(name, email, password, phone, isDriver) {
    try {
        console.log('Attempting registration with:', { name, email, phone, isDriver });
        
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                password,
                phone,
                is_driver: isDriver
            }),
            credentials: 'include'
        });

        console.log('Registration response status:', response.status);
        const data = await response.json();
        console.log('Registration response data:', data);

        if (response.ok) {
            currentUser = data;
            console.log('Registration successful, current user:', currentUser);
            updateUIForLoggedInUser();
            // Add a small delay before redirecting to ensure UI updates
            setTimeout(() => {
                window.location.href = '/trips';
            }, 500);
        } else {
            console.error('Registration failed:', data.error);
            alert(`Registration failed: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during registration. Please try again.');
    }
}

async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        // Clear local state regardless of response
        currentUser = null;
        sessionStorage.clear();
        localStorage.clear();
        
        // Always redirect to login page
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
        // Still redirect even if there's an error
        window.location.href = '/login';
    }
}

async function checkCurrentUser() {
    try {
        const response = await fetch('/api/current_user', {
            credentials: 'include'
        });
        if (response.ok) {
            currentUser = await response.json();
            updateUIForLoggedInUser();
        }
    } catch (error) {
        console.error('Error checking current user:', error);
    }
}

// Update UI based on authentication state
function updateUIForLoggedInUser() {
    console.log('Updating UI for logged in user:', currentUser);
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const userInfo = document.getElementById('userInfo');
    const createTripButton = document.getElementById('createTripButton');
    
    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
    if (userInfo) {
        userInfo.style.display = 'block';
        const userName = document.getElementById('userName');
        const userType = document.getElementById('userType');
        if (userName) userName.textContent = currentUser.name;
        if (userType) userType.textContent = currentUser.is_driver ? 'Driver' : 'Passenger';
    }
    if (createTripButton) {
        createTripButton.style.display = currentUser.is_driver ? 'block' : 'none';
    }
}

function updateUIForLoggedOutUser() {
    document.getElementById('loginLink').style.display = 'block';
    document.getElementById('registerLink').style.display = 'block';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('createTripButton').style.display = 'none';
}

// Update trip display to show user's participation
function displayTrips(trips) {
    const tripsList = document.getElementById('tripsList');
    tripsList.innerHTML = '';
    
    trips.forEach(trip => {
        const tripElement = document.createElement('div');
        tripElement.className = 'trip-card';
        
        let status = '';
        if (trip.is_user_driver) {
            status = 'You are the driver';
        } else if (trip.is_user_in_trip) {
            status = 'You are a passenger';
        } else if (trip.available_seats > 0) {
            status = `${trip.available_seats} seats available`;
        } else {
            status = 'Trip full';
        }
        
        // Create passengers list
        let passengersList = '';
        if (trip.passengers && trip.passengers.length > 0) {
            passengersList = '<div class="passengers-list"><strong>Passengers:</strong><ul>';
            trip.passengers.forEach(passenger => {
                passengersList += `<li>${passenger.name} (${passenger.seats_requested} seat${passenger.seats_requested > 1 ? 's' : ''})</li>`;
            });
            passengersList += '</ul></div>';
        } else {
            passengersList = '<p>No passengers yet</p>';
        }
        
        tripElement.innerHTML = `
            <div class="trip-header">
                <h3>Trip from ${trip.start_location.address} to ${trip.end_location.address}</h3>
                <span class="trip-status">${status}</span>
            </div>
            <div class="trip-details">
                <p><strong>Driver:</strong> ${trip.driver.name}</p>
                <p><strong>Departure:</strong> ${new Date(trip.departure_time).toLocaleString()}</p>
                <p><strong>Arrival:</strong> ${new Date(trip.arrival_time).toLocaleString()}</p>
                <p><strong>Total Seats:</strong> ${trip.total_seats}</p>
                <p><strong>Available Seats:</strong> ${trip.available_seats}</p>
                ${passengersList}
            </div>
            <div class="trip-actions">
                ${!trip.is_user_in_trip && !trip.is_user_driver && trip.available_seats > 0 ? 
                    `<button class="join-button" onclick="showJoinTripModal(${trip.id})">Join Trip</button>` : 
                    `<span class="trip-status-message">${
                        trip.is_user_in_trip ? 'You are a passenger' : 
                        trip.is_user_driver ? 'You are the driver' : 
                        'Trip is full'
                    }</span>`
                }
            </div>
        `;
        
        tripsList.appendChild(tripElement);
    });
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function showJoinTripModal(tripId) {
    const modal = document.getElementById('joinTripModal');
    const tripIdInput = document.getElementById('trip_id');
    tripIdInput.value = tripId;
    modal.style.display = 'block';
}

// Load trips when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadTrips();
    setupCreateTripForm();
});

// Trips functionality
function loadTrips() {
    const tripsList = document.getElementById('trips-list');
    if (!tripsList) {
        console.error('Trips list element not found');
        return;
    }

    fetch('/api/trips')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load trips');
            }
            return response.json();
        })
        .then(trips => {
            if (!trips || trips.length === 0) {
                tripsList.innerHTML = '<p class="no-trips">No trips available</p>';
                return;
            }

            tripsList.innerHTML = trips.map(trip => `
                <div class="trip-card">
                    <div class="trip-info">
                        <h3>${trip.start_location} → ${trip.end_location}</h3>
                        <div class="trip-detail">
                            <p>Departure: ${formatDateTime(trip.departure_time)}</p>
                        </div>
                        <div class="trip-detail">
                            <p>Arrival: ${formatDateTime(trip.arrival_time)}</p>
                        </div>
                        <div class="trip-detail">
                            <p>Available Seats: ${trip.available_seats}</p>
                        </div>
                        <div class="trip-detail">
                            <p>Driver: ${trip.driver_name || 'Unknown'}</p>
                        </div>
                    </div>
                    <div class="trip-actions">
                        <button class="join-trip-btn" 
                                onclick="joinTrip(${trip.id})"
                                ${trip.available_seats === 0 ? 'disabled' : ''}>
                            ${trip.available_seats === 0 ? 'Full' : 'Join Trip'}
                        </button>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error loading trips:', error);
            tripsList.innerHTML = '<p class="error">Failed to load trips. Please try again later.</p>';
        });
}

function formatDateTime(dateTimeStr) {
    return new Date(dateTimeStr).toLocaleString();
}

function showCreateTripModal() {
    const modal = document.getElementById('create-trip-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function hideCreateTripModal() {
    const modal = document.getElementById('create-trip-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function handleCreateTrip(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    fetch('/api/trips', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            start_location: formData.get('start_location'),
            end_location: formData.get('end_location'),
            departure_time: formData.get('departure_time'),
            arrival_time: formData.get('arrival_time'),
            available_seats: parseInt(formData.get('available_seats'))
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to create trip');
        }
        return response.json();
    })
    .then(() => {
        hideCreateTripModal();
        loadTrips();
        form.reset();
    })
    .catch(error => {
        console.error('Error creating trip:', error);
        alert('Failed to create trip. Please try again.');
    });
}

function joinTrip(tripId) {
    fetch(`/api/trips/${tripId}/join`, {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to join trip');
        }
        return response.json();
    })
    .then(() => {
        loadTrips();
    })
    .catch(error => {
        console.error('Error joining trip:', error);
        alert('Failed to join trip. Please try again.');
    });
}

// Initialize trips page if we're on it
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('trips-list')) {
        loadTrips();
    }
});

// Setup create trip form
function setupCreateTripForm() {
    const form = document.getElementById('createTripForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const tripData = {
            start_location: formData.get('start_location'),
            end_location: formData.get('end_location'),
            departure_time: formData.get('departure_time'),
            available_seats: parseInt(formData.get('available_seats'))
        };
        
        try {
            const response = await fetch('/api/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tripData)
            });
            
            if (response.ok) {
                form.reset();
                loadTrips();
            } else {
                alert('Failed to create trip');
            }
        } catch (error) {
            console.error('Error creating trip:', error);
            alert('Error creating trip');
        }
    });
}

// Authentication and User Management
async function checkAuth() {
    try {
        const response = await fetch('/api/current_user', {
            credentials: 'include'
        });
        if (response.ok) {
            currentUser = await response.json();
            updateUI();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

function updateUI() {
    const userInfo = document.getElementById('userInfo');
    const navLinks = document.querySelector('.nav-links');
    const createTripButton = document.getElementById('createTripButton');
    
    if (currentUser) {
        if (userInfo) {
            userInfo.innerHTML = `
                <p>Welcome, ${currentUser.name}</p>
                <button id="logoutButton" class="primary-button">Logout</button>
            `;
            document.getElementById('logoutButton').addEventListener('click', logout);
        }
        
        if (createTripButton && currentUser.is_driver) {
            createTripButton.style.display = 'block';
        }
        
        if (navLinks) {
            navLinks.innerHTML = `
                <a href="/">Home</a>
                <a href="/trips">Trips</a>
                <a href="/profile">Profile</a>
            `;
        }
    } else {
        if (navLinks) {
            navLinks.innerHTML = `
                <a href="/">Home</a>
                <a href="/trips">Trips</a>
                <a href="/login">Login</a>
                <a href="/register">Register</a>
            `;
        }
        
        if (createTripButton) {
            createTripButton.style.display = 'none';
        }
        
        if (userInfo) {
            userInfo.innerHTML = '';
        }
    }
}

// Only run auth check on page load and when navigating
document.addEventListener('DOMContentLoaded', async () => {
    // Don't check auth on login/register pages
    if (!window.location.pathname.includes('/login') && 
        !window.location.pathname.includes('/register')) {
        await checkAuth();
    }
    
    // Only load trips on the trips page
    if (window.location.pathname === '/trips') {
        await loadTrips();
    }
});

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    checkCurrentUser();
    loadTrips();
    
    // Join Trip Modal close button
    const closeJoinModal = document.querySelector('.close-join-modal');
    if (closeJoinModal) {
        closeJoinModal.addEventListener('click', () => {
            closeModal('joinTripModal');
        });
    }
    
    // Join Trip Modal form submission
    const joinTripForm = document.getElementById('joinTripForm');
    if (joinTripForm) {
        joinTripForm.addEventListener('submit', joinTrip);
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const joinTripModal = document.getElementById('joinTripModal');
        if (e.target === joinTripModal) {
            closeModal('joinTripModal');
        }
    });
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted');
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }
            
            try {
                console.log('Attempting login with:', { email });
                
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });
                
                console.log('Login response status:', response.status);
                const data = await response.json();
                console.log('Login response data:', data);
                
                if (response.ok) {
                    currentUser = data;
                    updateUIForLoggedInUser();
                    window.location.href = '/trips';
                } else {
                    console.error('Login failed:', data.error);
                    alert('Login failed. Please check your credentials.');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login. Please try again.');
            }
        });
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const name = formData.get('name');
            const email = formData.get('email');
            const password = formData.get('password');
            const role = formData.get('role');
            
            if (!name || !email || !password || !role) {
                alert('Please fill in all required fields');
                return;
            }
            
            // Convert role to is_driver boolean
            const isDriver = role === 'driver';
            registerUser(name, email, password, '', isDriver);
        });
    }
    
    // Logout button
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                if (response.ok) {
                    currentUser = null;
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }

    // Create trip modal
    const createTripButton = document.getElementById('createTripButton');
    const createTripModal = document.getElementById('createTripModal');
    const closeButton = document.querySelector('.close-button');
    
    if (createTripButton) {
        createTripButton.addEventListener('click', () => {
            createTripModal.style.display = 'block';
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            createTripModal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === createTripModal) {
            createTripModal.style.display = 'none';
        }
    });
});

// Profile page functions
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-trips`).classList.add('active');
    document.querySelector(`.tab-button[onclick="showTab('${tabName}')"]`).classList.add('active');
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    
    if (window.location.pathname === '/trips') {
        await loadTrips();
    }
    
    // Load user trips if we're on the profile page
    if (window.location.pathname === '/profile') {
        // TODO: Load user's trips
    }
});

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Form submission handlers
async function createTrip(event) {
    event.preventDefault();
    const form = document.getElementById('createTripForm');
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/trips', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData))
        });

        if (response.ok) {
            closeModal('createTripModal');
            form.reset();
            loadTrips(); // Reload trips list
        } else {
            alert('Failed to create trip. Please try again.');
        }
    } catch (error) {
        console.error('Error creating trip:', error);
        alert('An error occurred while creating the trip.');
    }
}

function openJoinTripModal(tripId) {
    const modal = document.getElementById('joinTripModal');
    const tripIdInput = document.getElementById('trip_id');
    tripIdInput.value = tripId;
    modal.style.display = 'block';
} 