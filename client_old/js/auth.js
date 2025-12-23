// ---------- SIGNUP ----------
async function handleSignup(event) {
    event.preventDefault();
  
    const fullName = document.getElementById("signup-fullname").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const role = document.getElementById("signup-role").value;
  
    // recruiter-specific fields
    const orgName = document.getElementById("signup-orgname")?.value;
    const orgRole = document.getElementById("signup-orgrole")?.value;
  
    const body = {
      fullName,
      email,
      password,
      role,
    };
  
    if (role === "recruiter") {
      body.orgName = orgName;
      body.orgRole = orgRole;
    }
  
    try {
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        alert("Signup failed: " + data.message);
        return;
      }
  
      alert("Signup successful!");
      console.log("User:", data.user);
  
      localStorage.setItem("token", data.token);
      window.location.href = "homepage.html"; // redirect
    } catch (err) {
      alert("Error: " + err.message);
    }
  }
  
  
  
  // ---------- LOGIN ----------
  async function handleLogin(event) {
    event.preventDefault();
  
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
  
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        alert("Login failed: " + data.message);
        return;
      }
  
      alert("Login successful!");
      localStorage.setItem("token", data.token);
  
      // Dashboard routing by role
      if (data.user.role === "candidate") {
        window.location.href = "candidate.html";
      } else {
        window.location.href = "recruiter.html";
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  }
  