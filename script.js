// 1. Element References
const signInBtn = document.getElementById('signIn');
const wrapper = document.getElementById('wrapper');
const closeBtn = document.getElementById('close');
const signInSub = document.getElementById('signIn-sub');
const errorText = document.querySelector('#error-Msg');
const helloText = document.getElementById('helloText');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// 2. Open Modal Sequence: Shadow Black Overlay + 4-Second Shimmer Hello
signInBtn.addEventListener('click', () => {
    wrapper.style.display = ""; 
    
    // I-activate ang dark background overlay
    document.body.classList.add('overlay-active');

    // Ipakita ang shimmering "Hello"
    helloText.classList.add('show');

    // Maghintay ng 4000ms (4 seconds) bago ipakita ang Sign In Wrapper
    setTimeout(() => {
        helloText.classList.remove('show');
        wrapper.classList.remove('closing');
        wrapper.classList.add('active');
    }, 4000);
});

// 3. Close Modal Sequence: Slide down & Remove Overlay
closeBtn.addEventListener('click', () => {
    wrapper.classList.add('closing');

    // Hintayin matapos ang downward animation (400ms) bago alisin ang overlay at active class
    setTimeout(() => {
        wrapper.classList.remove('active');
        wrapper.classList.remove('closing');
        document.body.classList.remove('overlay-active');
    }, 400);
});

// 4. Redirect for Help Button
function askAI() {
    window.location.href = 'askAi.html';
}

// 5. Initial Disabled State para sa Confirm Button
if (signInSub) {
    signInSub.disabled = true;
    signInSub.style.opacity = "0.5";
    signInSub.style.cursor = "not-allowed";
}

// reCAPTCHA Callback Function - Solved
function onRecaptchaSuccess() {
    if (signInSub) {
        signInSub.disabled = false;
        signInSub.style.opacity = "1";
        signInSub.style.cursor = "pointer";
    }
}

// reCAPTCHA Callback Function - Expired
function onRecaptchaExpired() {
    if (signInSub) {
        signInSub.disabled = true;
        signInSub.style.opacity = "0.5";
        signInSub.style.cursor = "not-allowed";
    }
}

// 6. Clear Error Message on Typing
function clearError() {
    if (errorText) {
        errorText.textContent = "";
        errorText.style.display = "none";
    }
}

if (usernameInput) usernameInput.addEventListener('input', clearError);
if (passwordInput) passwordInput.addEventListener('input', clearError);

// 7. Form Submission and Backend Authentication
if (signInSub) {
    signInSub.addEventListener('click', async () => {
        const username = usernameInput ? usernameInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";
        const recaptchaResponse = typeof grecaptcha !== 'undefined' ? grecaptcha.getResponse() : "";

        if (!username || !password) {
            alert("Please fill in both fields.");
            return;
        }

        if (!recaptchaResponse) {
            if (errorText) {
                errorText.textContent = "Please complete the reCAPTCHA before continuing.";
                errorText.style.display = "block";
            }
            return;
        }

        signInSub.disabled = true;
        signInSub.textContent = "Processing...";

        try {
            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, recaptchaResponse })
            });

            const data = await res.json();

            if (data.success === false) {
                if (errorText) {
                    errorText.textContent = data.message || "Invalid username or passcode.";
                    errorText.style.display = "block";
                }
                if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
                onRecaptchaExpired();
            } else if (data.success === true) {
                sessionStorage.setItem('token', data.token);
                window.location.href = "verify.html";
            }
        } catch (err) {
            alert("Could not reach the server. Please try again later.");
            console.error(err);
            if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
            onRecaptchaExpired();
        } finally {
            signInSub.textContent = "Confirm";
        }
    });
}

        // Natural loading screen hide
        window.addEventListener('load', () => {
            document.getElementById('loading-screen').classList.add('hide-loader');
            setupPinInputs();
        });

        // Setup Auto-focus flow for 8-digit boxes
        function setupPinInputs() {
            const groups = ['#setup-pin-group', '#confirm-pin-group', '#login-pin-group'];
            groups.forEach(selector => {
                const boxes = document.querySelectorAll(`${selector} .pin-box`);
                boxes.forEach((box, index) => {
                    box.addEventListener('input', (e) => {
                        e.target.value = e.target.value.replace(/[^0-9]/g, '');
                        if (e.target.value && index < boxes.length - 1) {
                            boxes[index + 1].focus();
                        }
                    });

                    box.addEventListener('keydown', (e) => {
                        if (e.key === 'Backspace' && !e.target.value && index > 0) {
                            boxes[index - 1].focus();
                        }
                    });
                });
            });
        }

        function getBoxValues(containerId) {
            const boxes = document.querySelectorAll(`#${containerId} .pin-box`);
            let value = '';
            boxes.forEach(box => value += box.value);
            return value;
        }

        function clearBoxValues(containerId) {
            const boxes = document.querySelectorAll(`#${containerId} .pin-box`);
            boxes.forEach(box => box.value = '');
        }

        // Open Modal depending on local device state & passcode.json
        async function openPinModal() {
            closePinModals();
            let savedPin = localStorage.getItem('eleven_luna_pin');

            if (!savedPin) {
                try {
                    const res = await fetch('passcode.json');
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.passcode) {
                            savedPin = data.passcode;
                            localStorage.setItem('eleven_luna_pin', savedPin);
                        }
                    }
                } catch (err) {
                    console.log("No existing passcode.json or fetch failed.");
                }
            }

            if (savedPin) {
                document.getElementById('pin-login-modal').classList.add('show');
            } else {
                document.getElementById('pin-setup-modal').classList.add('show');
            }
        }

        function closePinModals() {
            document.getElementById('pin-setup-modal').classList.remove('show');
            document.getElementById('pin-login-modal').classList.remove('show');
            document.getElementById('setup-error').style.display = 'none';
            document.getElementById('login-error').style.display = 'none';
        }

        // Save Personalized PIN -> save to storage -> proceed to PIN Login Wrapper
        function savePersonalizedPin() {
            const pin1 = getBoxValues('setup-pin-group');
            const pin2 = getBoxValues('confirm-pin-group');
            const err = document.getElementById('setup-error');

            if (pin1.length !== 8 || pin2.length !== 8) {
                err.textContent = "Please complete all 8 digits for both fields.";
                err.style.display = 'block';
                return;
            }

            if (pin1 !== pin2) {
                err.textContent = "PINs do not match! Please check.";
                err.style.display = 'block';
                return;
            }

            err.style.display = 'none';
            localStorage.setItem('eleven_luna_pin', pin1);

            clearBoxValues('setup-pin-group');
            clearBoxValues('confirm-pin-group');
            closePinModals();

            setTimeout(() => {
                document.getElementById('pin-login-modal').classList.add('show');
            }, 300);
        }

        // Verify PIN -> Redirect to classroom.html
        async function verifyDevicePin() {
            const enteredPin = getBoxValues('login-pin-group');
            let savedPin = localStorage.getItem('eleven_luna_pin');
            const err = document.getElementById('login-error');

            if (!savedPin) {
                try {
                    const res = await fetch('passcode.json');
                    if (res.ok) {
                        const data = await res.json();
                        savedPin = data.passcode;
                    }
                } catch (e) {}
            }

            if (enteredPin === savedPin && enteredPin.length === 8) {
                err.style.display = 'none';
                window.location.href = 'classroom.html';
            } else {
                err.textContent = "Incorrect PIN. Please try again.";
                err.style.display = 'block';
            }
        }

// Toast Notification Trigger Function
function showToast(message) {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');

    if (toast) {
        toastMsg.textContent = message;
        toast.classList.add('show');

        // Automatic na mawawala pagkatapos ng 3.5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }
}

// Open Modal depending on local device state & passcode.json
async function openPinModal() {
    closePinModals();
    let savedPin = localStorage.getItem('eleven_luna_pin');

    if (!savedPin) {
        try {
            const res = await fetch('passcode.json');
            if (res.ok) {
                const data = await res.json();
                if (data && data.passcode) {
                    savedPin = data.passcode;
                    localStorage.setItem('eleven_luna_pin', savedPin);
                }
            }
        } catch (err) {
            console.log("No existing passcode.json or fetch failed.");
        }
    }

    // KAPAG MAY SAVED PIN (Existing / Registered User)
    if (savedPin) {
        document.getElementById('pin-login-modal').classList.add('show');
    } else {
        // KAPAG WALANG SAVED PIN (New Device / New User) -> Ipakita ang Toast sa halip na setup wrapper
        showToast("It seems you are not yet registered.");
    }
}
