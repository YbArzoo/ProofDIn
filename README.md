# ProofDIn

Simple guide to set up and run this project locally.

---

## 1. Clone the repository


git clone https://github.com/YbArzoo/ProofDIn.git
cd ProofDIn

## 2. Choose the correct branch

Stable code: main
Working / team development: staging

For most development work:

git checkout staging
git pull

## 3. If you are starting a new task, create a feature branch from staging:
git checkout staging
git pull
git checkout -b feature/your-task-name

## 4. Backend setup (server)

cd server

## 4.1 Install dependencies:

npm install

## 4.2 Create a .env file inside the server folder with:

MONGO_URI=mongodb://127.0.0.1:27017/proofdin
JWT_SECRET=yourSecretKeyHere
PORT=5000

## 4.3 Make sure MongoDB is running on your machine (or change MONGO_URI to your own).
Start the backend:

node server.js

If it works, you should see something like:
MongoDB connected: 127.0.0.1
Server running on port 5000


## 4.4 The API will be available at:
http://localhost:5000


##5. Frontend setup (client)
The frontend is currently basic HTML/JS.
1. Open the client folder in VS Code:
2. File → Open Folder... → select client
3. Install the Live Server extension in VS Code (if not already installed).
4. Open client/pages/login.html in VS Code.
5. Right-click on login.html → Open with Live Server.
This will open a URL like:

http://127.0.0.1:5500/pages/login.html

Make sure the backend (node server.js) is still running.


Now you can:
Sign up as a candidate or recruiter
Log in
Be redirected to the appropriate dashboard page


## 6. Basic git commands
After you make changes:

git status          # see what changed

git add .

git commit -m "Your message here"

git push            # push to your current branch

If you created a new feature branch (or a new branch {pls make a new branch and work on features}:
git push -u origin feature/your-task-name


Then open a Pull Request into staging.




















