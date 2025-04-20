// Simple authentication functions
async function registerUser() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    const isDriver = role === 'driver';

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                password,
                is_driver: isDriver
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Redirect to trips page on success
            window.location.href = '/trips';
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        alert('Error registering user: ' + error.message);
    }
}

async function loginUser() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Redirect to trips page on success
            window.location.href = '/trips';
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Error logging in: ' + error.message);
    }
}

// Add event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            registerUser();
        });
    }

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            loginUser();
        });
    }

    // Logout button
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST'
                });
                if (response.ok) {
                    window.location.href = '/';
                }
            } catch (error) {
                alert('Error logging out: ' + error.message);
            }
        });
    }
});
