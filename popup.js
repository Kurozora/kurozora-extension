async function submitForm() {
    // Get username and password values
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Send a message to the background script to initiate the signIn function
    browser.runtime.sendMessage({ action: "signIn", username: username, password: password });
}

// Listen for the response from the background script
browser.runtime.onMessage.addListener(
    function(response, sender, sendResponse) {
        if (response.action === "signInResponse") {
            if (response.success) {
                document.getElementById("authToken").textContent = "Auth Token: " + response.authToken;
            } else {
                document.getElementById("authToken").textContent = "Error: " + response.error;
            }
        }
    }
);

document.getElementById("loginButton").addEventListener("click", submitForm);
